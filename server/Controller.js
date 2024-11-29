const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');

// Controller function
const getAdminDashboard = async (req, res) => {
    try {
        const users = await User.find();
        const appointments = await Appointment.find().populate('customer', 'fullName email');
        const invoices = await Invoice.find().populate('customer', 'fullName email');

        res.render('index', { users, appointments, invoices });
    } catch (error) {
        console.error("Error fetching data for admin dashboard:", error);
        res.status(500).send("Server Error");
    }
};

const updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!updatedUser) {
            return res.status(404).send("User not found");
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("Server Error");
    }
};

const updateAppointment = async (req, res) => {
    try {
        const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!updatedAppointment) {
            return res.status(404).send("Appointment not found");
        }

        res.status(200).json(updatedAppointment);
    } catch (error) {
        console.error("Error updating appointment:", error);
        res.status(500).send("Server Error");
    }
};

const updateInvoice = async (req, res) => {
    console.log("Request Body:", req.body);

    try {
        const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!updatedInvoice) {
            return res.status(404).send("Invoice not found");
        }

        res.status(200).json(updatedInvoice);
    } catch (error) {
        console.error("Error updating invoice:", error);
        res.status(500).send("Server Error");
    }
};

module.exports = { getAdminDashboard, updateUser, updateAppointment, updateInvoice };
