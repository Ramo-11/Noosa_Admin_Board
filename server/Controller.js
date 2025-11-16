const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const { sendInvoiceEmail, sendAppointmentEmail } = require('./mail');
const { generalLogger } = require('./utils/generalLogger');
const bcrypt = require('bcrypt');

// Invoice number generator utility
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

const getAdminDashboard = async (req, res) => {
    try {
        const users = await User.find();
        const Tutor = require('../models/Tutor');
        const tutors = await Tutor.find();
        const appointments = await Appointment.find()
            .populate('customer', 'fullName email')
            .populate('tutor', 'fullName email');
        const invoices = await Invoice.find()
            .populate('customer', 'fullName email')
            .populate('tutor', 'fullName email');

        res.render('index', { users, tutors, appointments, invoices });
    } catch (error) {
        generalLogger.error(`Error getting admin dashboard: ${error.message}`);
        res.status(500).send('Server Error');
    }
};

const generateInvoiceNumber = async (req, res) => {
    try {
        const invoiceNumber = await InvoiceNumberGenerator.generateUniqueInvoiceNumber();
        return res.status(200).json({ invoiceNumber });
    } catch (error) {
        generalLogger.error(`Error generating invoice number: ${error}`);
        return res.status(500).json({ message: 'Unable to generate invoice number' });
    }
};

const updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!updatedUser) {
            return res.status(404).send({ message: 'User not found' });
        }

        generalLogger.info(`User updated successfully: ${updatedUser}`);
        return res.status(200).send({ message: 'User updated successfully' });
    } catch (error) {
        generalLogger.error(`Error updating user: ${error}`);
        return res.status(500).send({ message: `Unable to update user. Error: ${error}` });
    }
};

const updateAppointment = async (req, res) => {
    const { courseName, appointmentDate, appointmentTime, status, tutorId } = req.body;

    if (!courseName || !appointmentDate || !appointmentTime || !status) {
        generalLogger.error(`Cannot update appointment. Required fields are missing.`);
        return res.status(400).send({ message: 'Required fields are missing' });
    }

    try {
        const updateData = {
            courseName: courseName,
            appointmentDate: appointmentDate,
            appointmentTime: appointmentTime,
            status: status,
        };

        if (tutorId) {
            updateData.tutor = tutorId;
        }

        const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        });

        if (!updatedAppointment) {
            generalLogger.error(`Appointment not found: ${req.params.id}`);
            return res.status(404).send({ message: 'Appointment not found.' });
        }

        generalLogger.info(
            `Appointment updated successfully: ${JSON.stringify(updatedAppointment)}`
        );
        return res
            .status(200)
            .send({ message: 'Appointment updated successfully', updatedAppointment });
    } catch (error) {
        generalLogger.error(`Error updating appointment: ${error}`);
        return res.status(500).send({ message: `Unable to update appointment. Error: ${error}` });
    }
};

const updateInvoice = async (req, res) => {
    const { invoiceNumber, sessionDate, dueDate, hours, price, isPaid, tutorId } = req.body;

    if (!invoiceNumber || !sessionDate || !dueDate || !hours || !price || isPaid == undefined) {
        generalLogger.error(`Cannot update invoice. Required fields are missing.`);
        return res.status(400).send({ message: 'Required fields are missing' });
    }

    try {
        const oldInvoice = await Invoice.findById(req.params.id);
        if (!oldInvoice) {
            return res.status(404).send({ message: 'Invoice not found' });
        }

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

        const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        }).populate('tutor');

        // Handle tutor earnings if payment status changed
        if (updatedInvoice.tutor) {
            const Tutor = require('../models/Tutor');
            const tutor = await Tutor.findById(updatedInvoice.tutor._id);

            if (oldInvoice.isPaid && !isPaid) {
                // Was paid, now unpaid - subtract
                tutor.totalEarnings -= oldInvoice.total;
                await tutor.save();
            } else if (!oldInvoice.isPaid && isPaid) {
                // Was unpaid, now paid - add
                tutor.totalEarnings += updatedInvoice.total;
                await tutor.save();
            } else if (oldInvoice.isPaid && isPaid && oldInvoice.total !== updatedInvoice.total) {
                // Still paid but amount changed
                tutor.totalEarnings = tutor.totalEarnings - oldInvoice.total + updatedInvoice.total;
                await tutor.save();
            }
        }

        generalLogger.info(`Invoice updated successfully`);
        return res.status(200).send({ message: 'Invoice updated successfully' });
    } catch (error) {
        generalLogger.error(`Error updating invoice: ${error}`);
        return res.status(500).send({ message: `Unable to update invoice. Error: ${error}` });
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
            const Tutor = require('../models/Tutor');
            const tutor = await Tutor.findById(invoice.tutor._id);
            if (tutor) {
                tutor.totalEarnings += invoice.total;
                await tutor.save();
            }
        }

        invoice.isPaid = true;
        await invoice.save();

        generalLogger.info(`Invoice ${invoice.invoiceNumber} marked as paid`);
        return res.status(200).json({ message: 'Invoice marked as paid' });
    } catch (error) {
        generalLogger.error(`Error marking invoice as paid: ${error}`);
        return res.status(500).json({ message: 'Failed to update invoice' });
    }
};

