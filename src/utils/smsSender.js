// src/utils/smsSender.js

const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

/**
 * Send an OTP verification SMS.
 *
 * @param {string} to       - E.164 phone number (e.g. +923001234567)
 * @param {string} otpCode  - The 6-digit OTP to include
 */
const sendOtpSms = async (to, otpCode) => {
  try {
    await client.messages.create({
      body: `Your Fanfare verification code is: ${otpCode}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
  } catch (err) {
    console.error('[Twilio] Failed to send OTP SMS:', err.message);
    throw new Error('Failed to send verification SMS. Please check the phone number and try again.');
  }
};

module.exports = { sendOtpSms };