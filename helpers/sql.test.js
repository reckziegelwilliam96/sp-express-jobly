const { sqlForPartialUpdate } = require("./sql")
const { BadRequestError } = require("../expressError");

describe("update models with helper function", function() {
    test("works: generates proper SQL for partial update", function(){
        const dataToUpdate = { firstName: 'Aliya', age: 32};
        const jsToSql = {firstName: 'first_name', age: 'age'};
        const result = sqlForPartialUpdate(dataToUpdate, jsToSql)
        expect(result).toEqual({
            setCols: '"first_name"=$1, "age"=$2',
            values: ['Aliya', 32],
        });
    });

    test("does not work: throw BadRequestError", function(){
        expect(() => {
            sqlForPartialUpdate({}, {});
        }).toThrow(BadRequestError);
    });

    test("works: generates proper SQL without jsToSql", function(){
        const dataToUpdate = { firstName: 'Aliya', age: 32};
        const result = sqlForPartialUpdate(dataToUpdate, {})
        expect(result).toEqual({
            setCols: '"first_name"=$1, "age"=$2',
            values: ['Aliya', 32],
        });
    });
});