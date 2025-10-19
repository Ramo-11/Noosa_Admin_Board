const express = require('express');
const route = express.Router();
require('dotenv').config();

// Import Controller Methods
const {
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
} = require('./Controller');

// *********** GET Requests ***********
route.get('/', getAdminDashboard);
route.get('/api/generate-invoice-number', generateInvoiceNumber);

// *********** PUT Requests ***********
route.put('/index/users/:id', updateUser);
route.put('/index/appointments/:id', updateAppointment);
route.put('/index/invoices/:id', updateInvoice);
route.put('/index/invoices/:id/mark-paid', markInvoiceAsPaid);

// *********** POST Requests **********
route.post('/index/users', createUser);
route.post('/index/appointments', createAppointment);
route.post('/index/invoices', createInvoice);

// *********** DELETE Requests **********
route.delete('/index/users/:id', deleteUser);
route.delete('/index/appointments/:id', deleteAppointment);
route.delete('/index/invoices/:id', deleteInvoice);

module.exports = route;
