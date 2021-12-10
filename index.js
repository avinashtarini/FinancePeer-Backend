const express = require("express");
const cors = require("cors");

const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "userDatabase.db");

let db = null;

const startServerAndDatabase = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    console.log(process.env.PORT);
    app.listen(process.env.PORT || 3000, () => {
      console.log("server Started on 3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

startServerAndDatabase();

app.post("/signup/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const sqlUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const responseQuery = await db.get(sqlUserQuery);
  if (responseQuery === undefined) {
    const maskedPassword = await bcrypt.hash(password, 10);
    const createUser = `INSERT INTO user(username,password,name,gender) VALUES ('${username}','${maskedPassword}','${name}','${gender}');`;
    const dbResponse = await db.run(createUser);
    const newUserId = dbResponse.lastID;
    response.status(200);
    response.send({ success_msg: `USER CREATED WITH USERNAME:${username}` });
  } else {
    response.send(400);
    response.send({ error_msg: "Username Already exists" });
  }
});

//LoginAPI

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const loginQuery = `SELECT * FROM user WHERE username='${username}';`;
  const loginResponse = await db.get(loginQuery);
  if (loginResponse === undefined) {
    response.status(400);
    response.send({ error_msg: "Invalid User" });
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      loginResponse.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.status(200);
      response.send({ jwt_token: jwtToken });
    } else {
      response.status(400);
      response.send({ error_msg: "Invalid Password" });
    }
  }
});

//PostData

app.post("/upload/", async (request, response) => {
  const jsonFIle = request.body;
  let sqlInsertQuery;
  let dbResponse;
  jsonFIle.map(async (eachInput) => {
    sqlInsertQuery = `INSERT INTO user_files(id,title,body) VALUES('${eachInput.id}','${eachInput.title}','${eachInput.body}');`;
    dbResponse = await db.run(sqlInsertQuery);
  });
  response.status(200);
  response.send({ success_msg: "File Uploaded Successfully" });
});

//GetData
app.get("/display/", async (request, response) => {
  const sqlGetQuery = `SELECT * FROM user_files`;
  const afterResponseData = await db.all(sqlGetQuery);
  response.status(200);
  response.send({ uploaded_data: afterResponseData });
});

module.exports = app;
