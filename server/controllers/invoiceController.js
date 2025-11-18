const Invoice = require('../../models/Invoice');
const User = require('../../models/User');
const Tutor = require('../../models/Tutor');
const { sendInvoiceEmail } = require('../mail');
const { generalLogger } = require('../utils/generalLogger');

class InvoiceNumberGenerator {
    static async generateUniqueInvoiceNumber() {
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loop

        while (attempts < maxAttempts) {
            // Generate 5-digit number (00000 to 99999)
            const number = Math.floor(Math.random() * 100000)
                .toString()
                .padStart(5, '0');

            // Check if this number already exists in database
            const existingInvoice = await Invoice.findOne({ invoiceNumber: number });

            if (!existingInvoice) {
                return number;
            }

            attempts++;
        }

        // If we can't generate a unique number after 100 attempts,
        // fall back to timestamp-based generation
        const timestamp = Date.now().toString();
        const fallbackNumber = timestamp.slice(-5);

        // Check if fallback number exists
        const existingFallback = await Invoice.findOne({ invoiceNumber: fallbackNumber });
        if (!existingFallback) {
            return fallbackNumber;
        }

        // Last resort: increment from the fallback
        let increment = 1;
        while (increment < 1000) {
            const incrementedNumber = (parseInt(fallbackNumber) + increment)
                .toString()
                .padStart(5, '0');
            const existing = await Invoice.findOne({ invoiceNumber: incrementedNumber });
            if (!existing) {
                return incrementedNumber;
            }
            increment++;
        }

        throw new Error('Unable to generate unique invoice number');
    }
}

const generateInvoiceNumber = async (req, res) => {
    try {
        const invoiceNumber = await InvoiceNumberGenerator.generateUniqueInvoiceNumber();
        return res.status(200).json({ invoiceNumber });
    } catch (error) {
        generalLogger.error(`Error generating invoice number: ${error}`);
        return res.status(500).json({ message: 'Unable to generate invoice number' });
    }
};

const createInvoice = async (req, res) => {
    try {
        const { invoiceNumber, customerId, tutorId, sessionDate, dueDate, price, hours, isPaid } =
            req.body;

        if (
            !invoiceNumber ||
            !customerId ||
            !tutorId ||
            !sessionDate ||
            !dueDate ||
            !price ||
            !hours ||
            isPaid === undefined
        ) {
            generalLogger.error(`Cannot create invoice. Not all required fields are provided`);
            return res.status(400).send({ message: 'Not all required fields are provided' });
        }

        const existingInvoice = await Invoice.findOne({ invoiceNumber });
        if (existingInvoice) {
            generalLogger.error(
                `Cannot create invoice. Invoice with number ${invoiceNumber} already exists`
            );
            return res.status(400).send({ message: 'Invoice number already exists' });
        }

        const customer = await User.findById(customerId);
        if (!customer) {
            generalLogger.error(`Cannot create invoice. Customer not found`);
            return res.status(400).send({ message: 'Customer not found' });
        }

        const tutor = await Tutor.findById(tutorId);
        if (!tutor) {
            generalLogger.error(`Cannot create invoice. Tutor not found`);
            return res.status(400).send({ message: 'Tutor not found' });
        }

        const MILESTONE_DATE = new Date('2024-12-05');
        const invoiceDate = new Date(sessionDate);
        const total = hours * price;
        const appliesSplitRule = invoiceDate >= MILESTONE_DATE;

        let tutorShare = 0;
        let businessShare = 0;

        if (appliesSplitRule && isPaid) {
            const tutorSharePercent = tutor.sharePercentage / 100;
            tutorShare = total * tutorSharePercent;
            businessShare = total * (1 - tutorSharePercent);
        } else if (!appliesSplitRule && isPaid) {
            tutorShare = 0;
            businessShare = total;
        }

        const newInvoice = new Invoice({
            invoiceNumber,
            customer: customer._id,
            tutor: tutor._id,
            sessionDate,
            dueDate,
            hours,
            price,
            total,
            isPaid,
            appliesSplitRule,
            tutorShare,
            businessShare,
        });
        await newInvoice.save();

        if (isPaid) {
            if (appliesSplitRule) {
                tutor.totalEarningsAfterSplit += tutorShare;
                tutor.totalBusinessShare += businessShare;
                tutor.sessionCountAfterSplit += 1;
                tutor.totalEarnings += tutorShare;
            } else {
                tutor.totalEarningsBeforeSplit += total;
                tutor.sessionCountBeforeSplit += 1;
            }
            await tutor.save();
        }

        try {
            await sendInvoiceEmail(customer.email, {
                customerName: customer.fullName,
                tutorName: tutor.fullName,
                invoiceNumber,
                sessionDate,
                dueDate,
                total: total,
            });
            generalLogger.info(`Invoice email sent successfully to ${customer.email}`);
        } catch (emailError) {
            generalLogger.error(`Failed to send invoice email: ${emailError}`);
        }

        generalLogger.info(`Invoice created successfully`);
        return res.status(201).send({ message: 'Invoice created successfully' });
    } catch (error) {
        generalLogger.error(`Error creating invoice: ${error}`);
        return res.status(500).send({ message: `Unable to create invoice. Error: ${error}` });
    }
};

