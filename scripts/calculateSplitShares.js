const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Tutor = require('../models/Tutor');

// Determine which MongoDB URI to use
const MONGODB_URI =
    process.env.NODE_ENV === 'production'
        ? process.env.MONGODB_URI_PROD
        : process.env.MONGODB_URI_DEV;

// The date when business reached $2500
const MILESTONE_DATE = new Date('2024-12-05');

async function calculateSplitShares() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully\n');

        console.log('📊 Milestone Date: December 5, 2024');
        console.log('📋 Rule: After this date, 50% to tutor, 50% to business\n');

        // Step 1: Process all invoices
        console.log('💰 Processing invoices...\n');

        const allInvoices = await Invoice.find().populate('tutor', 'fullName');
        let beforeCount = 0;
        let afterCount = 0;
        let skippedCount = 0;
        let totalBeforeSplit = 0;
        let totalAfterSplit = 0;

        for (const invoice of allInvoices) {
            // Skip invoices without tutors
            if (!invoice.tutor) {
                console.log(
                    `   ⚠️  [SKIPPED] ${invoice.invoiceNumber} - ${invoice.sessionDate} - No tutor assigned`
                );
                skippedCount++;

                // Still set the fields to avoid validation errors, but mark as not applying split
                invoice.appliesSplitRule = false;
                invoice.tutorShare = 0;
                invoice.businessShare = 0;
                await invoice.save({ validateBeforeSave: false });
                continue;
            }

            const invoiceDate = new Date(invoice.sessionDate);
            const appliesSplitRule = invoiceDate >= MILESTONE_DATE;

            // Get tutor details including share percentage
            const tutorDetails = await Tutor.findById(invoice.tutor._id);
            const tutorSharePercent = tutorDetails ? tutorDetails.sharePercentage / 100 : 0.5;

            // Update invoice fields
            invoice.appliesSplitRule = appliesSplitRule;

            if (appliesSplitRule && invoice.isPaid) {
                invoice.tutorShare = invoice.total * tutorSharePercent;
                invoice.businessShare = invoice.total * (1 - tutorSharePercent);
                afterCount++;
                totalAfterSplit += invoice.total;
                console.log(
                    `   ✅ [AFTER] ${invoice.invoiceNumber} - ${
                        invoice.sessionDate
                    } - $${invoice.total.toFixed(2)} - ${invoice.tutor.fullName} (${(
                        tutorSharePercent * 100
                    ).toFixed(0)}%) (Tutor: $${invoice.tutorShare.toFixed(
                        2
                    )}, Business: $${invoice.businessShare.toFixed(2)})`
                );
            } else if (!appliesSplitRule && invoice.isPaid) {
                invoice.tutorShare = 0;
                invoice.businessShare = invoice.total;
                beforeCount++;
                totalBeforeSplit += invoice.total;
                console.log(
                    `   📅 [BEFORE] ${invoice.invoiceNumber} - ${
                        invoice.sessionDate
                    } - $${invoice.total.toFixed(2)} - ${
                        invoice.tutor.fullName
                    } (Business: $${invoice.businessShare.toFixed(2)})`
                );
            } else {
                invoice.tutorShare = 0;
                invoice.businessShare = 0;
                console.log(
                    `   ⏳ [UNPAID] ${invoice.invoiceNumber} - ${
                        invoice.sessionDate
                    } - $${invoice.total.toFixed(2)} - ${invoice.tutor.fullName}`
                );
            }

            await invoice.save();
        }

        console.log('\n═══════════════════════════════════════');
        console.log('📊 INVOICE SUMMARY');
        console.log('═══════════════════════════════════════');
        console.log(
            `Before Split (100% Business): ${beforeCount} invoices - $${totalBeforeSplit.toFixed(
                2
            )}`
        );
        console.log(`After Split (50/50): ${afterCount} invoices - $${totalAfterSplit.toFixed(2)}`);
        if (skippedCount > 0) {
            console.log(`Skipped (No Tutor): ${skippedCount} invoices`);
        }
        console.log('═══════════════════════════════════════\n');

        // Step 2: Calculate tutor earnings
        console.log('👨‍🏫 Calculating tutor earnings...\n');

        const tutors = await Tutor.find();

        for (const tutor of tutors) {
            // Reset all earnings
            tutor.totalEarningsBeforeSplit = 0;
            tutor.totalEarningsAfterSplit = 0;
            tutor.totalBusinessShare = 0;
            tutor.sessionCountBeforeSplit = 0;
            tutor.sessionCountAfterSplit = 0;
            tutor.totalEarnings = 0;

            // Get all paid invoices for this tutor
            const tutorInvoices = await Invoice.find({
                tutor: tutor._id,
                isPaid: true,
            });

            let beforeSplitEarnings = 0;
            let afterSplitEarnings = 0;
            let businessShare = 0;
            let beforeCount = 0;
            let afterCount = 0;

            for (const invoice of tutorInvoices) {
                if (invoice.appliesSplitRule) {
                    // After milestone: tutor gets 50%
                    afterSplitEarnings += invoice.tutorShare;
                    businessShare += invoice.businessShare;
                    afterCount++;
                } else {
                    // Before milestone: business gets 100%, but we track it
                    beforeSplitEarnings += invoice.total;
                    beforeCount++;
                }
            }

            tutor.totalEarningsBeforeSplit = beforeSplitEarnings;
            tutor.totalEarningsAfterSplit = afterSplitEarnings;
            tutor.totalBusinessShare = businessShare;
            tutor.sessionCountBeforeSplit = beforeCount;
            tutor.sessionCountAfterSplit = afterCount;
            tutor.totalEarnings = afterSplitEarnings; // Only what they actually get

            await tutor.save();

            console.log(`   👨‍🏫 ${tutor.fullName}`);
            console.log(
                `      Before Split: ${beforeCount} sessions - Generated $${beforeSplitEarnings.toFixed(
                    2
                )} (100% to business)`
            );
            console.log(
                `      After Split: ${afterCount} sessions - Earned $${afterSplitEarnings.toFixed(
                    2
                )} | Business: $${businessShare.toFixed(2)}`
            );
            console.log(`      Total Tutor Earnings: $${tutor.totalEarnings.toFixed(2)}`);
            console.log('');
        }

        // Step 3: Calculate overall business statistics
        console.log('═══════════════════════════════════════');
        console.log('💼 BUSINESS SUMMARY');
        console.log('═══════════════════════════════════════');

        const allPaidInvoices = await Invoice.find({
            isPaid: true,
            tutor: { $exists: true, $ne: null },
        });

        let totalBusinessEarnings = 0;
        let totalTutorPayouts = 0;

        for (const invoice of allPaidInvoices) {
            totalBusinessEarnings += invoice.businessShare;
            totalTutorPayouts += invoice.tutorShare;
        }

        const yourShare = totalBusinessEarnings * 0.5; // You own 50%
        const brotherShare = totalBusinessEarnings * 0.5; // Brother owns 50%

        console.log(`Total Business Revenue: $${totalBusinessEarnings.toFixed(2)}`);
        console.log(`  - Your Share (50%): $${yourShare.toFixed(2)}`);
        console.log(`  - Brother's Share (50%): $${brotherShare.toFixed(2)}`);
        console.log(`Total Tutor Payouts: $${totalTutorPayouts.toFixed(2)}`);
        console.log(
            `Grand Total Revenue: $${(totalBusinessEarnings + totalTutorPayouts).toFixed(2)}`
        );
        console.log('═══════════════════════════════════════\n');

        // Step 4: Show invoices that need tutors assigned
        if (skippedCount > 0) {
            console.log('⚠️  WARNING: The following invoices do not have tutors assigned:\n');
            const invoicesWithoutTutors = await Invoice.find({
                $or: [{ tutor: { $exists: false } }, { tutor: null }],
            }).populate('customer', 'fullName email');

            console.log('   Invoice #  | Date       | Customer                           | Amount');
            console.log(
                '   -----------------------------------------------------------------------'
            );
            invoicesWithoutTutors.forEach((invoice) => {
                const customerInfo = invoice.customer
                    ? `${invoice.customer.email}`.padEnd(35)
                    : 'No customer'.padEnd(35);
                console.log(
                    `   ${invoice.invoiceNumber.padEnd(10)} | ${
                        invoice.sessionDate
                    } | ${customerInfo} | $${invoice.total.toFixed(2)}`
                );
            });
            console.log(
                '\n   ℹ️  You can assign tutors to these invoices by running: npm run migrate-tutors'
            );
            console.log('   ℹ️  Or manually assign tutors through the admin dashboard\n');
        }

        console.log('🎉 Calculation completed successfully!');
    } catch (error) {
        console.error('❌ Calculation failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the calculation
calculateSplitShares();
