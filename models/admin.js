const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mail: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const AttendenceAdmin = mongoose.model('AttendenceAdmin', userSchema);

module.exports = AttendenceAdmin;
