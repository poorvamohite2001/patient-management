const pool = require("../../db");
const util = require('util');
const query = util.promisify(pool.query).bind(pool);
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
  }
  //create Doctor
const createDoctor = async (req, res) => {
  const doctor_name = req.body.doctor_name ? req.body.doctor_name.trim() : '';
  const organization_name = req.body.organization_name ? req.body.organization_name.trim() : '';
  const spec_id = req.body.spec_id ? req.body.spec_id : '';
  const address1 = req.body.address1 ? req.body.address1.trim() : '';
  const city = req.body.city ? req.body.city.trim() : '';
  const district_id = req.body.district_id ? req.body.district_id : '';
  const state_id = req.body.state_id ? req.body.state_id: '';
  const email_id = req.body.email_id ? req.body.email_id.trim() : '';
  const mobile_no = req.body.mobile_no ? req.body.mobile_no.trim() : '';
  const education = req.body.education ? req.body.education.trim() : '';
  const password = req.body.password ? req.body.password : '';

  if (!doctor_name) {
    return error422("Doctor name name is required", res);
  } else if (!organization_name) {
    return error422("Organization name  is required", res);
  }else if (!spec_id) {
    return error422("Specialization Id  is required", res);
  }else if (!city) {
    return error422("City name  is required", res);
  }else if (!district_id) {
    return error422("District Id is required", res);
  }else if (!state_id) {
    return error422("State Id is required", res);
  }else if (!email_id) {
    return error422("email_id is required", res);
  }else if (!mobile_no) {
    return error422("Mobile number is required", res);
  }else if (!education) {
    return error422("Education is required", res);
  }else if (!password) {
    return error422("Education is required", res);
  }
  //check Doctor already exists in Doctor table
  const isExistDoctorQuery =
    "SELECT * FROM doctor WHERE email_id = ?";
  const isExistDoctorResult = await query(isExistDoctorQuery, [email_id]);
  if (isExistDoctorResult.length > 0) {
    return error422("Doctor already exists.", res);
  }
  //check specialization Id exist in Doctor
  const isExistSpecializationIdQuery =
    "SELECT * FROM doctor WHERE spec_id = ?";
  const isExistSpecializationIdnResult = await query(isExistSpecializationIdQuery, [spec_id]);
  if (isExistSpecializationIdnResult.length > 0) {
    return error422("Specialization Id already exists.", res);
  }
  try {
    // Start a transaction
    await query("BEGIN");
  
    // Insert Doctor details
    const insertDoctorQuery = 'INSERT INTO doctor (doctor_name, organization_name,spec_id, address1,city,district_id,state_id,email_id,mobile_no,education) VALUES (?,?,?,?,?,?,?,?,?,?)';
    const insertDoctorValues = [doctor_name, organization_name,spec_id, address1,city,district_id,state_id,email_id,mobile_no,education];
    const insertDoctorResult = await query(insertDoctorQuery, insertDoctorValues);
    const doctor_id = insertDoctorResult.insertId;

    const hash = await bcrypt.hash(password, 10); // Hash the password using bcrypt

    //insert into untitled 
    const insertUntitledQuery = 'INSERT INTO untitled (email_id, extensions,doctor_id) VALUES (?,?,?)';
    const insertUntitledValues = [email_id, hash,doctor_id];
    const untitledResult = await query(insertUntitledQuery, insertUntitledValues);

    // Commit the transaction
  await query("COMMIT");

  return res.status(200).json({
    status: 200,
    message: "Doctor added successfully",
  });
}catch (error) {
  // Handle errors
  await query("ROLLBACK");
  return error500(error, res)
}
};
const doctorLogin = async (req, res) => {
  const password = req.body.password ? req.body.password : '';
  const email_id = req.body.email_id ? req.body.email_id.trim() : '';

  if (!password) {
    return error422("Password is Required.", res);
  } else if (!email_id) {
    return error422("Email id is Required.", res);
  }
  // Check if the untiled with the provided mobile no exists and is active
  const checkUntitledQuery = "SELECT * FROM untitled WHERE LOWER(TRIM(email_id)) = ? AND status = 1";
  const checkUntitledResult = await query(checkUntitledQuery, [email_id.trim()]);
  const untitled = checkUntitledResult[0];
  
  if (!untitled) {
    return error422("Authentication failed. Contact to admin.", res);
  }

  // Check if the Doctor with the provided mobile no exists and is active
  const checkDoctorQuery = "SELECT * FROM doctor WHERE doctor_id = ? AND status = 1";
  const doctorResult = await query(checkDoctorQuery, [untitled.doctor_id]);
  const doctor = doctorResult[0];
  
  if (!doctor) {
    return error422("Authentication failed.", res);
  }

  try {

    const isPasswordValid = await bcrypt.compare(
      password,
      untitled.extensions
    );

    if (!isPasswordValid) {
      return error422("Password wrong.", res);
    }

    // Generate a JWT token
    const token = jwt.sign(
      {
        doctor_id: untitled.doctor_id,
        email_id: untitled.email_id,
      },
      "secret_this_should_be", // Use environment variable for secret key
      { expiresIn: "1h" }
    );

    const doctorDataQuery = `SELECT d.*, ut.categeory,s.spec_nm FROM  doctor d
    LEFT JOIN untitled ut
    ON ut.doctor_id=d.doctor_id
    LEFT JOIN specialization s
    ON s.spec_id=d.spec_id
    WHERE d.doctor_id=${untitled.doctor_id}`;
    let doctorDataResult = await query(doctorDataQuery)
    return res.status(200).json({
      status: 200,
      message: "Authentication successfully",
      token: token,
      expiresIn: 3600, // 1 hour in seconds,
      data: doctorDataResult[0],
      //role: untitled.role,

    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error,
    });
  }
};
// get Doctor by id...
const getDoctor = async (req, res) => {
    const doctorId = parseInt(req.params.id);
    try {
      const doctorQuery = `SELECT d.*,s.spec_nm FROM doctor d
      LEFT JOIN specialization s
      ON s.spec_id=d.spec_id
      WHERE doctor_id=? `;
      const doctorResult = await query(doctorQuery, [doctorId]);
      if (doctorResult.length === 0) {
        return error422("Doctor Not Found.", res);
      }
      
      const doctor = doctorResult[0];
      return res.status(200).json({
        status: 200,
        message: "Doctor Retrieved Successfully",
        data: doctor,
      });
    } catch (error) {
      return error500(error, res);
    }
  };
  //get Doctors...
