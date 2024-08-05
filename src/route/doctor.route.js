const express = require("express");
const doctorController=require("../controllers/doctor.controller");
const checkAuth = require("../middleware/check.auth");

const router = express.Router();

router.get('/',doctorController.getDoctors); //get all doctors
router.post('/',doctorController.createDoctor); //create doctor
router.post('/login',doctorController.doctorLogin); //doctor login
router.get('/wma',doctorController.getDoctorList); //get doctor status=1 list
router.get('/get-doctors-by-specializations',doctorController.getDoctorsBySpecializationId); //get doctors by specialization
router.get('/:id',checkAuth,doctorController.getDoctor); //get doctor by id
router.put('/:id',checkAuth,doctorController.updateDoctor); //update doctor
router.patch('/:id', checkAuth,doctorController.onStatusChange); //status enable/disable

module.exports = router;    
