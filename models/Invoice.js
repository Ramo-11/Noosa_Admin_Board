const mongoose = require('mongoose');

// Define the Invoice schema
const invoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        tutor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tutor',
            required: true,
        },
        sessionDate: {
            type: String,
            required: true,
        },
        dueDate: {
            type: String,
            required: true,
        },
        hours: {
            type: Number,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        total: {
            type: Number,
            required: true,
            default: 0,
        },
        isPaid: {
            type: Boolean,
            required: true,
            default: false,
        },
        tutorShare: {
            type: Number,
            default: 0,
        },
        businessShare: {
            type: Number,
            default: 0,
        },
        appliesSplitRule: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

invoiceSchema.pre('save', function (next) {
    this.total = this.hours * this.price;
    next();
});

// Define the milestone date (when business reached $2500)
const MILESTONE_DATE = new Date('2024-12-05');

invoiceSchema.pre('save', async function (next) {
    this.total = this.hours * this.price;

    // Determine if this invoice applies the split rule
    const invoiceDate = new Date(this.sessionDate);
    this.appliesSplitRule = invoiceDate >= MILESTONE_DATE;

    if (this.appliesSplitRule && this.isPaid && this.tutor) {
        // After milestone: use tutor's custom share percentage
        const Tutor = this.constructor.db.model('Tutor');
        const tutor = await Tutor.findById(this.tutor);

        if (tutor) {
            const tutorSharePercent = tutor.sharePercentage / 100;
            this.tutorShare = this.total * tutorSharePercent;
            this.businessShare = this.total * (1 - tutorSharePercent);
        } else {
            // Fallback to 50/50 if tutor not found
            this.tutorShare = this.total * 0.5;
            this.businessShare = this.total * 0.5;
        }
    } else if (!this.appliesSplitRule && this.isPaid) {
        // Before milestone: 100% to business
        this.tutorShare = 0;
        this.businessShare = this.total;
    } else {
        // Not paid yet
        this.tutorShare = 0;
        this.businessShare = 0;
    }

    next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
