const express = require("express");
const consultationController=require("../controllers/consultation.controlller");


const router = express.Router();

router.get('/',consultationController.getConsultations); //get all Consultations
router.post('/',consultationController.createConsultation); //create Consultation
router.get('/:id',consultationController.getConsultation); //get Consultation by id
router.put('/:id',consultationController.updateConsultation); //update Consultation
router.delete('/:id',consultationController.deleteConsultation); //delete Consultation


module.exports = router;    
