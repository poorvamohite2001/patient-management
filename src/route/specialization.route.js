const express = require("express");
const specializationController=require("../controllers/specialization.controller");



const router = express.Router();

router.get('/',specializationController.getSpecializations); //get specializations
router.post('/',specializationController.createSpecialization); //create specialization
router.get('/wma',specializationController.getSpecializationList); //get doctor status=1 list
router.get('/:id',specializationController.getSpecialization); //get specialization by id
router.put('/:id', specializationController.updateSpecialization); //update specialization
//router.delete('/:id',specializationController.deleteSpecialization); //delete Specialization
router.patch('/:id', specializationController.onStatusChange);


module.exports = router;    
