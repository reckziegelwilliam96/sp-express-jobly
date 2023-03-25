"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(options = {}) {
      const { name, minEmployees, maxEmployees } = options;
      
      const validFilters = ['name', 'minEmployees', 'maxEmployees'];
      const invalidFilters = Object.keys(options).filter((filter) => !validFilters.includes(filter));

      if (invalidFilters.length > 0) {
        throw new ExpressError('Invalid filter option', 400);
      }

      if (minEmployees > maxEmployees){
        throw new ExpressError('Employee filter conflict', 400);
      }

      let search = `SELECT handle,
                      name,
                      description,
                      num_employees AS "numEmployees",
                      logo_url AS "logoUrl"
               FROM companies`

      const values = [];

      if (name) {
        search += `WHERE name ILIKE $1`;
        values.push(`%${name}%`)
      }
      

      if (minEmployees) {
        if (values.length === 0) {
          search += `WHERE num_employees >= $1`
        } else {
          search += `AND num_employees >= $${values.length + 1}`;
        }
        values.push(minEmployees);
      }

      if (maxEmployees) {
        if (values.length === 0) {
          search += `WHERE num_employees <= $1`;
        } else {
          search += `AND num_employees >=$${values.length + 1}`;
        }
        values.push(maxEmployees);
      }

      search+= `ORDER BY name`
        
      const companiesRes = await db.query(
            search, values);

      return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT c.handle, c.name, c.description,
                  c.num_employees AS "numEmployees",
                  c.logo_url AS "logoUrl",
                  j.id, j.title, j.salary, j.equity
           FROM companies AS c
           JOIN jobs AS j ON c.handle = j.company_handle
           WHERE c.handle = $1`,
        [handle]);

    const company = companyRes.rows.map(row => {
      return {
        name: row.name,
        description: row.description,
        num_employees: row.numEmployees,
        logo_url: row.logoUrl,
        jobs: {
          id: row.id,
          title: row.title,
          salary: row.salary,
          equity: row.equity
        }
      }
    });

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
