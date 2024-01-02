const express=require("express")
const nodemailer = require("nodemailer")
const mongoose=require('mongoose')
const bodyParser=require('body-parser')
const AttendenceAdmin = require('./models/admin');
const StudentModel = require('./models/student');
const OTP=require('./models/otp')
const Attendance=require('./models/Attendence')
const socketIo = require('socket.io');
const http=require('http')
const cors=require('cors')


var app=express()
app.use(cors())
let port=3000;


const server = http.createServer(app);
const io = socketIo(server,{
  cors:{
   origin: "*"
  }
});

// Connect to MongoDB
mongoose.connect('mongodb+srv://travalapp:travalapp@cluster0.oz5xxmc.mongodb.net/');

// Use bodyParser middleware to parse JSON
app.use(bodyParser.json());

io.on('connection', (socket) => {
  console.log('A user connected');
  

   
socket.on('LoginAdmin', async (message) => {
  try {
      // Find the user based on the entered mail and password
      const user = await AttendenceAdmin.findOne({ mail: message.enteredMail, password: message.enteredPassword });
  console.log(user);
      if (user) {
        // Send success message to the client
        io.emit("LoginStatus",JSON.stringify({ status:true,userData:user }));
      console.log(user)
      } else {
        io.emit("LoginStatus",JSON.stringify({ status:false }));
      }
    
    // Other types of requests can be handled similarly

  } catch (error) {
    // Handle error
    console.error(error);
  }
});

socket.on('LoginStudent',async(message)=>{
  try {
    // Find the user based on the entered mail and password
    const user = await StudentModel.findOne({ mail: message.enteredMail, password: message.enteredPassword });
console.log(user);
    if (user) {
      // Send success message to the client
      io.emit("LoginStatus",JSON.stringify({ status:true,userData:user }));
    console.log(user)
    } else {
      io.emit("LoginStatus",JSON.stringify({ status:false }));
    }
  
  // Other types of requests can be handled similarly

} catch (error) {
  // Handle error
  console.error(error);
}
})

  // Handle user creation studnet data and Attendance data
  socket.on('createStudentData', async (userData) => {
    try {
      const newUser = new StudentModel(userData);
      const savedUser = await newUser.save();
      // Create attendance entry for the user
      const attendanceEntry = await Attendance.findOne({ section: userData.section });
      if (attendanceEntry) {
     attendanceEntry.attendance.push({
          name: userData.name,
          mail: userData.mail,
        });
        await attendanceEntry.save();
        const da=await Attendance.find({});  
        io.emit('statusOfCreateStudentModel', {status:"done",da});
      } else {
        const newAttendanceEntry = new Attendance({
          section: userData.section,
          attendance: [{
            name: userData.name,
            mail: userData.mail,
          }],
        });
        await newAttendanceEntry.save();
        io.emit('statusOfCreateStudentModel', {status:"done",newAttendanceEntry});
      }

      // Emit a WebSocket event to notify clients about the new user


      // Emit a WebSocket event to notify clients about the attendance update
      io.emit('attendanceUpdate', { status:"done" });

    } catch (error) {
      // Emit an error event if user creation fails
      console.log(error)
      socket.emit('createUserError', { error: error.message });
    }
  });
   

  //active map
  socket.on('activateMap', async ({ section, lat, lng,Enable }) => {
    console.log(Enable)
    try {
      // Find the attendance entry for the specified section
      const attendanceEntry = await Attendance.findOne({ section });
     
      if (attendanceEntry) {
        // Update mapActive for all attendance records in the specified section
        attendanceEntry.attendance.forEach((record) => {
          record.mapActive = Enable;
          record.lat = lat;
          record.lng = lng;
        });
        console.log(attendanceEntry)
        // Save the updated attendance entry
        await attendanceEntry.save();
        const attendenceData = await Attendance.findOne({ section });
        // Emit a WebSocket event to notify clients about the map activation
        io.emit('statusOfmapActivated', attendenceData);
  
      } else {
        // Emit an error event if the specified section is not found
        io.emit('statusOfmapActivated', { error: `Section ${section} not found` });
      }
  
    } catch (error) {
      // Emit an error event if map activation fails
      console.log(error)
      socket.emit('activateMapError', { error: error.message });
    }
  });

  socket.on('matchTheMap', async ({ section, name, mail }) => {
    try {
      // Find the section
      const foundSection = await Attendance.findOne({ section });

      if (foundSection) {
        // Find the student within the section
        const foundStudent = foundSection.attendance.find(student => student.name === name && student.mail === mail);

        if (foundStudent) {
          // Update isMapTrue for the found student
          foundStudent.isMapTrue = true;

          // Save the updated section back to the database
          await foundSection.save();
          const data = await Attendance.findOne({ section });
          io.emit('matchTheMapDone',{"status":"done",data});
        } else {
          io.emit('matchTheMapDone',{"status":"not found student"});
        }
      } else {
        io.emit('matchTheMapDone',{"status":"not found section"});
      }
    } catch (error) {
      io.emit(`Error: ${error.message}`);
    }
  });
   
 
  // Handle frontend event to send email and generate OTP
  socket.on('sendEmailAndGenerateOTP', async ({ mail }) => {
    try {
      // Generate a random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000);

      // Create an OTP document
      const otpDocument = new OTP({
        otp,
      });

      // Save the OTP to the database
      await otpDocument.save();

      // Send the OTP to the user's email
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

      // Send success message to the client
      io.emit('OTPstatus',{status:true});
    } catch (error) {
      // Send error message to the client
      io.emit("otpError",`Error: ${error.message}`);
    }
  });


  socket.on('verifyMailandProvideAttendence', async ({enteredNumber,enteredMail,enteredSection}) => {
    try {
        // Check if the entered number matches the stored OTP
        const storedOTP = await OTP.findOne({ otp: enteredNumber }); // Get the latest OTP
        const t=await OTP.find({})
        console.log("user",enteredNumber,enteredMail,enteredSection,OTP)
        if (storedOTP) {
          // Remove the used OTP from the database
          await OTP.findOneAndDelete({ otp: enteredNumber });
           const otpdata=await OTP.find({})
          // Find the corresponding user in the Attendance collection
          const user = await Attendance.findOne({
            section: enteredSection
          });
   
          if (user) {
            // Update period1 as true for the found user
            const student = user.attendance.find((s) => s.mail === enteredMail);
            if (student) {
              student.period1 = true;
              await user.save();

              // Send success message to the client
              io.emit("verifyOTPResult",{ action: 'verifyOTPResult', success: true, message: 'Number verification successful. Period1 updated.' });
            } else {
              io.emit("verifyOTPResult",{ action: 'verifyOTPResult', success: false, message: 'User not found in the specified section.' });
            }
          } else {
            io.emit("verifyOTPResult",{ action: 'verifyOTPResult', success: false, message: 'User not found in the specified section.' });
          }
        } else {
          io.emit("verifyOTPResult",{ action: 'verifyOTPResult', success: false, message: 'not done.' });
        }
      
    } catch (error) {
      // Handle error
      console.error(error);
    }
  });

  socket.on("initailStudentData",async({name,mail,section})=>{
    const foundSection = await Attendance.findOne({ section });
    if (foundSection) {
      // Find the student within the section
      const foundStudent = foundSection.attendance.find(student => student.name === name && student.mail === mail);
            console.log(foundStudent);
             io.emit("initailStudentResponse",foundStudent)    
        }
      })
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});





// Create a new user
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




server.listen(port,()=>{
    console.log("server running on port",port);
})





// app.get("/sendEmail",async(res,req)=>{
//   let transporter=await nodemailer.createTransport({
//         service:"gmail",
//         auth:{
//            user:"techengaging@gmail.com",
//            pass:"elke utjw wxhn axyx"
//              }
//         })
//      let info=await transporter.sendMail({
//        from:"techengaging@gmail.com",
//        to:"shaikimampashadeveloper@gmail.com",
//        subject: "Attendence Otp",
//        html:"<b>your otp code</b>"
//      })
//      console.log(info);
// })
