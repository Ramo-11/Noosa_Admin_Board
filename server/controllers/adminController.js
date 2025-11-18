const User = require('../../models/User');
const Tutor = require('../../models/Tutor');
const Appointment = require('../../models/Appointment');
const Invoice = require('../../models/Invoice');
const { generalLogger } = require('../utils/generalLogger');

const getAdminDashboard = async (req, res) => {
    try {
        const users = await User.find();
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

module.exports = {
    getAdminDashboard,
};
