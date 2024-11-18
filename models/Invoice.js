const mongoose = require("mongoose");

// Define the Invoice schema
const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionDate: {
        type: Date,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    hours: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true,
        default: 0
    },
    isPaid: {
        type: Boolean,
        required: true,
        default: false 
    }
}, { timestamps: true });

invoiceSchema.pre('save', function(next) {
    this.total = this.hours * this.price;
    next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;