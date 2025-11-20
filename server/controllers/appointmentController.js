const Appointment = require('../../models/Appointment');
const User = require('../../models/User');
const Tutor = require('../../models/Tutor');
const { sendAppointmentEmail } = require('../mail');
const { generalLogger } = require('../utils/generalLogger');

const createAppointment = async (req, res) => {
    try {
        const { customerId, tutorId, courseName, appointmentDate, appointmentTime, status } =
            req.body;
        if (!customerId || !tutorId || !courseName || !appointmentDate || !appointmentTime)
            return res.status(400).send({
                message: 'Customer, tutor, course name, appointment date, and time are required',
            });

        const customer = await User.findById(customerId);
        if (!customer) {
            generalLogger.error(`Cannot create appointment. Customer not found`);
            return res.status(400).send({ message: 'Customer not found' });
        }

        const tutor = await Tutor.findById(tutorId);
        if (!tutor) {
            generalLogger.error(`Cannot create appointment. Tutor not found`);
            return res.status(400).send({ message: 'Tutor not found' });
        }

        const newAppointment = new Appointment({
            customer: customer._id,
            tutor: tutor._id,
            courseName,
            appointmentDate,
            appointmentTime,
            status,
        });

        await newAppointment.save();

        sendAppointmentEmail(customer.email, {
            status,
            customerName: customer.fullName,
            tutorName: tutor.fullName,
            courseName,
            appointmentDate,
            appointmentTime,
        })
            .then(() => {
                generalLogger.info(`Appointment email sent successfully to ${customer.email}`);
            })
            .catch((emailError) => {
                generalLogger.error(`Failed to send appointment email: ${emailError}`);
            });

        generalLogger.info(`Appointment created successfully`);
        return res.status(201).send({ message: 'Appointment created successfully' });
    } catch (error) {
        generalLogger.error(`Error creating appointment: ${error}`);
        return res.status(500).send({ message: `Unable to create appointment. Error: ${error}` });
    }
};

const updateAppointment = async (req, res) => {
    const { courseName, appointmentDate, appointmentTime, status, tutorId } = req.body;

    if (!courseName || !appointmentDate || !appointmentTime || !status) {
        generalLogger.error(`Cannot update appointment. Required fields are missing.`);
        return res.status(400).send({ message: 'Required fields are missing' });
    }

    try {
        const updateData = {
            courseName: courseName,
            appointmentDate: appointmentDate,
            appointmentTime: appointmentTime,
            status: status,
        };

        if (tutorId) {
            updateData.tutor = tutorId;
        }

        const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        });

        if (!updatedAppointment) {
            generalLogger.error(`Appointment not found: ${req.params.id}`);
            return res.status(404).send({ message: 'Appointment not found.' });
        }

        generalLogger.info(
            `Appointment updated successfully: ${JSON.stringify(updatedAppointment)}`
        );
        return res
            .status(200)
            .send({ message: 'Appointment updated successfully', updatedAppointment });
    } catch (error) {
        generalLogger.error(`Error updating appointment: ${error}`);
        return res.status(500).send({ message: `Unable to update appointment. Error: ${error}` });
    }
};

const deleteAppointment = async (req, res) => {
    try {
        const deletedAppointment = await Appointment.findByIdAndDelete(req.params.id);
        if (!deletedAppointment) return res.status(404).send({ message: 'Appointment not found' });

        generalLogger.info(`Appointment deleted successfully`);
        return res.status(200).send({ message: 'Appointment deleted successfully' });
    } catch (error) {
        generalLogger.error(`Error deleting appointment: ${error}`);
        return res.status(500).send({ message: `Unable to delete appointment. Error: ${error}` });
    }
};

module.exports = {
    createAppointment,
    updateAppointment,
    deleteAppointment,
};
