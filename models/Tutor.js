const mongoose = require('mongoose');

const tutorSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        phoneNumber: {
            type: String,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        totalEarnings: {
            type: Number,
            default: 0,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const Tutor = mongoose.model('Tutor', tutorSchema);

module.exports = Tutor;
