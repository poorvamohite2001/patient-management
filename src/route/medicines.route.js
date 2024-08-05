const express = require("express");
const medicineController=require("../controllers/medicines.controller");
const checkAuth = require("../middleware/check.auth");



const router = express.Router();

router.get('/',checkAuth,medicineController.getMedicines); //get medicine
router.post('/',checkAuth,medicineController.createMedicine); //create medicine
router.get('/wma',medicineController.getMedicineList); //get medicine status=1 list
router.get('/:id',checkAuth,medicineController.getMedicine); //get medicine by id
router.patch('/:id', medicineController.onStatusChange);
router.put('/:id',checkAuth,medicineController.updateMedicine); //update medicine

module.exports = router;    