const getDoctors = async (req, res) => {
  const { page, perPage, key} = req.query;

  try {
    let getDoctorQuery = `SELECT d.*, s.spec_nm FROM doctor d
    LEFT JOIN specialization s
      ON s.spec_id=d.spec_id
    LEFT JOIN untitled ut 
     on d.doctor_id=ut.doctor_id`;
     
    let countQuery = `SELECT COUNT(*) AS total, s.spec_nm FROM doctor d
    LEFT JOIN specialization s
      ON s.spec_id=d.spec_id
    LEFT JOIN untitled ut 
     on d.doctor_id=ut.doctor_id`;
     
     
    if (key) {
      const lowercaseKey = key.toLowerCase().trim();
      if (lowercaseKey === "activated") {
        getDoctorQuery += ` WHERE d.status = 1`;
        countQuery += ` WHERE d.status = 1`;
      } else if (lowercaseKey === "deactivated") {
        getDoctorQuery += ` WHERE d.status = 0`;
        countQuery += ` WHERE d.status = 0`;
      } else {
        getDoctorQuery += ` WHERE LOWER(d.doctor_name) LIKE '%${lowercaseKey}%'`;
        countQuery += ` WHERE LOWER(d.doctor_name) LIKE '%${lowercaseKey}%'`;
      }
    }

    
    let total = 0;
    // Apply pagination if both page and perPage are provided
    if (page && perPage) {
      const totalResult = await query(countQuery);
      // console.log(totalResult);
      total = parseInt(totalResult[0].total);

      const start = (page - 1) * perPage;
      getDoctorQuery += ` LIMIT ${perPage} OFFSET ${start} `;
    }

    
    const result = await query(getDoctorQuery);
    const devices = result;
    const data = {
      status: 200,
      message: "Doctor retrieved successfully",
      data: devices,
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
// update Doctor
const updateDoctor = async (req, res) => {
  const doctorId = parseInt(req.params.id);
  const doctor_name = req.body.doctor_name ? req.body.doctor_name.trim() : '';
  const organization_name = req.body.organization_name ? req.body.organization_name.trim() : '';
  const spec_id = req.body.spec_id ? req.body.spec_id : '';
  const address1 = req.body.address1 ? req.body.address1.trim() : '';
  const city = req.body.city ? req.body.city.trim() : '';
  const district_id = req.body.district_id ? req.body.district_id : '';
  const state_id = req.body.state_id ? req.body.state_id: '';
  const email_id = req.body.email_id ? req.body.email_id.trim() : '';
  const mobile_no = req.body.mobile_no ? req.body.mobile_no.trim() : '';
  const education = req.body.education ? req.body.education.trim() : '';

    
    if (!doctor_name) {
        return error422("Doctor name name is required", res);
      } else if (!organization_name) {
        return error422("Organization name  is required", res);
      }else if (!spec_id) {
        return error422("Specialization Id  is required", res);
       }else if (!city) {
        return error422("City name  is required", res);
       }else if (!district_id) {
        return error422("District Id is required", res);
      }else if (!state_id) {
        return error422("State Id is required", res);
      }else if (!email_id) {
        return error422("email_id is required", res);
      }else if (!mobile_no) {
        return error422("Mobile number is required", res);
      }else if (!education) {
        return error422("Education is required", res);
      }
    // Check if doctor exists
    const doctorQuery = "SELECT * FROM doctor WHERE doctor_id = ?";
    const doctorResult = await query(doctorQuery, [doctorId]);
    if (doctorResult.length == 0) {
      return error422("Doctor Not Found.", res);
    }

    const isExistEmailIdQuery = 'SELECT * FROM untitled WHERE email_id = ? AND doctor_id!=?'
    const isExistEmailIdResult = await query(isExistEmailIdQuery, [email_id, doctorId]);
    if (isExistEmailIdResult.length > 0) {
      return error422('Email Id already exists.', res);
    }
  
    const isExistEmailIdDoctorQuery = 'SELECT * FROM client WHERE email_id = ? AND doctor_id!=?'
    const isExistEmailIdDoctorResult = await query(isExistEmailIdDoctorQuery, [email_id, doctorId]);
    if (isExistEmailIdDoctorResult.length > 0) {
      return error422('Email Id already exists.', res);
    }
  
    try {
      // Start a transaction
      await query("BEGIN");
      const nowDate = new Date().toISOString().split('T')[0];
  
      // Update the doctor record with new data
      const updateQuery = `UPDATE doctor SET doctor_name = ?, organization_name = ?,spec_id=?,address1=?,city=?,district_id=?,state_id=?,email_id=?,mobile_no=?,education=?, modified_at=?
           WHERE doctor_id = ? `;
      const updateResult = await query(updateQuery, [doctor_name,organization_name,spec_id,address1,city,district_id,state_id,email_id,mobile_no,education,nowDate,doctorId]);
  
      const updateUntitledQuery="UPDATE untitled SET email_id = ? WHERE doctor_id =?";
      await query(updateUntitledQuery, [email_id, doctorId]);
      
      await query("COMMIT");

      return res.status(200).json({
        status: 200,
        message: "Doctor updated successfully.",
      });
    } catch (error) {
      return error500(error, res);
    }
 };
 //status change of doctor ...
const onStatusChange = async (req, res) => {
  const doctorId = parseInt(req.params.id);
  const status = parseInt(req.query.status); // Validate and parse the status parameter
  try {
    // Check if the doctor exists
    const doctorQuery = "SELECT * FROM doctor WHERE doctor_id = ?";
    const doctorResult = await query(doctorQuery, [doctorId]);
    if (doctorResult.length == 0) {
      return res.status(404).json({
        status: 404,
        message: "doctor not found.",
      });
    }

    // Validate the status parameter
    if (status !== 0 && status !== 1) {
      return res.status(400).json({
        status: 400,
        message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
      });
    }

    // Soft update the doctor status
    const updateQuery = `UPDATE doctor SET status = ? WHERE doctor_id = ?`;
    await query(updateQuery, [status, doctorId]);

    const statusMessage = status === 1 ? "activated" : "deactivated";

    return res.status(200).json({
      status: 200,
      message: `doctor ${statusMessage} successfully.`,
    });
  } catch (error) {
    return error500(error, res);
  }
};
//get doctor list...
const getDoctorList = async (req, res) => {
  let doctorQuery = "SELECT * FROM doctor WHERE status=1 ORDER BY doctor_name asc";
  try {
    const doctorResult = await query(doctorQuery);
    const doctors = doctorResult;
    return res.status(200).json({
      status: 200,
      message: "Doctors Retrieved Successfully.",
      data: doctors
    });
  } catch (error) {
    return error500(error, res);
  }
}
//get doctors by specialization list
const getDoctorsBySpecializationId=async (req,res)=>{
  const specializations = req.body.specializations ? req.body.specializations: [];
  
if (!specializations) {
    return error422("Specialization is required", res);
  }
  let specializationArray=specializations;
  let doctorArray=[];
  for (let i = 0; i< specializationArray.length; i++) {
    const element = specializationArray[i];
    console.log(element.spec_id);
 console.log('first for loop start index',i);
    let query2=`SELECT * FROM doctor WHERE spec_id=${element.spec_id}`;
     result = await query(query2);
     console.log(result);
     console.log('first for loop end index',i);

     for (let index1 = 0; index1 < result.length; index1++) {
       const element1 = result[index1];
       console.log(element1);
       doctorArray.push(element1)
     }
  }
  
  
  return res.status(200).json({
    status:200,
    message:"message",
    data:doctorArray
  })
};
  
module.exports={
    createDoctor,
    getDoctor,
    doctorLogin,
    getDoctors,
    updateDoctor,
    onStatusChange,
    getDoctorList,
    getDoctorsBySpecializationId
    
}