const updateInvoice = async (req, res) => {
    const { invoiceNumber, sessionDate, dueDate, hours, price, isPaid, tutorId } = req.body;

    if (!invoiceNumber || !sessionDate || !dueDate || !hours || !price || isPaid == undefined) {
        generalLogger.error(`Cannot update invoice. Required fields are missing.`);
        return res.status(400).send({ message: 'Required fields are missing' });
    }

    try {
        const oldInvoice = await Invoice.findById(req.params.id).populate('tutor');
        if (!oldInvoice) {
            return res.status(404).send({ message: 'Invoice not found' });
        }

        // Store old values for tutor earnings adjustment
        const oldTutorShare = oldInvoice.tutorShare || 0;
        const oldBusinessShare = oldInvoice.businessShare || 0;
        const wasApplyingSplit = oldInvoice.appliesSplitRule;
        const oldTutorId = oldInvoice.tutor ? oldInvoice.tutor._id : null;

        const updateData = {
            invoiceNumber: invoiceNumber,
            sessionDate: sessionDate,
            dueDate: dueDate,
            hours: hours,
            price: price,
            total: hours * price,
            isPaid: isPaid,
        };

        if (tutorId) {
            updateData.tutor = tutorId;
        }

        // Get the tutor (new or old)
        const currentTutorId = tutorId || oldTutorId;
        const tutor = await Tutor.findById(currentTutorId);

        if (!tutor) {
            generalLogger.error(`Tutor not found`);
            return res.status(400).send({ message: 'Tutor not found' });
        }

        // Calculate split shares using tutor's share percentage
        const MILESTONE_DATE = new Date('2024-12-05');
        const invoiceDate = new Date(sessionDate);
        const appliesSplitRule = invoiceDate >= MILESTONE_DATE;

        updateData.appliesSplitRule = appliesSplitRule;

        if (appliesSplitRule && isPaid) {
            const tutorSharePercent = tutor.sharePercentage / 100;
            updateData.tutorShare = updateData.total * tutorSharePercent;
            updateData.businessShare = updateData.total * (1 - tutorSharePercent);
        } else if (!appliesSplitRule && isPaid) {
            updateData.tutorShare = 0;
            updateData.businessShare = updateData.total;
        } else {
            updateData.tutorShare = 0;
            updateData.businessShare = 0;
        }

        const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        }).populate('tutor');

        // Handle tutor earnings adjustment for old tutor
        if (oldTutorId) {
            const oldTutor = await Tutor.findById(oldTutorId);

            if (oldTutor) {
                // Subtract old earnings
                if (wasApplyingSplit && oldInvoice.isPaid) {
                    oldTutor.totalEarningsAfterSplit -= oldTutorShare;
                    oldTutor.totalBusinessShare -= oldBusinessShare;
                    oldTutor.sessionCountAfterSplit = Math.max(
                        0,
                        oldTutor.sessionCountAfterSplit - 1
                    );
                } else if (!wasApplyingSplit && oldInvoice.isPaid) {
                    oldTutor.totalEarningsBeforeSplit -= oldInvoice.total;
                    oldTutor.sessionCountBeforeSplit = Math.max(
                        0,
                        oldTutor.sessionCountBeforeSplit - 1
                    );
                }
                oldTutor.totalEarnings = oldTutor.totalEarningsAfterSplit;
                await oldTutor.save();
            }
        }

        // Add new earnings to current tutor (might be same or different)
        if (appliesSplitRule && isPaid) {
            tutor.totalEarningsAfterSplit += updateData.tutorShare;
            tutor.totalBusinessShare += updateData.businessShare;
            tutor.sessionCountAfterSplit += 1;
        } else if (!appliesSplitRule && isPaid) {
            tutor.totalEarningsBeforeSplit += updateData.total;
            tutor.sessionCountBeforeSplit += 1;
        }
        tutor.totalEarnings = tutor.totalEarningsAfterSplit;
        await tutor.save();

        generalLogger.info(`Invoice updated successfully`);
        return res.status(200).send({ message: 'Invoice updated successfully' });
    } catch (error) {
        generalLogger.error(`Error updating invoice: ${error}`);
        return res.status(500).send({ message: `Unable to update invoice. Error: ${error}` });
    }
};

