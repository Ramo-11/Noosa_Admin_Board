const express = require("express")
require('dotenv').config()
const route = express.Router()
const { GetInvoices } = require("./InvoiceController");


// *********** GET requests **********
route.get("/", GetInvoices)


module.exports = route