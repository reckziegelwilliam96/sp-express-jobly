"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** GET / */

describe('GET /jobs', () => {
  test('returns all jobs when no filters are applied', async () => {
    const response = await request(app).get('/jobs');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.jobs)).toBe(true);
    expect(response.body.jobs.length).toBeGreaterThan(0);
  });

  test('filters by job title when title parameter is provided', async () => {
    const response = await request(app).get('/jobs').query({ title: 't' });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.jobs)).toBe(true);
    expect(response.body.jobs.length).toBeGreaterThan(0);
    response.body.jobs.forEach((job) => {
      expect(job.name.toLowerCase()).toContain('t');
    });
  });

  test('filters by minimum salaries when minSalaries parameter is provided', async () => {
    const response = await request(app).get('/jobs').query({ minSalaries: 100 });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.jobs)).toBe(true);
    expect(response.body.jobs.length).toBeGreaterThan(0);
    response.body.jobs.forEach((job) => {
      expect(job.minSalaries).toBeGreaterThanOrEqual(100);
    });
  });

  test('filters by has equity when hasEquity parameter is provided', async () => {
    const response = await request(app).get('/jobs').query({ hasEquity: true });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.jobs)).toBe(true);
    expect(response.body.jobs.length).toBeGreaterThan(0);
    response.body.jobs.forEach((company) => {
      expect(company.hasEquity).toBe(true);
    });
  });

  test('returns a 400 error with an appropriate message when an invalid filter option is provided', async () => {
    const response = await request(app).get('/jobs').query({ foo: 'bar' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid filter option');
  });
});
/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 10000,
    equity: 0.1,
    companyHandle: "new"
  };

  test("admin can create job", async function () {
    const token = jwt.sign({ username: "admin", is_admin: true }, SECRET_KEY);
    const response = await request(app)
      .post("/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        newJob
      });
      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({
        job: {
          newComnewJobpany
        },
      });
    });

    test("non-admin cannot create job", async function () {
      const token = jwt.sign({ username: "user", is_admin: false }, SECRET_KEY);
      const response = await request(app)
        .post("/jobs")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "new",
          salary: 10000,
          equity: 0.1,
          companyHandle: "new"
        });
    
      expect(response.statusCode).toBe(401);
      expect(response.body).toEqual({
        error: { message: "Unauthorized" },
      });
    });

  test("bad request with missing data", async function () {
    const token = jwt.sign({ username: "admin", is_admin: true }, SECRET_KEY);
    const resp = await request(app)
        .post("/jobs")
        .set("authorization", `Bearer ${token}`)
        .send({
          salary: 10000
        });
        
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/companies")
        .set("authorization", `Bearer ${u1Token}`)
        .send({
            title: "new",
            salary: 10000,
            equity: "0.1",
            companyHandle: "new"
        });
        
    expect(resp.statusCode).toEqual(400);
  });
});







/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
              title: "t1",
              salary: 10000,
              equity: 0.1,
              companyHandle: 'c1'
            },
            {
                title: "t2",
                salary: 10000,
                equity: NULL,
                companyHandle: 'c2'
              },
              {
                title: "t3",
                salary: 10000,
                equity: 0.008,
                companyHandle: 'c3'
              },
          ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
        .get("/companies")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /companies/:handle */

describe("GET /jobs/:title", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/t1`);
    expect(resp.body).toEqual({
      company: {
        title: "t1",
        salary: 10000,
        equity: 0.1,
        companyHandle: "c1"
      },
    });
  });


  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /jobs/:title", function () {
  
  test("admin can update company", async function () {
    const token = jwt.sign({ username: "admin", is_admin: true }, SECRET_KEY);

    const resp = await request(app)
    .patch(`/jobs/t1`)
    .send({
      name: "t1-new",
    })
    .set("authorization", `Bearer ${token}`);
    expect(resp.body).toEqual({
      job: {
          title: "t1-new",
          salary: 10000,
          equity: 0.1,
          companyHandle: "c1"
        },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/jobs/t1`)
        .send({
          name: "t1-new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
        .patch(`/jobs/nope`)
        .send({
          title: "new nope",
        })
        .set("authorization", `Bearer ${token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
        .patch(`/jobs/t1`)
        .send({
          title: "t1-new",
        })
        .set("authorization", `Bearer ${token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
        .patch(`/jobs/t1`)
        .send({
          equity: "0.1",
        })
        .set("authorization", `Bearer ${token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /jobs/:title", function () {
  test("works for admin", async function () {
    const token = jwt.sign({ username: "admin", is_admin: true }, SECRET_KEY);
    const resp = await request(app)
        .delete(`/jobs/t1`)
        .set("authorization", `Bearer ${token}`);
    expect(resp.body).toEqual({ deleted: "t1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/jobs/t1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
        .delete(`/jobs/nope`)
        .set("authorization", `Bearer ${token}`);
    expect(resp.statusCode).toEqual(404);
  });
});