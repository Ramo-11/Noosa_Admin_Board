const User = require('../../models/User');
const { generalLogger } = require('../utils/generalLogger');
const bcrypt = require('bcrypt');

const createUser = async (req, res) => {
    try {
        const { fullName, email, phoneNumber } = req.body;
        if (!fullName || !email)
            return res.status(400).send({ message: 'Full name and email are required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).send({ message: 'Email already exists' });

        const defaultPassword = 'NoosaEngage1!';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const newUser = new User({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
        });

        await newUser.save();

        generalLogger.info(`User created successfully`);
        return res.status(201).send({ message: 'User created successfully' });
    } catch (error) {
        generalLogger.error(`Error creating user: ${error}`);
        return res.status(500).send({ message: `Unable to create user. Error: ${error}` });
    }
};

const updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!updatedUser) {
            return res.status(404).send({ message: 'User not found' });
        }

        generalLogger.info(`User updated successfully: ${updatedUser}`);
        return res.status(200).send({ message: 'User updated successfully' });
    } catch (error) {
        generalLogger.error(`Error updating user: ${error}`);
        return res.status(500).send({ message: `Unable to update user. Error: ${error}` });
    }
};

const deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).send({ message: 'User not found' });

        generalLogger.info(`User deleted successfully: ${deletedUser}`);
        return res.status(200).send({ message: 'User deleted successfully' });
    } catch (error) {
        generalLogger.error(`Error deleting user: ${error}`);
        return res.status(500).send({ message: `Unable to delete user. Error: ${error}` });
    }
};

module.exports = {
    createUser,
    updateUser,
    deleteUser,
};
