// models/otp.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  otp: {
    type: Number,
    required: true,
  },
}, {
  // Set the expiration time for the OTP document to 1 minute (60 seconds)
  timestamps: { expires: 60 },
});

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
