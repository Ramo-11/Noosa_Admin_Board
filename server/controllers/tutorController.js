const Tutor = require('../../models/Tutor');
const { generalLogger } = require('../utils/generalLogger');

const createTutor = async (req, res) => {
    try {
        const { fullName, email, phoneNumber } = req.body;

        if (!fullName || !email) {
            return res.status(400).json({ message: 'Full name and email are required' });
        }

        const existingTutor = await Tutor.findOne({ email });
        if (existingTutor) {
            return res.status(400).json({ message: 'Tutor with this email already exists' });
        }

        const tutor = new Tutor({
            fullName,
            email,
            phoneNumber,
        });

        await tutor.save();
        generalLogger.info(`Tutor created successfully: ${tutor.fullName}`);
        res.status(201).json({ message: 'Tutor created successfully' });
    } catch (error) {
        generalLogger.error(`Error creating tutor: ${error.message}`);
        res.status(500).json({ message: 'Error creating tutor', error: error.message });
    }
};

const getTutors = async (req, res) => {
    try {
        const { isActive } = req.query;
        const query = {};

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const tutors = await Tutor.find(query).sort({ fullName: 1 });
        res.json(tutors);
    } catch (error) {
        generalLogger.error(`Error fetching tutors: ${error.message}`);
        res.status(500).json({ message: 'Error fetching tutors', error: error.message });
    }
};

const updateTutor = async (req, res) => {
    try {
        const allowedUpdates = ['fullName', 'email', 'phoneNumber', 'isActive', 'sharePercentage'];
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ message: 'Invalid updates' });
        }

        if (req.body.email) {
            const existingTutor = await Tutor.findOne({
                email: req.body.email,
                _id: { $ne: req.params.id },
            });
            if (existingTutor) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        // Validate share percentage
        if (req.body.sharePercentage !== undefined) {
            const percentage = parseFloat(req.body.sharePercentage);
            if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                return res
                    .status(400)
                    .json({ message: 'Share percentage must be between 0 and 100' });
            }
        }

        const tutor = await Tutor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        generalLogger.info(`Tutor updated successfully: ${tutor.fullName}`);
        res.json({ message: 'Tutor updated successfully' });
    } catch (error) {
        generalLogger.error(`Error updating tutor: ${error.message}`);
        res.status(500).json({ message: 'Error updating tutor', error: error.message });
    }
};

const deleteTutor = async (req, res) => {
    try {
        const tutor = await Tutor.findByIdAndDelete(req.params.id);

        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        generalLogger.info(`Tutor deleted successfully: ${tutor.fullName}`);
        res.json({ message: 'Tutor deleted successfully' });
    } catch (error) {
        generalLogger.error(`Error deleting tutor: ${error.message}`);
        res.status(500).json({ message: 'Error deleting tutor', error: error.message });
    }
};

module.exports = {
    createTutor,
    getTutors,
    updateTutor,
    deleteTutor,
};
