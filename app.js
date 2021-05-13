const connect = require('@databases/sqlite');
const {sql} = require('@databases/sqlite');
const express = require('express')
const exphbs  = require('express-handlebars');
const fs = require("fs");

// We don't pass a file name here because we don't want to store
// anything on disk
const db = connect();

async function prepare() {
  await db.query(sql`
    CREATE TABLE quotes (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      value VARCHAR NOT NULL,
      author VARCHAR NOT NULL
    );
  `);
}
const prepared = prepare();

const data = fs.readFileSync('./quotes.txt', {encoding:'utf8', flag:'r'});
data.split("\n").forEach((q)=>{
  if (q == ""){
    return;
  }
  let split = q.split("-");
  set(split[0], split[1]);
})

async function set(value, author) {
  await prepared;
  await db.query(sql`
    INSERT INTO quotes (id, value, author)
      VALUES (NULL, ${value}, ${author})
    ON CONFLICT (id) DO UPDATE
      SET value=excluded.value AND author=excluded.author;
  `);
}

async function query(query, res, log){
  if (log !== false) {
    console.log(`${query}`)
  }
  res.set("X-SQL-Query", (res.get("X-SQL-QUERY")?res.get("X-SQL-QUERY")+";":"") + query)
  query = query.split(";")
  query = query.filter(q=>q!="")
  query = query.map(q=>{return db.query(sql(q))});
  let results = await Promise.all(query)
  let empty = []
  return empty.concat(...results)
}

errorJokeId = 0;
let errorTranslation = {
  "21": "This error typically happens if a semi-colon is used to end a command, but there is no command after it"
}

const errorCatcher = function (fn) {
  return function (req, res) {
      Promise.resolve(fn(req, res))
          .catch((e) => {
              // console.log(`Error on ${req.originalUrl}: ${e.toString()}`);
              res.render("error", { error: e.toString()})
          });
  };
};

const app = express()
var hbs = exphbs.create();
const port = 3000

// Register `hbs.engine` with the Express app.
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.get('/', async (req, res) => {
  await prepared;
  let result = await Promise.all([
      query(`SELECT * FROM quotes WHERE id=1`, res, false),
      query(`SELECT * FROM quotes ORDER BY id DESC LIMIT 1`, res, false),
      query(`SELECT author, count(*) as count FROM quotes GROUP BY author ORDER BY count desc LIMIT 1`, res, false)
  ])
  res.render("home", {old: result[0][0], recent: result[1][0], most: result[2][0]})
})

app.get('/add', errorCatcher(async (req, res) => {
  res.render("add")
}))

app.get('/d/', errorCatcher(async (req, res) => {
  await prepared;
  if (req.query.id < 2){
    throw "Error: The first 2 quotes are protected and can not be deleted, normally at least ;)"
  }
  await query(`DELETE FROM quotes WHERE id=`+req.query.id, res)
  res.render("delete", {id: req.query.id});
}))

app.get('/c/', errorCatcher(async(req, res) => {
  await prepared;

  if (req.query.author == "" || req.query.value == "") {
    throw "author or value is blank"
  }
  let queryS = `INSERT OR REPLACE INTO quotes (id, author, value) VALUES (NULL, "${req.query.author}", "${req.query.value}");`
  let result = await query(queryS, res)
  res.render("added", req.query)
}));

app.get("/authors", errorCatcher(async (req,res)=>{
    await prepared;
    let result = await query(`SELECT author, count(*) as count FROM quotes GROUP BY author ORDER BY author asc`, res)
    res.render("authors", {authors: result})
}))

app.get('/s', errorCatcher(async (req, res) => {
  await prepared;
  let result = await query(`SELECT * FROM quotes WHERE author="${req.query.author}"`, res)
  res.render("search", {data: result});
}))

app.listen(port, () => {})