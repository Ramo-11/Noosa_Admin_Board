const User = require('../models/User')
const Appointment = require('../models/Appointment')
const Invoice = require('../models/Invoice')
const { generalLogger } = require("./utils/generalLogger")
const bcrypt = require('bcrypt')

const getAdminDashboard = async (req, res) => {
    try {
        const users = await User.find()
        const appointments = await Appointment.find().populate('customer', 'fullName email')
        const invoices = await Invoice.find().populate('customer', 'fullName email')

        res.render('index', { users, appointments, invoices })
    } catch (error) {
        generalLogger.error(`Error getting admin dashboard: ${error.message}`)
        res.status(500).send("Server Error")
    }
}

const updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        if (!updatedUser) {
            return res.status(404).send({ message: "User not found" })
        }

        generalLogger.info(`User updated successfully: ${updatedUser}`)
        return res.status(200).send({ message: "User updated successfully" })
    } catch (error) {
        generalLogger.error(`Error updating user: ${error}`)
        return res.status(500).send({ message: `Unable to update user. Error: ${error}` })
    }
}

const updateAppointment = async (req, res) => {
    const { courseName, appointmentDate, appointmentTime, status } = req.body

    if (!courseName || !appointmentDate || !appointmentTime || !status) {
        generalLogger.error(`Cannot update appointment. Required fields are missing.`)
        return res.status(400).send({ message: "Required fields are missing" })
    }

    try {
        const updatedAppointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            {
                courseName: courseName,
                appointmentDate: appointmentDate,
                appointmentTime: appointmentTime,
                status: status
            },
            { new: true }
        )

        if (!updatedAppointment) {
            generalLogger.error(`Appointment not found: ${req.params.id}`)
            return res.status(404).send({ message: "Appointment not found." })
        }

        generalLogger.info(`Appointment updated successfully: ${JSON.stringify(updatedAppointment)}`)
        return res.status(200).send({ message: "Appointment updated successfully", updatedAppointment })
    } catch (error) {
        generalLogger.error(`Error updating appointment: ${error}`)
        return res.status(500).send({ message: `Unable to update appointment. Error: ${error}` })
    }
}

const updateInvoice = async (req, res) => {
    try {
        const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        if (!updatedInvoice) {
            return res.status(404).send({ message: "Invoice not found" })
        }

        generalLogger.info(`Invoice updated successfully: ${updatedInvoice}`)
        return res.status(200).send({ message: "Invoice updated successfully" })
    } catch (error) {
        generalLogger.error(`Error updating invoice: ${error}`)
        return res.status(500).send({ message: `Unable to update invoice. Error: ${error}` })
    }
}

const createUser = async (req, res) => {
    try {
        const { fullName, email, phoneNumber } = req.body
        if (!fullName || !email) return res.status(400).send({ message: "Full name and email are required" })

        const existingUser = await User.findOne({ email })
        if (existingUser) return res.status(400).send({ message: "Email already exists" })

        const defaultPassword = "NoosaEngage1!"
        const hashedPassword = await bcrypt.hash(defaultPassword, 10)

        const newUser = new User({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword
        })

        await newUser.save()

        generalLogger.info(`User created successfully`)
        return res.status(201).send({ message: "User created successfully" })
    } catch (error) {
        generalLogger.error(`Error creating user: ${error}`)
        return res.status(500).send({ message: `Unable to create user. Error: ${error}` })
    }
}


const createAppointment = async (req, res) => {
    try {
        const { customerEmail, courseName, appointmentDate, appointmentTime, status } = req.body
        if (!customerEmail || !courseName || !appointmentDate || !appointmentTime) 
            return res.status(400).send({ message: "Customer email, course name, appointment date, and time are required" })

        const customer = await User.findOne({ email: customerEmail })
        if (!customer) {
            generalLogger.error(`Cannot create appointment. Customer not found`)
            return res.status(400).send({ message: "Customer not found" })
        }

        const newAppointment = new Appointment({
            customer: customer._id,
            courseName,
            appointmentDate,
            appointmentTime,
            status
        })

        await newAppointment.save()

        generalLogger.info(`Appointment created successfully`)
        return res.status(201).send({ message: "Appointment created successfully" })
    } catch (error) {
        generalLogger.error(`Error creating appointment: ${error}`)
        return res.status(500).send({ message: `Unable to create appointment. Error: ${error}` })
    }
}

const createInvoice = async (req, res) => {
    try {
        const { invoiceNumber, customerEmail, sessionDate, dueDate, price, hours, isPaid } = req.body
        if (!invoiceNumber || !customerEmail || !sessionDate || !dueDate || !price || !hours || !isPaid) {
        generalLogger.error(`Cannot create invoice. Not all required fields are provided`)
            return res.status(400).send({ message: "Not all required fields are provided" })
        }

        const existingInvoice = await Invoice.findOne({ invoiceNumber })
        if (existingInvoice) {
            generalLogger.error(`Cannot create invoice. Invoice with number ${invoiceNumber} already exists`)
            return res.status(400).send({ message: "Invoice number already exists" })
        } 

        const customer = await User.findOne({ email: customerEmail })
        if (!customer) {
            generalLogger.error(`Cannot create invoice. Customer not found`)
            return res.status(400).send({ message: "Customer not found" })
        }

        const newInvoice = new Invoice({
            invoiceNumber,
            customer: customer._id,
            sessionDate,
            dueDate,
            hours,
            price,
            total: hours * price,
            isPaid
        })
        await newInvoice.save()

        generalLogger.info(`Invoice created successfully`)
        return res.status(201).send({ message: "Invoice created successfully" })
    } catch (error) {
        generalLogger.error(`Error creating invoice: ${error}`)
        return res.status(500).send({ message: `Unable to create invoice. Error: ${error}` })
    }
}

const deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id)
        if (!deletedUser) return res.status(404).send({ message: "User not found" })

        generalLogger.info(`User deleted successfully: ${deletedUser}`)
        return res.status(200).send({ message: "User deleted successfully" })
    } catch (error) {
        generalLogger.error(`Error deleting user: ${error}`)
        return res.status(500).send({ message: `Unable to delete user. Error: ${error}` })
    }
}

const deleteAppointment = async (req, res) => {
    try {
        const deletedAppointment = await Appointment.findByIdAndDelete(req.params.id)
        if (!deletedAppointment) return res.status(404).send({ message: "Appointment not found" })

        generalLogger.info(`Appointment deleted successfully: ${deletedAppointment}`)
        return res.status(200).send({ message: "Appointment deleted successfully" })
    } catch (error) {
        generalLogger.error(`Error deleting appointment: ${error}`)
        return res.status(500).send({ message: `Unable to delete appointment. Error: ${error}` })
    }
}

const deleteInvoice = async (req, res) => {
    try {
        const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id)
        if (!deletedInvoice) return res.status(404).send({ message: "Invoice not found" })

        generalLogger.info(`Invoice deleted successfully: ${deletedInvoice}`)
        return res.status(200).send({ message: "Invoice deleted successfully" })
    } catch (error) {
        generalLogger.error(`Error deleting invoice: ${error}`)
        return res.status(500).send({ message: `Unable to delete invoice. Error: ${error}` })
    }
}

module.exports = { 
    getAdminDashboard, 
    updateUser, 
    updateAppointment, 
    updateInvoice, 
    createUser, 
    createAppointment, 
    createInvoice, 
    deleteUser, 
    deleteAppointment, 
    deleteInvoice 
}

