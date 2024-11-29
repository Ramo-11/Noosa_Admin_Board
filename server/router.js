const express = require("express");
const route = express.Router();
require("dotenv").config();

// Import Controller Methods
const { 
    getAdminDashboard, 
    updateUser, 
    updateAppointment, 
    updateInvoice 
} = require("./Controller");

// *********** GET Requests ***********
route.get("/", getAdminDashboard);

// *********** PUT Requests ***********
// Update User
route.put("/index/users/:id", updateUser);

// Update Appointment
route.put("/index/appointments/:id", updateAppointment);

// Update Invoice
route.put("/index/invoices/:id", updateInvoice);

module.exports = route;
