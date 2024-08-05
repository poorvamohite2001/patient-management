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

//create patient
const createPatient = async (req, res) => {
  const patient_name = req.body.patient_name
    ? req.body.patient_name.trim()
    : "";
  const mobile_no = req.body.mobile_no ? req.body.mobile_no.trim() : "";
  const appointment_date = req.body.appointment_date
    ? req.body.appointment_date.trim()
    : "";
  const appointment_time = req.body.appointment_time
    ? req.body.appointment_time.trim()
    : "";
  const spec_id = req.body.spec_id ? req.body.spec_id : "";
  const doctor_id = req.body.doctor_id ? req.body.doctor_id : "";
  const gender = req.body.gender ? req.body.gender.trim() : "";
  const age = req.body.age ? req.body.age : "";
  const address = req.body.address ? req.body.address.trim() : "";
  const city = req.body.city ? req.body.city.trim() : "";
  const district_id = req.body.district_id ? req.body.district_id : "";
  const state_id = req.body.state_id ? req.body.state_id : "";
  const notes = req.body.notes ? req.body.notes.trim() : "";
  const patient_status = req.body.patient_status ? req.body.patient_status.trim() : "";


  if (!patient_name) {
    return error422("Patient name is required", res);
  } else if (!mobile_no) {
    return error422("Mobile number is required", res);
  } else if (!appointment_date) {
    return error422("Appointment date is required", res);
  } else if (!appointment_time) {
    return error422("Appointment time is required", res);
  } else if (!spec_id) {
    return error422("Specialization Id is required", res);
  } else if (!doctor_id) {
    return error422("Doctor Id is required", res);
  } else if (!gender) {
    return error422("gender is required", res);
  } else if (!age) {
    return error422("Age is required", res);
  }
  //check patient already exists in patients table
  const isExistPatientQuery = "SELECT * FROM patients WHERE patient_name = ? ";
  const isExistPatientResult = await query(isExistPatientQuery, [patient_name]);
  if (isExistPatientResult.length > 0) {
    return error422("Patient already exists.", res);
  }
  try {
    // Start a transaction
    await query("BEGIN");

    // Insert patient details
    const insertpatientQuery =
      "INSERT INTO patients (patient_name, mobile_no,appointment_date,appointment_time,spec_id,doctor_id,gender,age,address,city,district_id,state_id,notes,patient_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
    const insertpatientValues = [
      patient_name,
      mobile_no,
      appointment_date,
      appointment_time,
      spec_id,
      doctor_id,
      gender,
      age,
      address,
      city,
      district_id,
      state_id,
      notes,
      patient_status
    ];
    const insertpatientResult = await query(
      insertpatientQuery,
      insertpatientValues
    );
    //const patientId = insertpatientResult.insertId;

    // Commit the transaction
    await query("COMMIT");

    return res.status(200).json({
      status: 200,
      message: "Patient added successfully",
    });
  } catch (error) {
    // Handle errors
    await query("ROLLBACK");
    return error500(error, res);
  }
};
// get patient by id...
const getPatient = async (req, res) => {
  const patientId = parseInt(req.params.id);
  try {
    const patientQuery = `SELECT * FROM patients WHERE patient_id=? `;
    const patientResult = await query(patientQuery, [patientId]);
    if (patientResult.length === 0) {
      return error422("Patient Not Found.", res);
    }

    const patient = patientResult[0];
    return res.status(200).json({
      status: 200,
      message: "patient Retrieved Successfully",
      data: patient,
    });
  } catch (error) {
    return error500(error, res);
  }
};
//get patient list...
const getPatientWmaList = async (req, res) => {
  let patientQuery =
    "SELECT * FROM patients WHERE status=1 ORDER BY patient_name asc";
  try {
    const patientResult = await query(patientQuery);
    const patients = patientResult;
    return res.status(200).json({
      status: 200,
      message: "Patient Retrieved Successfully.",
      data: patients,
    });
  } catch (error) {
    return error500(error, res);
  }
};
//status change of patient ...
const onStatusChange = async (req, res) => {
  const patientId = parseInt(req.params.id);
  const status = parseInt(req.query.status); // Validate and parse the status parameter
  try {
    // Check if the patient exists
    const patientQuery = "SELECT * FROM patients WHERE patient_id = ?";
    const patientResult = await query(patientQuery, [patientId]);

    if (patientResult.length == 0) {
      return res.status(404).json({
        status: 404,
        message: "patient not found.",
      });
    }

    // Validate the status parameter
    if (status !== 0 && status !== 1) {
      return res.status(400).json({
        status: 400,
        message:
          "Invalid status value. Status must be 0 (inactive) or 1 (active).",
      });
    }

    // Soft update the patient status
    const updateQuery = `UPDATE patients SET status = ? WHERE patient_id = ?`;
    await query(updateQuery, [status, patientId]);

    const statusMessage = status === 1 ? "activated" : "deactivated";

    return res.status(200).json({
      status: 200,
      message: `patient ${statusMessage} successfully.`,
    });
  } catch (error) {
    return error500(error, res);
  }
};
//get patients...
const getPatients = async (req, res) => {
    const { page, perPage, key,doctor_id } = req.query;
    try {
      let getPatientsQuery = `SELECT * FROM patients WHERE 1 `;
      let countQuery = `SELECT COUNT(*) AS total FROM patients WHERE 1 `;
      
      if (key) {
        const lowercaseKey = key.toLowerCase().trim();
        if (lowercaseKey === "activated") {
          getPatientsQuery += `  AND status=1`;
          countQuery += ` AND  status=1`;
        } else if (lowercaseKey === "deactivated") {
          getPatientsQuery += ` AND status=0`;
          countQuery += ` AND status=0`;
        } else {
          getPatientsQuery += ` AND LOWER (patient_name) LIKE '%${lowercaseKey}%'`;
          countQuery += ` AND LOWER(patient_name) LIKE '%${lowercaseKey}%'`;
        }
      }
      
      if(doctor_id){
        getPatientsQuery += ` AND doctor_id = ${doctor_id}`;
       countQuery += ` AND doctor_id = ${doctor_id}`;
       
     }
      let total = 0;
      // Apply pagination if both page and perPage are provided
      if (page && perPage) {
        const totalResult = await query(countQuery);
        
        total = parseInt(totalResult[0].total);
  
        const start = (page - 1) * perPage;
        getPatientsQuery += ` LIMIT ${perPage} OFFSET ${start}`;
      }
      const result = await query(getPatientsQuery);
      const data = {
        status: 200,
        message: "Patients retrieved successfully",
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
  //patient update
const updatePatient = async (req, res) => {
  const patientId = parseInt(req.params.id);
  const patient_name = req.body.patient_name ? req.body.patient_name.trim() : "";
  const mobile_no = req.body.mobile_no ? req.body.mobile_no.trim() : "";
  const appointment_date = req.body.appointment_date  ? req.body.appointment_date.trim(): "";
  const appointment_time = req.body.appointment_time ? req.body.appointment_time.trim(): "";
  const spec_id = req.body.spec_id ? req.body.spec_id : "";
  const gender = req.body.gender ? req.body.gender.trim() : "";
  const age = req.body.age ? req.body.age : "";
  const address = req.body.address ? req.body.address.trim() : "";
  const city = req.body.city ? req.body.city.trim() : "";
  const district_id = req.body.district_id ? req.body.district_id : "";
  const state_id = req.body.state_id ? req.body.state_id : "";
  const notes = req.body.notes ? req.body.notes.trim() : "";
  const doctor_id = req.companyData.doctor_id;

  if (!patient_name) {
    return error422("Patient name is required", res);
  } else if (!mobile_no) {
    return error422("Mobile number is required", res);
  } else if (!appointment_date) {
    return error422("Appointment date is required", res);
  } else if (!appointment_time) {
    return error422("Appointment time is required", res);
  } else if (!spec_id) {
    return error422("Specialization Id is required", res);
  } else if (!gender) {
    return error422("gender is required", res);
  } else if (!age) {
    return error422("Age is required", res);
  }
  // Check if patient exists
  const patientQuery = "SELECT * FROM patients WHERE patient_id = ?";
  const patientResult = await query(patientQuery, [patientId]);
  if (patientResult.length == 0) {
    return error422("Patient Not Found.", res);
  }
//check patient already exists in patients table
const isExistPatientQuery = "SELECT * FROM patients WHERE patient_name = ? AND patient_id !=?";
const isExistPatientResult = await query(isExistPatientQuery, [patient_name, patientId]);
console.log(isExistPatientResult);
if (isExistPatientResult.length > 0) {
  return error422("Patient Name already exists.", res);
}
  try {
    // Start a transaction
    await query("BEGIN");
    const nowDate = new Date().toISOString().split('T')[0];

    // Update the patient record with new data
    const updateQuery = `UPDATE patients SET patient_name = ?, mobile_no = ?, appointment_date = ?, appointment_time = ?,spec_id=?,gender=?,address=?,city=?,district_id=?,state_id=?,notes=?,modified_at=?
         WHERE patient_id = ?  `;
    const updateResult = await query(updateQuery, [patient_name,mobile_no,appointment_date,appointment_time,spec_id,gender,address,city,district_id,state_id,notes,nowDate,patientId]);

    await query("COMMIT");

    return res.status(200).json({
      status: 200,
      message: "Patient updated successfully.",
    });
  } catch (error) {
    return error500(error, res);
  }
};
//get patient pending list...
const getPatientPendingList = async (req, res) => {
  const { page, perPage, doctor_id } = req.query;

  try {
 
    let getPatientsQuery = `SELECT * FROM patients WHERE 1 AND patient_status='PENDING' `;
    let countQuery = `SELECT COUNT(*) AS total FROM patients WHERE 1 AND patient_status='PENDING' `;
    
    if(doctor_id){
      getPatientsQuery += ` AND doctor_id = ${doctor_id}`;
     countQuery += ` AND doctor_id = ${doctor_id}`;
     
   }
    let total = 0;
    // Apply pagination if both page and perPage are provided
    if (page && perPage) {
      const totalResult = await query(countQuery);
      
      total = parseInt(totalResult[0].total);

      const start = (page - 1) * perPage;
      getPatientsQuery += ` LIMIT ${perPage} OFFSET ${start}`;
    }
    const result = await query(getPatientsQuery);
    const data = {
      status: 200,
      message: "Patients retrieved successfully",
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
  // let patientQuery =
  //   "SELECT * FROM patients WHERE patient_status='PENDING' ORDER BY patient_name asc";
  // try {
  //   const patientResult = await query(patientQuery);
  //   const patients = patientResult;
  //   return res.status(200).json({
  //     status: 200,
  //     message: "Patient Retrieved Successfully.",
  //     data: patients,
  //   });
  // } catch (error) {
  //   return error500(error, res);
  // }
};
//get patient pending list...
const getPatientConfirmList = async (req, res) => {
  const { page, perPage, doctor_id } = req.query;
try{
  let patientQuery =
    "SELECT * FROM patients WHERE 1 AND patient_status='CONFIRM' ";
    let countQuery = `SELECT COUNT(*) AS total FROM patients WHERE 1 AND patient_status='CONFIRM' `;
    if(doctor_id){
      patientQuery += ` AND doctor_id = ${doctor_id}`;
     countQuery += ` AND doctor_id = ${doctor_id}`;
     
   }
    let total = 0;
    // Apply pagination if both page and perPage are provided
    if (page && perPage) {
      const totalResult = await query(countQuery);
      
      total = parseInt(totalResult[0].total);

      const start = (page - 1) * perPage;
      patientQuery += ` LIMIT ${perPage} OFFSET ${start}`;
    }
    const result = await query(patientQuery);
    const data = {
      status: 200,
      message: "Patients retrieved successfully",
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
  // try {
  //   const patientResult = await query(patientQuery);
  //   const patients = patientResult;
  //   return res.status(200).json({
  //     status: 200,
  //     message: "Patient Confirm Status Retrieved Successfully.",
  //     data: patients,
  //   });
  // } catch (error) {
  //   return error500(error, res);
  // }
};
//status change of patient ...
const onPatientStatusChange = async (req, res) => {
  const patientId = parseInt(req.params.id);
  const patient_status = (req.query.patient_status); // Validate and parse the status parameter
  
  try {
    // Check if the patient exists
    const patientQuery = "SELECT * FROM patients WHERE patient_id = ?";
    const patientResult = await query(patientQuery, [patientId]);

    if (patientResult.length == 0) {
      return res.status(404).json({
        status: 404,
        message: "patient not found.",
      });
    }

    // Validate the status parameter
    if (patient_status !== 'PENDING' && patient_status !== 'CONFIRM') {
      return res.status(400).json({
        status: 400,
        message:
          "Invalid status value. Status must be  PENDING or CONFIRM.",
      });
    }

    // Soft update the patient status
    const updateQuery = `UPDATE patients SET patient_status = ? WHERE patient_id = ?`;
    await query(updateQuery, [patient_status, patientId]);

    const statusMessage = patient_status === 'CONFIRM' ? "CONFIRM" : "PENDING";

    return res.status(200).json({
      status: 200,
      message: `patient ${statusMessage} successfully.`,
    });
  } catch (error) {
    return error500(error, res);
  }
};
module.exports = {
  createPatient,
  getPatient,
  getPatientWmaList,
  onStatusChange,
  onPatientStatusChange,
  getPatients,
  getPatientPendingList,
  getPatientConfirmList,
  updatePatient
};