const createUser = async (req, res) => {
    try {
        const { fullName, email, phoneNumber } = req.body;
        if (!fullName || !email)
            return res.status(400).send({ message: 'Full name and email are required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).send({ message: 'Email already exists' });

        const defaultPassword = 'NoosaEngage1!';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const newUser = new User({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
        });

        await newUser.save();

        generalLogger.info(`User created successfully`);
        return res.status(201).send({ message: 'User created successfully' });
    } catch (error) {
        generalLogger.error(`Error creating user: ${error}`);
        return res.status(500).send({ message: `Unable to create user. Error: ${error}` });
    }
};

const createAppointment = async (req, res) => {
    try {
        const { customerEmail, tutorId, courseName, appointmentDate, appointmentTime, status } =
            req.body;
        if (!customerEmail || !tutorId || !courseName || !appointmentDate || !appointmentTime)
            return res.status(400).send({
                message:
                    'Customer email, tutor, course name, appointment date, and time are required',
            });

        const customer = await User.findOne({ email: customerEmail });
        if (!customer) {
            generalLogger.error(`Cannot create appointment. Customer not found`);
            return res.status(400).send({ message: 'Customer not found' });
        }

        const Tutor = require('../models/Tutor');
        const tutor = await Tutor.findById(tutorId);
        if (!tutor) {
            generalLogger.error(`Cannot create appointment. Tutor not found`);
            return res.status(400).send({ message: 'Tutor not found' });
        }

        const newAppointment = new Appointment({
            customer: customer._id,
            tutor: tutor._id,
            courseName,
            appointmentDate,
            appointmentTime,
            status,
        });

        try {
            await sendAppointmentEmail(customer.email, {
                status,
                customerName: customer.fullName,
                tutorName: tutor.fullName,
                courseName,
                appointmentDate,
                appointmentTime,
            });
            generalLogger.info(`Appointment email sent successfully to ${customer.email}`);
        } catch (emailError) {
            generalLogger.error(`Failed to send appointment email: ${emailError}`);
        }

        await newAppointment.save();

        generalLogger.info(`Appointment created successfully`);
        return res.status(201).send({ message: 'Appointment created successfully' });
    } catch (error) {
        generalLogger.error(`Error creating appointment: ${error}`);
        return res.status(500).send({ message: `Unable to create appointment. Error: ${error}` });
    }
};

const createInvoice = async (req, res) => {
    try {
        const {
            invoiceNumber,
            customerEmail,
            tutorId,
            sessionDate,
            dueDate,
            price,
            hours,
            isPaid,
        } = req.body;
        if (
            !invoiceNumber ||
            !customerEmail ||
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

        const customer = await User.findOne({ email: customerEmail });
        if (!customer) {
            generalLogger.error(`Cannot create invoice. Customer not found`);
            return res.status(400).send({ message: 'Customer not found' });
        }

        const Tutor = require('../models/Tutor');
        const tutor = await Tutor.findById(tutorId);
        if (!tutor) {
            generalLogger.error(`Cannot create invoice. Tutor not found`);
            return res.status(400).send({ message: 'Tutor not found' });
        }

        const newInvoice = new Invoice({
            invoiceNumber,
            customer: customer._id,
            tutor: tutor._id,
            sessionDate,
            dueDate,
            hours,
            price,
            total: hours * price,
            isPaid,
        });
        await newInvoice.save();

        // Update tutor earnings if invoice is paid
        if (isPaid) {
            tutor.totalEarnings += hours * price;
            await tutor.save();
        }

        // Send email
        try {
            await sendInvoiceEmail(customer.email, {
                customerName: customer.fullName,
                tutorName: tutor.fullName,
                invoiceNumber,
                sessionDate,
                dueDate,
                total: hours * price,
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

const deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).send({ message: 'User not found' });

        generalLogger.info(`User deleted successfully: ${deletedUser}`);
        return res.status(200).send({ message: 'User deleted successfully' });
    } catch (error) {
        generalLogger.error(`Error deleting user: ${error}`);
        return res.status(500).send({ message: `Unable to delete user. Error: ${error}` });
    }
};

const deleteAppointment = async (req, res) => {
    try {
        const deletedAppointment = await Appointment.findByIdAndDelete(req.params.id);
        if (!deletedAppointment) return res.status(404).send({ message: 'Appointment not found' });

        generalLogger.info(`Appointment deleted successfully: ${deletedAppointment}`);
        return res.status(200).send({ message: 'Appointment deleted successfully' });
    } catch (error) {
        generalLogger.error(`Error deleting appointment: ${error}`);
        return res.status(500).send({ message: `Unable to delete appointment. Error: ${error}` });
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

module.exports = {
    getAdminDashboard,
    generateInvoiceNumber,
    updateUser,
    updateAppointment,
    updateInvoice,
    markInvoiceAsPaid,
    createUser,
    createAppointment,
    createInvoice,
    deleteUser,
    deleteAppointment,
    deleteInvoice,
};
