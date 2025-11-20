const nodemailer = require('nodemailer');
const { generalLogger } = require('./utils/generalLogger');
require('dotenv').config();

const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });
};

async function sendInvoiceEmail(to, invoiceDetails) {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: '"Noosa Admin Board" <noosa@noosaengage.com>',
            to,
            subject: `Invoice #${invoiceDetails.invoiceNumber}`,
            html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Invoice - Noosa Engage</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f9fafb;
                        color: #333333;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #0A3755, #1e5f8b);
                        color: white;
                        padding: 30px 20px;
                        text-align: center;
                    }
                    .content {
                        padding: 30px;
                        line-height: 1.6;
                    }
                    .highlight {
                        background-color: #f0f9ff;
                        padding: 20px;
                        border-radius: 5px;
                        border-left: 4px solid #0A3755;
                        margin: 20px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }
                    table, th, td {
                        border: 1px solid #ddd;
                    }
                    th, td {
                        padding: 12px;
                        text-align: left;
                    }
                    th {
                        background-color: #f0f9ff;
                        color: #0A3755;
                    }
                    .contact-info {
                        background-color: #f9fafb;
                        padding: 20px;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .footer {
                        background-color: #0A3755;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        font-size: 14px;
                    }
                    .footer a {
                        color: #93c5fd;
                        text-decoration: none;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Invoice from Noosa Engage</h1>
                        <p>Thank you for your business! Below are the details of your invoice.</p>
                    </div>
                    <div class="content">
                        <p>Dear ${invoiceDetails.customerName},</p>

                        <p>We are pleased to provide you with the invoice for your recent services with Noosa Engage.</p>

                        <div class="highlight">
                            <strong>Invoice Details</strong>
                            <table>
                                <tr>
                                    <th>Invoice Number</th>
                                    <td>${invoiceDetails.invoiceNumber}</td>
                                </tr>
                                <tr>
                                    <th>Invoice Date</th>
                                    <td>${invoiceDetails.sessionDate}</td>
                                </tr>
                                <tr>
                                    <th>Due Date</th>
                                    <td>${invoiceDetails.dueDate}</td>
                                </tr>
                                <tr>
                                    <th>Total Amount</th>
                                    <td>${invoiceDetails.total}</td>
                                </tr>
                            </table>
                        </div>

                        <p>Please make payment by the due date to avoid any late fees. If you have any questions, feel free to contact us.</p>

                        <div class="contact-info">
                            <strong>Need assistance?</strong><br>
                            📞 Phone: <a href="tel:+15744064727">+1 (574) 406-4727</a><br>
                            📧 Email: <a href="mailto:noosa@noosaengage.com">noosa@noosaengage.com</a><br>
                            🌐 Website: <a href="https://www.noosaengage.com">www.noosaengage.com</a>
                        </div>

                        <p>Thank you for choosing Noosa Engage. We look forward to supporting your academic journey!</p>

                        <p>Best regards,<br>
                        <strong>The Noosa Engage Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply.</p>
                        <p>Visit us at <a href="https://www.noosaengage.com">www.noosaengage.com</a> | Follow us on social media</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        generalLogger.error(`Failed to send invoice email: ${error}`);
    }
}

async function sendAppointmentEmail(to, appointmentDetails) {
    const { status, customerName, courseName, appointmentDate, appointmentTime } =
        appointmentDetails;

    // Define dynamic values based on status
    let subject = '';
    let header = '';
    let introText = '';
    let highlightTitle = '';
    let extraNote = '';
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
        case 'scheduled':
            subject = `Appointment Confirmation for ${courseName}`;
            header = 'Appointment Confirmed';
            introText = `Dear ${customerName},<br><br>Your appointment has been successfully scheduled.`;
            highlightTitle = 'Appointment Details';
            extraNote = 'We look forward to your session.';
            break;

        case 'completed':
            subject = `Appointment Completed - ${courseName}`;
            header = 'Appointment Completed';
            introText = `Dear ${customerName},<br><br>Your appointment for <strong>${courseName}</strong> has been completed successfully.`;
            highlightTitle = 'Completed Appointment Details';
            extraNote = 'Thank you for choosing our service. We hope it was a valuable experience.';
            break;

        case 'canceled':
            subject = `Appointment Canceled - ${courseName}`;
            header = 'Appointment Canceled';
            introText = `Dear ${customerName},<br><br>Your appointment for <strong>${courseName}</strong> has been canceled.`;
            highlightTitle = 'Canceled Appointment Details';
            extraNote = '';
            break;

        default:
            generalLogger.info(`No email sent for unknown status: ${status}`);
            break;
    }

    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: '"Noosa Admin Board" <noosa@noosaengage.com>',
            to,
            subject,
            html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${subject}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f9fafb;
                    color: #333;
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #0A3755, #1e5f8b);
                    color: #fff;
                    padding: 30px 20px;
                    text-align: center;
                }
                .content {
                    padding: 30px;
                    line-height: 1.6;
                }
                .highlight {
                    background-color: #f0f9ff;
                    padding: 20px;
                    border-radius: 5px;
                    border-left: 4px solid #0A3755;
                    margin: 20px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                table, th, td {
                    border: 1px solid #ddd;
                }
                th, td {
                    padding: 12px;
                    text-align: left;
                }
                th {
                    background-color: #f0f9ff;
                    color: #0A3755;
                }
                .contact-info {
                    background-color: #f9fafb;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .footer {
                    background-color: #0A3755;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    font-size: 14px;
                }
                .footer a {
                    color: #93c5fd;
                    text-decoration: none;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${header}</h1>
                </div>
                <div class="content">
                    <p>${introText}</p>

                    <div class="highlight">
                        <strong>${highlightTitle}</strong>
                        <table>
                            <tr><th>Course Name</th><td>${courseName}</td></tr>
                            <tr><th>Date</th><td>${appointmentDate}</td></tr>
                            <tr><th>Time</th><td>${appointmentTime}</td></tr>
                            <tr><th>status</th><td>${status}</td></tr>
                        </table>
                    </div>

                    <p>${extraNote}</p>

                    <div class="contact-info">
                        <strong>Need assistance?</strong><br>
                        📞 Phone: <a href="tel:+15744064727">+1 (574) 406-4727</a><br>
                        📧 Email: <a href="mailto:noosa@noosaengage.com">noosa@noosaengage.com</a><br>
                        🌐 Website: <a href="https://www.noosaengage.com">www.noosaengage.com</a>
                    </div>

                    <p>Kind regards,<br><strong>The Noosa Engage Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply.</p>
                    <p>Visit us at <a href="https://www.noosaengage.com">www.noosaengage.com</a></p>
                </div>
            </div>
        </body>
        </html>
        `,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        generalLogger.error(`Failed to send invoice email: ${error}`);
    }
}

module.exports = { sendInvoiceEmail, sendAppointmentEmail };
