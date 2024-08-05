const express=require('express');
const bodyParser=require("body-parser");
const app=express();
const path = require("path");   
app.use(express.json({ limit: '50mb' })); 

const doctorRoute = require("./src/route/doctor.route");
const specializationRoute = require("./src/route/specialization.route");
const medicineRoute=require("./src/route/medicines.route");
const patientRoute=require("./src/route/patients.route");
const consultationRoute=require("./src/route/consultation.route");
const appointmentRoute=require("./src/route/appointment.route");


app.use(bodyParser.json());
app.use((req,res,next)=>{
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin,X-Requested-With,Content-Type,Accept, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PATCH,PUT,DELETE,OPTIONS" 
    );
    next();
});
app.use('/api/doctor',doctorRoute);
app.use('/api/specialization',specializationRoute);
app.use('/api/medicine',medicineRoute);
app.use('/api/patient',patientRoute);
app.use('/api/consultation',consultationRoute);
app.use('/api/appointment',appointmentRoute);



module.exports = app;