const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Tutor = require('../models/Tutor');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');

// Determine which MongoDB URI to use
const MONGODB_URI =
    process.env.NODE_ENV === 'production'
        ? process.env.MONGODB_URI_PROD
        : process.env.MONGODB_URI_DEV;

// Tutor data
const tutorsData = [
    {
        fullName: 'Mostafa Abdulaleem',
        email: 'mostafahesham346@yahoo.com',
        phoneNumber: '',
        sharePercentage: 50, // 50% to tutor, 50% to business
        isActive: true,
        totalEarnings: 0,
    },
    {
        fullName: 'Omar Abdelalim',
        email: 'omarh5877@gmail.com',
        phoneNumber: '',
        sharePercentage: 50, // 50% to tutor, 50% to business
        isActive: true,
        totalEarnings: 0,
    },
    {
        fullName: 'Hanan Mahmoud',
        email: 'hanan@noosaengage.com',
        phoneNumber: '',
        sharePercentage: 100, // 100% to tutor, 0% to business
        isActive: true,
        totalEarnings: 0,
    },
];

// Customer to Tutor mapping
const customerTutorMapping = {
    'ibnsina1987@gmail.com': 'omarh5877@gmail.com',
    'he1elantab@gmail.com': 'hanan@noosaengage.com',
    'jason.collins1397@gmail.com': 'mostafahesham346@yahoo.com',
    'pola_pola48@yahoo.com': 'mostafahesham346@yahoo.com',
    'marlanth@iu.edu': 'omarh5877@gmail.com',
};

