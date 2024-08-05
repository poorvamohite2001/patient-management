const express = require("express");
const patientController=require("../controllers/patients.controller");
const checkAuth = require("../middleware/check.auth");

const router = express.Router();

router.get('/',patientController.getPatients); //get medicine
router.post('/',patientController.createPatient); //create patient
router.get('/wma',patientController.getPatientWmaList); //get medicine status=1 list
router.get('/pending',patientController.getPatientPendingList); 
router.get('/confirm',patientController.getPatientConfirmList); 
router.get('/:id',patientController.getPatient); //get medicine by id
router.patch('/:id', patientController.onStatusChange);
router.patch('/:id', patientController.onPatientStatusChange);



router.put('/:id',checkAuth, patientController.updatePatient);

module.exports = router;    
