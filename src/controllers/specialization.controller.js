const pool = require("../../db");
const util = require('util');
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
    error: err
  });
}
//create specialization
const createSpecialization = async (req, res) => {
  const spec_nm = req.body.spec_nm ? req.body.spec_nm.trim() : '';
  const description = req.body.description ? req.body.description.trim() : '';
  const untitled_id =1;
  if (!spec_nm) {
    return error422("Specialization name is required", res);
  } else if (!untitled_id) {
    return error422("Specialization Id is required", res);
  }
  //check specification already exists in specialization
  const isExistSpecializationQuery =
    "SELECT * FROM specialization WHERE spec_nm = ?";
  const isExistSpecializationResult = await query(isExistSpecializationQuery, [spec_nm]);
  if (isExistSpecializationResult.length > 0) {
    return error422("Specialization already exists.", res);
  }
  try {
    // Start a transaction
    await query("BEGIN");
  
    // Insert client details
    const insertspecificationQuery = 'INSERT INTO specialization (spec_nm, description, untitled_id) VALUES (?,?,?)';
    const insertspecificationValues = [spec_nm, description, untitled_id];
    const insertspecificationResult = await query(insertspecificationQuery, insertspecificationValues);
    const specializationId = insertspecificationResult.insertId;

    // Commit the transaction
  await query("COMMIT");

  return res.status(200).json({
    status: 200,
    message: "Specification added successfully",
  });
}catch (error) {
  // Handle errors
  await query("ROLLBACK");
  return error500(error, res)
}
};

// get specification by id...
const getSpecialization = async (req, res) => {
  const specializationId = parseInt(req.params.id);
  try {
    const specializationQuery = `SELECT * FROM specialization WHERE spec_id=? `;
    const specializationResult = await query(specializationQuery, [specializationId]);
    if (specializationResult.length === 0) {
      return error422("specialization Not Found.", res);
    }
    
    const specialization = specializationResult[0];
    return res.status(200).json({
      status: 200,
      message: "specialization Retrieved Successfully",
      data: specialization,
    });
  } catch (error) {
    return error500(error, res);
  }
};
// update specialization
const updateSpecialization = async (req, res) => {
  const specializationId = parseInt(req.params.id);
  const spec_nm = req.body.spec_nm ? req.body.spec_nm.trim() : '';
  const description = req.body.description ? req.body.description.trim() : '';
  const untitled_id =1;
  
  if (!spec_nm) {
    return error422("Specialization name is required", res);
  } else if (!untitled_id) {
    return error422("Specialization Id is required", res);
  } else if (!specializationId) {
    return error422("Specialization id is required", res);
  }
  // Check if test exists
  const specializationQuery = "SELECT * FROM specialization WHERE spec_id = ?";
  const specializationResult = await query(specializationQuery, [specializationId]);
  if (specializationResult.length == 0) {
    return error422("specialization Not Found.", res);
  }

  try {
    // Start a transaction
    await query("BEGIN");

    // Update the specialization record with new data
    const updateQuery = `UPDATE specialization SET spec_nm = ?, description = ?
         WHERE spec_id = ? `;
    const updateResult = await query(updateQuery, [spec_nm,description,specializationId,]);

    await query("COMMIT");

    return res.status(200).json({
      status: 200,
      message: "specialization updated successfully.",
    });
  } catch (error) {
    return error500(error, res);
  }
};
//delete specialization
// const deleteSpecialization = async (req, res) => {
//   const specializationId = parseInt(req.params.id);
  
//   // Check if specialization exists
//   const specializationQuery = "SELECT * FROM specialization WHERE spec_id = ?";
//   const specializationResult = await query(specializationQuery, [specializationId]);
//   if (specializationResult.length == 0) {
//     return error422("specialization Not Found.", res);
//   }
//   try {
//     // Start a transaction
//     await query("BEGIN");
//     const deleteSpecializationQuery = `DELETE FROM specialization WHERE spec_id=? `;
//     const deleteSpecializationResult = await query(deleteSpecializationQuery, [specializationId]);

//     await query("COMMIT");
//     return res.status(200).json({
//       status: 200,
//       message: "Specialization deleted successfully.",
//     });
//   } catch (error) {
//     return error500(error, res);
//   }
// };

//get specializations...
const getSpecializations = async (req, res) => {
  const specializationId = parseInt(req.params.id);
  const { page, perPage, key } = req.query;
  
  try {
    let getSpecializationsQuery = `SELECT * FROM specialization`;

    let countQuery = `SELECT COUNT(*) AS total FROM specialization`;
    if (key) {
      const lowercaseKey = key.toLowerCase().trim();
      if (lowercaseKey === "activated") {
        getSpecializationsQuery += ` WHERE status=1`;
        countQuery += ` WHERE status=1`;
      } else if (lowercaseKey === "deactivated") {
        getSpecializationsQuery += ` WHERE status=0`;
        countQuery += ` WHERE status=0`;
      } else {
        getSpecializationsQuery += ` WHERE LOWER (spec_nm) LIKE '%${lowercaseKey}%'`;
        countQuery += ` WHERE LOWER(spec_nm) LIKE '%${lowercaseKey}%'`;
      }
    }
    let total = 0;
    // Apply pagination if both page and perPage are provided
    if (page && perPage) {
      const totalResult = await query(countQuery);
      
      total = parseInt(totalResult[0].total);

      const start = (page - 1) * perPage;
      getSpecializationsQuery += ` LIMIT ${perPage} OFFSET ${start}`;
    }
    const result = await query(getSpecializationsQuery);
    const data = {
      status: 200,
      message: "Specializations retrieved successfully",
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
//status change of specialization ...
const onStatusChange = async (req, res) => {
  const specializationId = parseInt(req.params.id);
  const status = parseInt(req.query.status); // Validate and parse the status parameter
  try {
    // Check if the specialization exists
    const specializationQuery = "SELECT * FROM specialization WHERE spec_id = ?";
    const specializationResult = await query(specializationQuery, [specializationId]);

    if (specializationResult.length == 0) {
      return res.status(404).json({
        status: 404,
        message: "specialization not found.",
      });
    }

    // Validate the status parameter
    if (status !== 0 && status !== 1) {
      return res.status(400).json({
        status: 400,
        message: "Invalid status value. Status must be 0 (inactive) or 1 (active).",
      });
    }

    // Soft update the Client status
    const updateQuery = `UPDATE specialization SET status = ? WHERE spec_id = ?`;
    await query(updateQuery, [status, specializationId]);

    const statusMessage = status === 1 ? "activated" : "deactivated";

    return res.status(200).json({
      status: 200,
      message: `specialization ${statusMessage} successfully.`,
    });
  } catch (error) {
    return error500(error, res);
  }
};
//get specialization list...
const getSpecializationList = async (req, res) => {
  let specializationQuery = "SELECT * FROM specialization WHERE status=1 ORDER BY spec_nm asc";
  try {
    const specializationResult = await query(specializationQuery);
    const specializations = specializationResult;
    return res.status(200).json({
      status: 200,
      message: "Specialization Retrieved Successfully.",
      data: specializations
    });
  } catch (error) {
    return error500(error, res);
  }
};

module.exports={
  getSpecializations,
  createSpecialization,
  getSpecialization,
  updateSpecialization,
  //deleteSpecialization
  onStatusChange,
  getSpecializationList
};