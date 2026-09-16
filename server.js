require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const port = Number(process.env.PORT || 3000);
const businessEmail = process.env.BUSINESS_EMAIL;
const emailMode = process.env.EMAIL_MODE || 'smtp';

if (!businessEmail) {
  throw new Error('BUSINESS_EMAIL is required. Copy .env.example to .env and configure it.');
}

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(express.static(path.join(__dirname)));

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' }
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+()\-\s]{7,30}$/;
const allowedServices = new Set([
  'Discovery Call',
  'Website Audit',
  'Starter Landing Page',
  'Business Website',
  'E-Commerce Platform',
  'Custom Software Development',
  'Mobile App Development',
  'UI/UX Design Package',
  'Maintenance & Support Plan',
  'Not sure yet'
]);
const freeServices = new Set(['Discovery Call', 'Website Audit', 'Starter Landing Page']);

function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function requiredText(value, label, maxLength) {
  const result = cleanText(value, maxLength);
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function validateContact(body) {
  const name = requiredText(body.fullName, 'Full name', 120);
  const email = requiredText(body.email, 'Email address', 254).toLowerCase();
  const subject = requiredText(body.subject, 'Subject', 180);
  const message = requiredText(body.message, 'Message', 5000);

  if (!emailPattern.test(email)) throw new Error('Please provide a valid email address.');
  return { name, email, subject, message };
}

function validateOrder(body) {
  const name = requiredText(body.fullName, 'Full name', 120);
  const email = requiredText(body.email, 'Email address', 254).toLowerCase();
  const phone = requiredText(body.phone, 'Phone number', 30);
  const service = requiredText(body.service, 'Service', 100);
  const budget = requiredText(body.budget, 'Budget', 100);
  const details = requiredText(body.details, 'Project details', 5000);

  if (!emailPattern.test(email)) throw new Error('Please provide a valid email address.');
  if (!phonePattern.test(phone)) throw new Error('Please provide a valid phone number.');
  if (!allowedServices.has(service)) throw new Error('Please choose a valid service.');
  return { name, email, phone, service, budget, details };
}

function createTransport() {
  if (emailMode === 'console') {
    return nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
  }

  const smtpPort = Number(process.env.SMTP_PORT || 587);
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required when EMAIL_MODE=smtp.');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendNotification(subject, replyTo, text) {
  const transporter = createTransport();
  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || businessEmail,
    to: businessEmail,
    replyTo,
    subject,
    text
  });

  if (emailMode === 'console' && result.message) {
    console.log(result.message.toString());
  }
}

function submissionTime() {
  return new Date().toISOString();
}

app.post('/api/contact', submissionLimiter, async (req, res) => {
  try {
    if (cleanText(req.body && req.body.website, 200)) return res.status(400).json({ error: 'Unable to process this submission.' });
    const contact = validateContact(req.body);
    await sendNotification(
      `New Contact Us Submission — ${contact.subject}`,
      contact.email,
      [
        'New Contact Us submission from the Synex Developers website',
        '',
        `Customer/Visitor Name: ${contact.name}`,
        `Email Address: ${contact.email}`,
        `Subject: ${contact.subject}`,
        `Date and Time: ${submissionTime()}`,
        '',
        'Message:',
        contact.message
      ].join('\n')
    );
    res.json({ message: 'Thank you! Your request has been received. Our team will contact you shortly.' });
  } catch (error) {
    console.error('Contact submission failed:', error.message);
    const isValidationError = /required|valid|choose/.test(error.message);
    res.status(isValidationError ? 400 : 500).json({ error: isValidationError ? error.message : 'We could not send your message right now. Please try again later.' });
  }
});

app.post('/api/order', submissionLimiter, async (req, res) => {
  try {
    if (cleanText(req.body && req.body.website, 200)) return res.status(400).json({ error: 'Unable to process this submission.' });
    const order = validateOrder(req.body);
    await sendNotification(
      'New Service Order — Synex Developers',
      order.email,
      [
        'New Service Order — Synex Developers',
        '',
        `Customer Name: ${order.name}`,
        `Customer Email: ${order.email}`,
        `Phone Number: ${order.phone}`,
        `Selected Service: ${order.service}`,
        `Service Type: ${freeServices.has(order.service) ? 'Free' : 'Paid'}`,
        `Budget / Price: ${order.budget}`,
        `Date and Time: ${submissionTime()}`,
        '',
        'Project Details:',
        order.details
      ].join('\n')
    );
    res.json({ message: 'Thank you! Your request has been received. Our team will contact you shortly.' });
  } catch (error) {
    console.error('Service order failed:', error.message);
    const isValidationError = /required|valid|choose/.test(error.message);
    res.status(isValidationError ? 400 : 500).json({ error: isValidationError ? error.message : 'We could not submit your order right now. Please try again later.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Synex Developers server running at http://localhost:${port}`);
});