async function migrateTutors() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully\n');

        // Step 1: Create tutors
        console.log('👨‍🏫 Creating tutors...');
        const createdTutors = {};

        for (const tutorData of tutorsData) {
            // Check if tutor already exists
            let tutor = await Tutor.findOne({ email: tutorData.email });

            if (tutor) {
                console.log(
                    `   ⚠️  Tutor already exists: ${tutorData.fullName} (${tutorData.email})`
                );
                // Update share percentage if it has changed
                if (tutor.sharePercentage !== tutorData.sharePercentage) {
                    tutor.sharePercentage = tutorData.sharePercentage;
                    await tutor.save();
                    console.log(
                        `      ✅ Updated share percentage to ${tutorData.sharePercentage}%`
                    );
                }
            } else {
                tutor = new Tutor(tutorData);
                await tutor.save();
                console.log(
                    `   ✅ Created tutor: ${tutorData.fullName} (${tutorData.email}) - ${tutorData.sharePercentage}% share`
                );
            }

            createdTutors[tutorData.email] = tutor;
        }
        console.log('');

        // Step 2: Get all customers in the mapping
        console.log('👥 Finding customers...');
        const customerEmails = Object.keys(customerTutorMapping);
        const customers = await User.find({
            email: { $in: customerEmails.map((email) => new RegExp(`^${email}$`, 'i')) },
        });

        const customerMap = {};
        customers.forEach((customer) => {
            const normalizedEmail = customer.email.toLowerCase();
            customerMap[normalizedEmail] = customer;
            console.log(`   ✅ Found customer: ${customer.fullName} (${customer.email})`);
        });
        console.log('');

        // Step 3: Update appointments
        console.log('📅 Updating appointments...');
        let appointmentsUpdated = 0;
        let appointmentsSkipped = 0;

        for (const [customerEmail, tutorEmail] of Object.entries(customerTutorMapping)) {
            const customer = customerMap[customerEmail.toLowerCase()];
            const tutor = createdTutors[tutorEmail];

            if (!customer) {
                console.log(`   ⚠️  Customer not found: ${customerEmail}`);
                continue;
            }

            if (!tutor) {
                console.log(`   ⚠️  Tutor not found: ${tutorEmail}`);
                continue;
            }

            // Find appointments for this customer that don't have a tutor
            const appointments = await Appointment.find({
                customer: customer._id,
                $or: [{ tutor: { $exists: false } }, { tutor: null }],
            });

            if (appointments.length === 0) {
                console.log(`   ℹ️  No appointments to update for ${customer.email}`);
                appointmentsSkipped++;
                continue;
            }

            // Update all appointments for this customer
            const result = await Appointment.updateMany(
                {
                    customer: customer._id,
                    $or: [{ tutor: { $exists: false } }, { tutor: null }],
                },
                { $set: { tutor: tutor._id } }
            );

            console.log(
                `   ✅ Updated ${result.modifiedCount} appointment(s) for ${customer.email} -> ${tutor.fullName}`
            );
            appointmentsUpdated += result.modifiedCount;
        }

        console.log(`\n   📊 Total appointments updated: ${appointmentsUpdated}`);
        if (appointmentsSkipped > 0) {
            console.log(`   📊 Customers with no appointments: ${appointmentsSkipped}`);
        }
        console.log('');

        // Step 4: Update invoices and calculate tutor earnings
        console.log('💰 Updating invoices and calculating earnings...');
        let invoicesUpdated = 0;
        let invoicesSkipped = 0;
        const tutorEarnings = {};

        // Initialize earnings tracker
        Object.values(createdTutors).forEach((tutor) => {
            tutorEarnings[tutor._id.toString()] = 0;
        });

        for (const [customerEmail, tutorEmail] of Object.entries(customerTutorMapping)) {
            const customer = customerMap[customerEmail.toLowerCase()];
            const tutor = createdTutors[tutorEmail];

            if (!customer) {
                console.log(`   ⚠️  Customer not found: ${customerEmail}`);
                continue;
            }

            if (!tutor) {
                console.log(`   ⚠️  Tutor not found: ${tutorEmail}`);
                continue;
            }

            // Find invoices for this customer that don't have a tutor
            const invoices = await Invoice.find({
                customer: customer._id,
                $or: [{ tutor: { $exists: false } }, { tutor: null }],
            });

            if (invoices.length === 0) {
                console.log(`   ℹ️  No invoices to update for ${customer.email}`);
                invoicesSkipped++;
                continue;
            }

            // Calculate earnings from paid invoices
            let customerPaidTotal = 0;
            invoices.forEach((invoice) => {
                if (invoice.isPaid) {
                    customerPaidTotal += invoice.total;
                }
            });

            // Update all invoices for this customer
            const result = await Invoice.updateMany(
                {
                    customer: customer._id,
                    $or: [{ tutor: { $exists: false } }, { tutor: null }],
                },
                { $set: { tutor: tutor._id } }
            );

            tutorEarnings[tutor._id.toString()] += customerPaidTotal;

            console.log(
                `   ✅ Updated ${result.modifiedCount} invoice(s) for ${customer.email} -> ${
                    tutor.fullName
                } (Paid: $${customerPaidTotal.toFixed(2)})`
            );
            invoicesUpdated += result.modifiedCount;
        }

        console.log(`\n   📊 Total invoices updated: ${invoicesUpdated}`);
        if (invoicesSkipped > 0) {
            console.log(`   📊 Customers with no invoices: ${invoicesSkipped}`);
        }
        console.log('');

        // Step 5: Update tutor earnings
        console.log('💵 Updating tutor earnings...');
        for (const [tutorId, earnings] of Object.entries(tutorEarnings)) {
            const tutor = await Tutor.findById(tutorId);
            if (tutor) {
                tutor.totalEarnings = earnings;
                await tutor.save();
                console.log(`   ✅ ${tutor.fullName}: $${earnings.toFixed(2)}`);
            }
        }
        console.log('');

        // Summary
        console.log('═══════════════════════════════════════');
        console.log('📋 MIGRATION SUMMARY');
        console.log('═══════════════════════════════════════');
        console.log(`✅ Tutors created/verified: ${tutorsData.length}`);
        console.log(`✅ Appointments updated: ${appointmentsUpdated}`);
        console.log(`✅ Invoices updated: ${invoicesUpdated}`);
        console.log('═══════════════════════════════════════\n');

        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the migration
migrateTutors();
