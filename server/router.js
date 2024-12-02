const express = require("express")
const route = express.Router()
require("dotenv").config()

// Import Controller Methods
const { 
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
} = require("./Controller")

// *********** GET Requests ***********
route.get("/", getAdminDashboard)

// *********** PUT Requests ***********
route.put("/index/users/:id", updateUser)
route.put("/index/appointments/:id", updateAppointment)
route.put("/index/invoices/:id", updateInvoice)

// *********** POST Requests **********
route.post("/index/users", createUser)
route.post("/index/appointments", createAppointment)
route.post("/index/invoices", createInvoice)

// *********** DELETE Requests **********
route.delete("/index/users/:id", deleteUser)
route.delete("/index/appointments/:id", deleteAppointment)
route.delete("/index/invoices/:id", deleteInvoice)

module.exports = route
