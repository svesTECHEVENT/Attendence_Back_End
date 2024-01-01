// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  mail: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  section: {
    type: String,
    required: true,
  },
});

const StudentModel = mongoose.model('StudentModel', userSchema);

module.exports = StudentModel;
