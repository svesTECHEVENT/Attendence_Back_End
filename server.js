const nodemailer = require("nodemailer");
const AttendenceAdmin = require('./models/admin');
const StudentModel = require('./models/student');
const OTP = require('./models/otp');
const Attendance = require('./models/Attendence');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling']
  }
});

const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://travalapp:travalapp@cluster0.oz5xxmc.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true });

// Use bodyParser middleware to parse JSON

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('LoginAdmin', async (message) => {
    try {
      const user = await AttendenceAdmin.findOne({ mail: message.enteredMail, password: message.enteredPassword });
      if (user) {
        io.emit("LoginStatus", JSON.stringify({ status: true, userData: user }));
      } else {
        io.emit("LoginStatus", JSON.stringify({ status: false }));
      }
    } catch (error) {
      console.error(error);
    }
  });

  socket.on('LoginStudent', async (message) => {
    try {
      const user = await StudentModel.findOne({ mail: message.enteredMail, password: message.enteredPassword });
      if (user) {
        io.emit("LoginStatus", JSON.stringify({ status: true, userData: user }));
      } else {
        io.emit("LoginStatus", JSON.stringify({ status: false }));
      }
    } catch (error) {
      console.error(error);
    }
  });

  socket.on('createStudentData', async (userData) => {
    try {
      const newUser = new StudentModel(userData);
      const savedUser = await newUser.save();

      const attendanceEntry = await Attendance.findOne({ section: userData.section });
      if (attendanceEntry) {
        attendanceEntry.attendance.push({
          name: userData.name,
          mail: userData.mail,
        });
        await attendanceEntry.save();
        const da = await Attendance.find({});
        io.emit('statusOfCreateStudentModel', { status: "done", da });
      } else {
        const newAttendanceEntry = new Attendance({
          section: userData.section,
          attendance: [{
            name: userData.name,
            mail: userData.mail,
          }],
        });
        await newAttendanceEntry.save();
        io.emit('statusOfCreateStudentModel', { status: "done", newAttendanceEntry });
      }

      io.emit('attendanceUpdate', { status: "done" });

    } catch (error) {
      console.log(error)
      socket.emit('createUserError', { error: error.message });
    }
  });

  socket.on('activateMap', async ({ section, lat, lng, Enable }) => {
    console.log(Enable)
    try {
      const attendanceEntry = await Attendance.findOne({ section });

      if (attendanceEntry) {
        attendanceEntry.attendance.forEach((record) => {
          record.mapActive = Enable;
          record.lat = lat;
          record.lng = lng;
        });

        await attendanceEntry.save();
        const attendenceData = await Attendance.findOne({ section });
        io.emit('statusOfmapActivated', attendenceData);
      } else {
        io.emit('statusOfmapActivated', { error: `Section ${section} not found` });
      }
    } catch (error) {
      console.log(error)
      socket.emit('activateMapError', { error: error.message });
    }
  });

  socket.on('matchTheMap', async ({ section, name, mail }) => {
    try {
      const foundSection = await Attendance.findOne({ section });

      if (foundSection) {
        const foundStudent = foundSection.attendance.find(student => student.name === name && student.mail === mail);

        if (foundStudent) {
          foundStudent.isMapTrue = true;
          await foundSection.save();
          const data = await Attendance.findOne({ section });
          io.emit('matchTheMapDone', { "status": "done", data });
        } else {
          io.emit('matchTheMapDone', { "status": "not found student" });
        }
      } else {
        io.emit('matchTheMapDone', { "status": "not found section" });
      }
    } catch (error) {
      io.emit(`Error: ${error.message}`);
    }
  });

  socket.on('sendEmailAndGenerateOTP', async ({ mail }) => {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000);

      const otpDocument = new OTP({
        otp,
      });

      await otpDocument.save();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'techengaging@gmail.com',
          pass: 'elke utjw wxhn axyx',
        },
      });

      await transporter.sendMail({
        from: 'techengaging@gmail.com',
        to: mail,
        subject: 'Attendance OTP',
        html: `<b>Your OTP code: ${otp}</b>`,
      });

      io.emit('OTPstatus', { status: true });
    } catch (error) {
      io.emit("otpError", `Error: ${error.message}`);
    }
  });

  socket.on('verifyMailandProvideAttendence', async ({ enteredNumber, enteredMail, enteredSection }) => {
    try {
      const storedOTP = await OTP.findOne({ otp: enteredNumber });
      const t = await OTP.find({});

      if (storedOTP) {
        await OTP.findOneAndDelete({ otp: enteredNumber });

        const user = await Attendance.findOne({
          section: enteredSection
        });

        if (user) {
          const student = user.attendance.find((s) => s.mail === enteredMail);
          if (student) {
            student.period1 = true;
            await user.save();
            io.emit("verifyOTPResult", { action: 'verifyOTPResult', success: true, message: 'Number verification successful. Period1 updated.' });
          } else {
            io.emit("verifyOTPResult", { action: 'verifyOTPResult', success: false, message: 'User not found in the specified section.' });
          }
        } else {
          io.emit("verifyOTPResult", { action: 'verifyOTPResult', success: false, message: 'User not found in the specified section.' });
        }
      } else {
        io.emit("verifyOTPResult", { action: 'verifyOTPResult', success: false, message: 'not done.' });
      }

    } catch (error) {
      console.error(error);
    }
  });

  socket.on("initailStudentData", async ({ name, mail, section }) => {
    const foundSection = await Attendance.findOne({ section });
    if (foundSection) {
      const foundStudent = foundSection.attendance.find(student => student.name === name && student.mail === mail);
      console.log(foundStudent);
      io.emit("initailStudentResponse", foundStudent)
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.post('/create/admin', async (req, res) => {
  console.log(req.body)
  try {
    const newUser = new AttendenceAdmin(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

server.listen(PORT, () => {
  console.log("server running on port", PORT);
});
