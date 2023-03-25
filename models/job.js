"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { id, salary, title, equity, companyHandle }
   *
   * Returns { salary, title, equity, companyHandle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
          `SELECT id
           FROM jobs
           WHERE title = $1`,
        [title]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title} at ${companyHandle}`);

    const result = await db.query(
          `INSERT INTO jobs
           (title, salary, equity, companyHandle)
           VALUES ($1, $2, $3, $4)
           RETURNING title, salary, equity, company_handle AS "companyHandle"`,
        [
          title,
          salary,
          equity,
          companyHandle
        ],
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ title, salary, equity, companyHandle }, ...]
   * */

  static async findAll(options = {}) {
      const { title, minSalary, hasEquity } = options;
      
      const validFilters = ['title', 'minSalary', 'hasEquity'];
      const invalidFilters = Object.keys(options).filter((filter) => !validFilters.includes(filter));

      if (invalidFilters.length > 0) {
        throw new ExpressError('Invalid filter option', 400);
      }


      let search = `SELECT title,
                      salary,
                      equity,
                      company_handle AS "companyHandle"
               FROM jobs`

      const values = [];

      if (title) {
        search += `WHERE title ILIKE $1`;
        values.push(`%${title}%`)
      }
      

      if (minSalary) {
        const index = values.length + 1;
        search += values.length === 0 ? ` WHERE salary >= $${index}` : ` AND salary >= $${index}`;
        values.push(minSalary);
      }
  
      if (hasEquity !== undefined) {
        const operator = hasEquity ? ">" : "=";
        search += values.length === 0 ? ` WHERE equity ${operator} 0` : ` AND equity ${operator} 0`;
      }

      search+= `ORDER BY title`;
        
      const jobRes = await db.query(
            search, values);

      return jobRes.rows;
  }

  /** Given a job title, return data about job.
   *
   * Returns { title, salary, equity, companyHandle }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(title) {
    const jobRes = await db.query(
          `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE title = $1`,
        [title]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {title, salary, equity}
   *
   * Throws NotFoundError if not found.
   */

  static async update(title, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          salary: "salary",
          equity: "equity",
        });
    const titleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE title = ${titleVarIdx} 
                      RETURNING title, 
                                salary, 
                                equity `;
    const result = await db.query(querySql, [...values, title]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(title) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE title = $1
           RETURNING title`,
        [title]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Job;
