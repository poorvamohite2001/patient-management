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
  console.log(err);
  return res.status(500).json({
    status: 500,
    message: "Internal Server Error",
    error: err,
  });
};

//create Consultation
const createConsultation = async (req, res) => {
  const patient_id = req.body.patient_id ? req.body.patient_id : "";
  const doctor_id = req.body.doctor_id ? req.body.doctor_id : "";
  const notes = req.body.notes ? req.body.notes.trim() : "";

  if (!patient_id) {
    return error422("Patient Id  is required", res);
  } else if (!doctor_id) {
    return error422("Doctor Id is required", res);
  } else if (!notes) {
    return error422("Notes are required", res);
  }

  try {
    // Start a transaction
    await query("BEGIN");
    //insert consultation details
    const insertConsultationQuery =
      "INSERT INTO consultations (patient_id,doctor_id,notes) VALUES (?,?,?)";
    const insertConsultationValues = [patient_id, doctor_id, notes];
    const insertConsultationResult = await query(
      insertConsultationQuery,
      insertConsultationValues
    );
    const consultation_id = insertConsultationResult.insertId;

    const medicines = req.body.medicines ? req.body.medicines : [];

    for (let index = 0; index < medicines.length; index++) {
      const element = medicines[index];
      //console.log(element.medicine_id);
      const medicine_note = element.medicine_note
        ? element.medicine_note.trim()
        : "";

      let query2 = `SELECT * FROM consultation_medicine WHERE medicine_id=${element.medicine_id}`;
      result = await query(query2);

      //console.log(result);

      //insert consultation medicine details
      const insertConsultationMedicineQuery =
        "INSERT INTO consultation_medicine (consultation_id,medicine_id,medicine_note) VALUES (?,?,?)";
      const insertConsultationMedicineValues = [
        consultation_id,
        element.medicine_id,
        medicine_note,
      ];
      const ConsultationMedicineResult = await query(
        insertConsultationMedicineQuery,
        insertConsultationMedicineValues
      );
    }

    // Commit the transaction
    await query("COMMIT");
    return res.status(200).json({
      status: 200,
      message: "message",
      message: "Consultation added successfully",
    });
  } catch (error) {
    // Handle errors
    await query("ROLLBACK");
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error,
    });
  }
};
//get consultations...
const getConsultations = async (req, res) => {
  const { page, perPage, key } = req.query;

  try {
    let getConsultationQuery = `SELECT c.*, d.doctor_name,d.organization_name,p.patient_name,p.mobile_no,p.appointment_date,p.spec_id,p.gender,p.age,p.address,p.city,p.district_id,p.state_id,p.notes,p.status FROM consultations c
    LEFT JOIN doctor d 
    ON d.doctor_id=c.doctor_id
    LEFT JOIN patients p
     ON p.patient_id=c.patient_id `;

    let countQuery = `SELECT COUNT(*) AS total, d.doctor_name,d.organization_name,p.patient_name,p.mobile_no,p.appointment_date,p.spec_id,p.gender,p.age,p.address,p.city,p.district_id,p.state_id,p.notes,p.status FROM consultations c
    LEFT JOIN doctor d 
    ON d.doctor_id=c.doctor_id
    LEFT JOIN patients p
     ON p.patient_id=c.patient_id `;

    if (key) {
      const lowercaseKey = key.toLowerCase().trim();
      if (lowercaseKey === "activated") {
        getConsultationQuery += ` WHERE c.status = 1`;
        countQuery += ` WHERE c.status = 1`;
      } else if (lowercaseKey === "deactivated") {
        getConsultationQuery += ` WHERE c.status = 0`;
        countQuery += ` WHERE c.status = 0`;
      } else {
        getConsultationQuery += ` WHERE LOWER(c.notes) LIKE '%${lowercaseKey}%'`;
        countQuery += ` WHERE LOWER(c.notes) LIKE '%${lowercaseKey}%'`;
      }
    }

    let total = 0;
    // Apply pagination if both page and perPage are provided
    if (page && perPage) {
      const totalResult = await query(countQuery);
      total = parseInt(totalResult[0].total);

      const start = (page - 1) * perPage;
      getConsultationQuery += ` LIMIT ${perPage} OFFSET ${start} `;
    }
    const result = await query(getConsultationQuery);
    const consultations = result;

    let consultationArray = consultations;

    for (let index = 0; index < consultationArray.length; index++) {
      const element = consultationArray[index];
      const consultationmedicineQuery = `SELECT consultation_medicine_id, consultation_id, medicine_id, medicine_note, status, created_at, modified_at FROM consultation_medicine 
    WHERE consultation_id=?`;
      const consultationmedicineResult = await query(
        consultationmedicineQuery,
        [element.consultation_id]
      );
      consultations[index]["medicines"] = consultationmedicineResult;
    }

    const data = {
      status: 200,
      message: "Consultation retrieved successfully",
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
// get consultation by id...
const getConsultation = async (req, res) => {
  const consultationId = parseInt(req.params.id);
  try {
    const consultationQuery = `SELECT c.*, d.doctor_name,d.organization_name,p.patient_name,p.mobile_no,p.appointment_date,p.spec_id,p.gender,p.age,p.address,p.city,p.district_id,p.state_id,p.notes,p.status FROM consultations c
    LEFT JOIN doctor d 
    ON d.doctor_id=c.doctor_id
    LEFT JOIN patients p
    ON p.doctor_id=c.doctor_id
    WHERE c.consultation_id=? `;
    const consultationResult = await query(consultationQuery, [consultationId]);
    if (consultationResult.length === 0) {
      return error422("consultation Not Found.", res);
    }
    const consultationmedicineQuery = `SELECT consultation_medicine_id, consultation_id, medicine_id, medicine_note, status, created_at, modified_at FROM consultation_medicine 
    WHERE consultation_id=?;`;
    const consultationmedicineResult = await query(consultationmedicineQuery, [
      consultationId,
    ]);
    //console.log(consultationmedicineResult);

    let consultation = consultationResult[0];
    consultation["medicines"] = consultationmedicineResult;
    return res.status(200).json({
      status: 200,
      message: "consultation Retrieved Successfully",
      data: consultation,
    });
  } catch (error) {
    return error500(error, res);
  }
};
//update consultation
const updateConsultation = async (req, res) => {
  const consultation_id = parseInt(req.params.id);
  const patient_id = req.body.patient_id ? req.body.patient_id : "";
  const doctor_id = req.body.doctor_id ? req.body.doctor_id : "";
  const notes = req.body.notes ? req.body.notes.trim() : "";

  if (!patient_id) {
    return error422("Patient Id  is required", res);
  } else if (!doctor_id) {
    return error422("Doctor Id is required", res);
  } else if (!notes) {
    return error422("Notes are required", res);
  }
  try {
    // Start a transaction
    await query("BEGIN");
    const nowDate = new Date().toISOString().split("T")[0];

    //update consultation record with new data
    const updateQuery = `UPDATE consultations SET patient_id=?,doctor_id=?,notes=?,modified_at=?
    WHERE consultation_id=?`;
    const updateResult = await query(updateQuery, [
      patient_id,
      doctor_id,
      notes,
      nowDate,
      consultation_id,
    ]);
    //console.log(updateResult);

    const medicines = req.body.medicines ? req.body.medicines : [];

    for (let index = 0; index < medicines.length; index++) {
      const element = medicines[index];
      //console.log(element.medicine_id);
      const consultation_medicine_id = element.consultation_medicine_id
        ? element.consultation_medicine_id
        : "";
      const medicine_note = element.medicine_note
        ? element.medicine_note.trim()
        : "";

      if (consultation_medicine_id) {
        //update consultation medicine
        const updateconsultationmedicineQuery = `UPDATE consultation_medicine SET medicine_id=?,medicine_note=?,modified_at=?
    WHERE consultation_medicine_id=?`;
        const updateconsultationmedicineResult = await query(
          updateconsultationmedicineQuery,
          [
            element.medicine_id,
            medicine_note,
            nowDate,
            consultation_medicine_id,
          ]
        );
        //console.log(updateconsultationmedicineResult);
      } else {
        //insert consultation medicine details
        const insertconsultationmedicinequery =
          "INSERT INTO consultation_medicine (consultation_id,medicine_id,medicine_note) VALUES (?,?,?)";
        const insertconsultationmedicinevalues = [
          consultation_id,
          element.medicine_id,
          medicine_note,
        ];
        const consultationmedicineresult = await query(
          insertconsultationmedicinequery,
          insertconsultationmedicinevalues
        );
      }
    }
    //SELECT `consultation_medicine_id`, `consultation_id`, `medicine_id`, `medicine_note`, `status`, `created_at`, `modified_at` FROM `consultation_medicine` WHERE 1
    await query("COMMIT");

    return res.status(200).json({
      status: 200,
      message: "Consultation updated successfully.",
    });
  } catch (error) {
    return error500(error, res);
  }
};
//delete consultation
  const deleteConsultation = async (req, res) => {
  const consultation_medicine_id = parseInt(req.params.id);

  // Check if specialization exists
   const consultationmedicineQuery = "SELECT * FROM consultation_medicine WHERE consultation_medicine_id = ?";
   const consultationmedicineResult = await query(consultationmedicineQuery, [consultation_medicine_id]);
   if (consultationmedicineResult.length == 0) {
    return error422("Consultation Medicine Not Found.", res);
   }

   try {
         // Start a transaction
         await query("BEGIN");
         const deleteconsultationmedicineQuery = `DELETE FROM consultation_medicine WHERE consultation_medicine_id=? `;
         const deleteconsultationmedicineResult = await query(deleteconsultationmedicineQuery, [consultation_medicine_id]);
    
         await query("COMMIT");
         return res.status(200).json({
           status: 200,
           message: "Consultation Medicine deleted successfully.",
         });
       } catch (error) {
         return error500(error, res);
       }
     };
  
module.exports = {
  createConsultation,
  getConsultations,
  getConsultation,
  updateConsultation,
  deleteConsultation
};
