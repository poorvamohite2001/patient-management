const pool = require("../../db");
const util = require("util");
const query = util.promisify(pool.query).bind(pool);

//error 422 handle...
error422 = (message, res) => {
  return res.status(422).json({
    status: 422,
    message: message,
  });
};
//error 500 handle...
error500 = (err, res) => {
  return res.status(500).json({
    status: 500,
    message: "Internal Server Error",
    error: err,
  });
};

//create medicines
const createMedicine = async (req, res) => {
  const medicine_name = req.body.medicine_name
    ? req.body.medicine_name.trim()
    : "";
  const content = req.body.content ? req.body.content.trim() : "";
  const doctor_id = req.companyData.doctor_id;


  if (!medicine_name) {
    return error422("Medicine name is required", res);
  }else if (!doctor_id) {
    return error422("Doctor id is required", res);
  }
  //check medicine already exists in medicine table
  const isExistMedicineQuery =
    "SELECT * FROM medicines WHERE medicine_name = ? && doctor_id";
  const isExistMedicineResult = await query(isExistMedicineQuery, [
    medicine_name,doctor_id
  ]);
  if (isExistMedicineResult.length > 0) {
    return error422("Medicine already exists.", res);
  }
  try {
    // Start a transaction
    await query("BEGIN");

    // Insert medicine details
    const insertmedicineQuery =
      "INSERT INTO medicines (medicine_name, content,doctor_id) VALUES (?,?,?)";
    const insertmedicineValues = [medicine_name, content, doctor_id];
    const insertmedicineResult = await query(
      insertmedicineQuery,
      insertmedicineValues
    );
    const medicineId = insertmedicineResult.insertId;

    // Commit the transaction
    await query("COMMIT");

    return res.status(200).json({
      status: 200,
      message: "Medicine added successfully",
    });
  } catch (error) {
    // Handle errors
    await query("ROLLBACK");
    return error500(error, res);
  }
};
//get medicines...
const getMedicines = async (req, res) => {
  const doctor_id = req.companyData.doctor_id;

    //const medicineId = parseInt(req.params.id);
    const { page, perPage, key } = req.query;
    
    try {
      let getMedicinesQuery = `SELECT m.*, d.doctor_name, d.organization_name FROM medicines m
      LEFT JOIN doctor d
      ON d.doctor_id =m.doctor_id 
      WHERE 1 AND m.doctor_id =${doctor_id }`;
  
      let countQuery = `SELECT COUNT(*) AS total, d.doctor_name, d.organization_name FROM medicines m
      LEFT JOIN doctor d
      ON d.doctor_id=m.doctor_id
      WHERE 1 AND m.doctor_id=${doctor_id}`;
      
      if (key) {
        const lowercaseKey = key.toLowerCase().trim();
        if (lowercaseKey === "activated") {
            getMedicinesQuery += `  AND m.status=1`;
          countQuery += ` AND  m.status=1`;
        } else if (lowercaseKey === "deactivated") {
            getMedicinesQuery += ` AND m.status=0`;
          countQuery += ` AND m.status=0`;
        } else {
            getMedicinesQuery += ` AND LOWER (m.medicine_name) LIKE '%${lowercaseKey}%'`;
          countQuery += ` AND LOWER(m.medicine_name) LIKE '%${lowercaseKey}%'`;
          //console.log(countQuery);
        }
      }
      
      let total = 0;
      // Apply pagination if both page and perPage are provided
      if (page && perPage) {
        const totalResult = await query(countQuery);
        
        total = parseInt(totalResult[0].total);
  
        const start = (page - 1) * perPage;
        getMedicinesQuery += ` LIMIT ${perPage} OFFSET ${start}`;
      }
      const result = await query(getMedicinesQuery);
      const data = {
        status: 200,
        message: "Medicines retrieved successfully",
        data: result,
      };
      // Add pagination information if provided
      if (page && perPage) {
        data.pagination = {
          per_page: perPage,
          total: total,
          current_page: page,
          last_page: Math.ceil(total / perPage),
        };
      }
      return res.status(200).json(data);
    } catch (error) {
      return error500(error, res);
    }
  };
  // get medicine by id...
const getMedicine = async (req, res) => {
  const doctor_id = req.companyData.doctor_id;
    const medicineId = parseInt(req.params.id);
    try {
      const medocineQuery = `SELECT * FROM medicines WHERE medicine_id=? AND doctor_id=? `;
      const medicineResult = await query(medocineQuery, [medicineId,doctor_id]);
      if (medicineResult.length === 0) {
        return error422("Medicine Not Found.", res);
      }
      
      const medicine = medicineResult[0];
      return res.status(200).json({
        status: 200,
        message: "medicine Retrieved Successfully",
        data: medicine,
      });
    } catch (error) {
      return error500(error, res);
    }
  };
  //get medicine list...
const getMedicineList = async (req, res) => {
    let medicineQuery = "SELECT * FROM medicines WHERE status=1 ORDER BY medicine_name asc";
    try {
      const medicineResult = await query(medicineQuery);
      const medicines = medicineResult;
      return res.status(200).json({
        status: 200,
        message: "medicine Retrieved Successfully.",
        data: medicines
      });
    } catch (error) {
      return error500(error, res);
    }
  };
  //status change of medicine ...
const onStatusChange = async (req, res) => {
    const medicineId = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter
    try {
      // Check if the specialization exists
      const medicineQuery = "SELECT * FROM medicines WHERE medicine_id = ?";
      const medicineResult = await query(medicineQuery, [medicineId]);
  
      if (medicineResult.length == 0) {
        return res.status(404).json({
          status: 404,
          message: "medicine not found.",
        });
      }
  
      // Validate the status parameter
      if (status !== 0 && status !== 1) {
        return res.status(400).json({
          status: 400,
          message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
        });
      }
  
      // Soft update the medicine status
      const updateQuery = `UPDATE medicines SET status = ? WHERE medicine_id = ?`;
      await query(updateQuery, [status, medicineId]);
  
      const statusMessage = status === 1 ? "activated" : "deactivated";
  
      return res.status(200).json({
        status: 200,
        message: `medicine ${statusMessage} successfully.`,
      });
    } catch (error) {
      return error500(error, res);
    }
  };
  // update specialization
const updateMedicine = async (req, res) => {
    const medicineId = parseInt(req.params.id);
    const medicine_name = req.body.medicine_name ? req.body.medicine_name.trim() : '';
    const content = req.body.content ? req.body.content.trim() : '';
  const doctor_id = req.companyData.doctor_id;
    
    
    if (!medicine_name) {
      return error422("medicine name is required", res);
    }else if (!doctor_id) {
      return error422("Doctor id is required", res);
    }
    // Check if medicine exists
    const medicineQuery = "SELECT * FROM medicines WHERE medicine_id = ?";
    const medicineResult = await query(medicineQuery, [medicineId]);
    if (medicineResult.length == 0) {
      return error422("medicine Not Found.", res);
    }
  
    try {
      // Start a transaction
      await query("BEGIN");
  
      // Update the specialization record with new data
      const updateQuery = `UPDATE medicines SET medicine_name = ?, content = ?
           WHERE medicine_id = ? `;
      const updateResult = await query(updateQuery, [medicine_name,content,medicineId]);
  
      await query("COMMIT");
  
      return res.status(200).json({
        status: 200,
        message: "medicine updated successfully.",
      });
    } catch (error) {
      return error500(error, res);
    }
};
module.exports = {
  createMedicine,
  getMedicines,
  getMedicine,
  getMedicineList,
  onStatusChange,
  updateMedicine
};
