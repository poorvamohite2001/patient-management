const express = require("express");
const appointmentController=require("../controllers/appointment.controller");
const checkAuth = require("../middleware/check.auth");

const router = express.Router();

router.get('/',checkAuth,appointmentController.getAppointments); //get Appointments
router.post('/',checkAuth,appointmentController.createAppointment); //create Appointment
router.get('/wma',appointmentController.getAppointmentList); //get Appointment List status=1 
router.get('/:id',checkAuth,appointmentController.getAppointment); //get Appointment by id
router.patch('/:id', appointmentController.onStatusChange);
router.put('/:id',checkAuth,appointmentController.updateAppointment); //update appointment


module.exports = router;    
