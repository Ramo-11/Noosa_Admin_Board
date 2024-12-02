const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');

const getAdminDashboard = async (req, res) => {
    try {
        const users = await User.find()
        const appointments = await Appointment.find().populate('customer', 'fullName email')
        const invoices = await Invoice.find().populate('customer', 'fullName email')

        res.render('index', { users, appointments, invoices })
    } catch (error) {
        res.status(500).send("Server Error")
    }
};

const updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        if (!updatedUser) {
            return res.status(404).send({ message: "User not found" })
        }

        res.status(200).json(updatedUser)
    } catch (error) {
        res.status(500).send("Server Error")
    }
}

const updateAppointment = async (req, res) => {
    try {
        const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        if (!updatedAppointment) {
            return res.status(404).send({ message: "Appointment not found" })
        }

        res.status(200).json(updatedAppointment)
    } catch (error) {
        res.status(500).send("Server Error")
    }
};

const updateInvoice = async (req, res) => {
    try {
        const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        if (!updatedInvoice) {
            return res.status(404).send({ message: "Invoice not found" })
        }

        res.status(200).json(updatedInvoice)
    } catch (error) {
        console.error("Error updating invoice:", error)
        res.status(500).send("Server Error")
    }
}

module.exports = { getAdminDashboard, updateUser, updateAppointment, updateInvoice }
