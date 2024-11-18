const { generalLogger } = require('./utils/generalLogger');
const Invoice = require("../models/Invoice");
const User = require("../models/User"); // Ensure the path to the User model is correct

const GetInvoices = async (req, res) => {
    try {
        // Fetch all invoices
        const invoices = await Invoice.find().exec();

        // Fetch user details for each invoice
        const invoicesWithUserDetails = await Promise.all(
            invoices.map(async (invoice) => {
                const customer = await User.findById(invoice.customer).exec();
                return {
                    ...invoice.toObject(),
                    customerName: customer ? customer.fullName : "Unknown",
                    customerEmail: customer ? customer.email : "Unknown",
                };
            })
        );

        // Render the view with the enriched invoices data
        res.render("index", { invoices: invoicesWithUserDetails });
    } catch (error) {
        generalLogger.error("Error fetching invoices:", error);
        res.status(500).send("Error fetching invoices.");
    }
};

module.exports = { GetInvoices };