const deleteInvoice = async (req, res) => {
    try {
        const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
        if (!deletedInvoice) return res.status(404).send({ message: 'Invoice not found' });

        generalLogger.info(`Invoice deleted successfully`);
        return res.status(200).send({ message: 'Invoice deleted successfully' });
    } catch (error) {
        generalLogger.error(`Error deleting invoice: ${error}`);
        return res.status(500).send({ message: `Unable to delete invoice. Error: ${error}` });
    }
};

const markInvoiceAsPaid = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('tutor');
        if (!invoice) {
            generalLogger.error(`Invoice not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Invoice not found' });
        }

        if (!invoice.isPaid && invoice.tutor) {
            const tutor = await Tutor.findById(invoice.tutor._id);
            if (tutor) {
                // Calculate shares based on tutor's percentage
                const tutorSharePercent = tutor.sharePercentage / 100;
                const tutorShare = invoice.total * tutorSharePercent;
                const businessShare = invoice.total * (1 - tutorSharePercent);

                if (invoice.appliesSplitRule) {
                    tutor.totalEarningsAfterSplit += tutorShare;
                    tutor.totalBusinessShare += businessShare;
                    tutor.sessionCountAfterSplit += 1;
                    tutor.totalEarnings += tutorShare;
                } else {
                    tutor.totalEarningsBeforeSplit += invoice.total;
                    tutor.sessionCountBeforeSplit += 1;
                }
                await tutor.save();
            }
        }

        invoice.isPaid = true;
        // Recalculate shares when marking as paid
        if (invoice.tutor) {
            const tutor = await Tutor.findById(invoice.tutor._id);
            if (tutor) {
                const tutorSharePercent = tutor.sharePercentage / 100;
                if (invoice.appliesSplitRule) {
                    invoice.tutorShare = invoice.total * tutorSharePercent;
                    invoice.businessShare = invoice.total * (1 - tutorSharePercent);
                } else {
                    invoice.tutorShare = 0;
                    invoice.businessShare = invoice.total;
                }
            }
        }
        await invoice.save();

        generalLogger.info(`Invoice ${invoice.invoiceNumber} marked as paid`);
        return res.status(200).json({ message: 'Invoice marked as paid' });
    } catch (error) {
        generalLogger.error(`Error marking invoice as paid: ${error}`);
        return res.status(500).json({ message: 'Failed to update invoice' });
    }
};

module.exports = {
    generateInvoiceNumber,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markInvoiceAsPaid,
};
