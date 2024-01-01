// models/attendance.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  mail: {
    type: String,
    required: true,
  },
  mapActive: {
    type: Boolean,
    default: false,
  },
  isMapTrue: {
    type: Boolean,
    default: false,
  },
  period1: {
    type: Boolean,
    default: false,
  },
  lat: {
    type: Number,
    default: null,
  },
  lng: {
    type: Number,
    default: null,
  },
});

const attendanceSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
  },
  attendance: [studentSchema],
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
