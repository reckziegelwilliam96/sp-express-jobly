const { BadRequestError } = require("../expressError");

// Helper Fnc: sqlForPartialUpdate
// Help Update functionality in Models
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // Iterate over data into Dict object

  // Object:
  // KEY: jsToSql parameter
  // VALUE: dataToUpdate parameter

  //iterate over data to determine length of array
  const keys = Object.keys(dataToUpdate);

  //Throw error if array length is zero, i.e. no data in submission
  if (keys.length === 0) throw new BadRequestError("No data");

  // KEY: iterate over jsToSql using dataToUpdate => colName with Index
  // Parameters: colName is dataToUpdate Key, idx
  // 
  //    check to see if SqlCol matches updatedCol
  //    if not, give JS colName
  //    colName data is given colIndex
  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );
  // return dict with colName including index and values
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
