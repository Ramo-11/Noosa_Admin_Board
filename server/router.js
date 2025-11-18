const express = require('express');
const route = express.Router();
require('dotenv').config();

const { getAdminDashboard } = require('./controllers/adminController');

const {
    updateAppointment,
    createAppointment,
    deleteAppointment,
} = require('./controllers/appointmentController');

const { getUsers, createUser, updateUser, deleteUser } = require('./controllers/userController');

const {
    generateInvoiceNumber,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markInvoiceAsPaid,
} = require('./controllers/invoiceController');

const {
    createTutor,
    getTutors,
    updateTutor,
    deleteTutor,
} = require('./controllers/tutorController');

// *********** GET Requests ***********
route.get('/', getAdminDashboard);
route.get('/api/generate-invoice-number', generateInvoiceNumber);

// *********** PUT Requests ***********
route.put('/index/users/:id', updateUser);
route.put('/index/appointments/:id', updateAppointment);
route.put('/index/invoices/:id', updateInvoice);
route.put('/index/invoices/:id/mark-paid', markInvoiceAsPaid);

// *********** POST Requests **********
route.get('/index/users', getUsers);
route.post('/index/users', createUser);
route.post('/index/appointments', createAppointment);
route.post('/index/invoices', createInvoice);

// *********** DELETE Requests **********
route.delete('/index/users/:id', deleteUser);
route.delete('/index/appointments/:id', deleteAppointment);
route.delete('/index/invoices/:id', deleteInvoice);

// *********** Tutor Routes ***********
route.get('/index/tutors', getTutors);
route.post('/index/tutors', createTutor);
route.put('/index/tutors/:id', updateTutor);
route.delete('/index/tutors/:id', deleteTutor);

module.exports = route;
