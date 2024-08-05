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

  //create appointment
const createAppointment = async (req, res) => {
    const day = req.body.day ? req.body.day.trim() : "";
    const time = req.body.time ? req.body.time.trim() : "";
    const comment = req.body.comment ? req.body.comment.trim() : "";
    const doctor_id = req.companyData.doctor_id;
  
  
    if (!day) {
      return error422("Day  is required", res);
    }else if (!time) {
      return error422("Time is required", res);
    }else if (!comment) {
        return error422("Comment is required", res);
      }else if (!doctor_id) {
        return error422("Doctor Id is required", res);
      }
    //check day already exists in appointment table
    const isExistAppointmentQuery =
      "SELECT * FROM appointment_slots WHERE day = ? && doctor_id";
    const isExistAppointmentResult = await query(isExistAppointmentQuery, [
        day,doctor_id
    ]);
    if (isExistAppointmentResult.length > 0) {
      return error422("Appointment Day already exists.", res);
    }
    try {
      // Start a transaction
      await query("BEGIN");
  
      // Insert medicine details
      const insertAppointmentQuery =
        "INSERT INTO appointment_slots (day, time,comment,doctor_id) VALUES (?,?,?,?)";
      const insertAppointmentValues = [day, time,comment, doctor_id];
      const insertAppointmentResult = await query(
        insertAppointmentQuery,
        insertAppointmentValues
      );
      const slot_id = insertAppointmentResult.insertId;
  
      // Commit the transaction
      await query("COMMIT");
  
      return res.status(200).json({
        status: 200,
        message: "Appointment Day added successfully",
      });
    } catch (error) {
      // Handle errors
      await query("ROLLBACK");
      return error500(error, res);
    }
  };
  // get appointment by id...
const getAppointment = async (req, res) => {
    const doctor_id = req.companyData.doctor_id;
      const slot_id = parseInt(req.params.id);
      try {
        const appointmentQuery = `SELECT * FROM appointment_slots WHERE slot_id=? AND doctor_id=? `;
        const appointmentResult = await query(appointmentQuery, [slot_id,doctor_id]);
        if (appointmentResult.length === 0) {
          return error422("Appointment Slot Not Found.", res);
        }
        
        const appointment = appointmentResult[0];
        return res.status(200).json({
          status: 200,
          message: "Appointment Slot Retrieved Successfully",
          data: appointment,
        });
      } catch (error) {
        return error500(error, res);
      }
    };
    //get appointment list...
const getAppointmentList = async (req, res) => {
    let appointmentQuery = "SELECT * FROM appointment_slots WHERE status=1 ORDER BY created_at asc";
    try {
      const appointmentResult = await query(appointmentQuery);
      const appointments = appointmentResult;
      return res.status(200).json({
        status: 200,
        message: "appointments Retrieved Successfully.",
        data: appointments
      });
    } catch (error) {
      return error500(error, res);
    }
  };
  //status change of appointment ...
const onStatusChange = async (req, res) => {
    const slot_id = parseInt(req.params.id);
    const status = parseInt(req.query.status); // Validate and parse the status parameter
    try {
      // Check if the specialization exists
      const appointmentQuery = "SELECT * FROM appointment_slots WHERE slot_id = ?";
      const appointmentResult = await query(appointmentQuery, [slot_id]);
  
      if (appointmentResult.length == 0) {
        return res.status(404).json({
          status: 404,
          message: "Appointment not found.",
        });
      }
  
      // Validate the status parameter
      if (status !== 0 && status !== 1) {
        return res.status(400).json({
          status: 400,
          message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
        });
      }
  
      // Soft update the appointment status
      const updateQuery = `UPDATE appointment_slots SET status = ? WHERE slot_id = ?`;
      await query(updateQuery, [status, slot_id]);
  
      const statusMessage = status === 1 ? "activated" : "deactivated";
  
      return res.status(200).json({
        status: 200,
        message: `Appointment slot ${statusMessage} successfully.`,
      });
    } catch (error) {
      return error500(error, res);
    }
  };
  //get appointments...
const getAppointments = async (req, res) => {
    const doctor_id = req.companyData.doctor_id;
  
      const { page, perPage, key } = req.query;
      
      try {
        let getAppointmentsQuery = `SELECT a.*, d.doctor_name, d.organization_name FROM appointment_slots a
        LEFT JOIN doctor d
        ON d.doctor_id =a.doctor_id 
        WHERE 1 AND a.doctor_id =${doctor_id }`;
    
        let countQuery = `SELECT COUNT(*) AS total, d.doctor_name, d.organization_name FROM appointment_slots a
        LEFT JOIN doctor d
        ON d.doctor_id=a.doctor_id
        WHERE 1 AND a.doctor_id=${doctor_id}`;
        
        if (key) {
          const lowercaseKey = key.toLowerCase().trim();
          if (lowercaseKey === "activated") {
            getAppointmentsQuery += `  AND a.status=1`;
            countQuery += ` AND  a.status=1`;
          } else if (lowercaseKey === "deactivated") {
            getAppointmentsQuery += ` AND a.status=0`;
            countQuery += ` AND a.status=0`;
          } else {
            getAppointmentsQuery += ` AND LOWER (a.day) LIKE '%${lowercaseKey}%'`;
            countQuery += ` AND LOWER(a.day) LIKE '%${lowercaseKey}%'`;
           
          }
        }
        
        let total = 0;
        // Apply pagination if both page and perPage are provided
        if (page && perPage) {
          const totalResult = await query(countQuery);
          
          total = parseInt(totalResult[0].total);
    
          const start = (page - 1) * perPage;
          getAppointmentsQuery += ` LIMIT ${perPage} OFFSET ${start}`;
        }
        const result = await query(getAppointmentsQuery);
        const data = {
          status: 200,
          message: "Appointment Slots retrieved successfully",
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
     // update specialization
const updateAppointment = async (req, res) => {
    const day = req.body.day ? req.body.day.trim() : "";
    const time = req.body.time ? req.body.time.trim() : "";
    const comment = req.body.comment ? req.body.comment.trim() : "";
  const doctor_id = req.companyData.doctor_id;
  const slot_id = parseInt(req.params.id);
    
    
  if (!day) {
    return error422("Day  is required", res);
  }else if (!time) {
    return error422("Time is required", res);
  }else if (!comment) {
      return error422("Comment is required", res);
    }else if (!doctor_id) {
      return error422("Doctor Id is required", res);
    }

    // Check if appointment slot exists
    const appointmentQuery = "SELECT * FROM appointment_slots WHERE slot_id = ?";
    const appointmentResult = await query(appointmentQuery, [slot_id]);
    if (appointmentResult.length == 0) {
      return error422("Appointment Not Found.", res);
    }
  
    try {
      // Start a transaction
      await query("BEGIN");
      const nowDate = new Date().toISOString().split("T")[0];
  
      // Update the appointment record with new data
      const updateQuery = `UPDATE appointment_slots SET day = ?, time = ?,comment = ?,modified_at=?
           WHERE slot_id = ? `;
      const updateResult = await query(updateQuery, [day,time,comment,nowDate,slot_id]);
  
      await query("COMMIT");
  
      return res.status(200).json({
        status: 200,
        message: "appointment slots updated successfully.",
      });
    } catch (error) {
      return error500(error, res);
    }
};
  module.exports = {
    getAppointments,
    createAppointment,
    getAppointmentList,
    getAppointment,
    onStatusChange,
    updateAppointment
  }