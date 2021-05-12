const connect = require('@databases/sqlite');
const {sql} = require('@databases/sqlite');
const express = require('express')
const exphbs  = require('express-handlebars');

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
set("The greatest glory in living lies not in never falling, but in rising every time we fall.", "Nelson Mandela")
set("No country can really develop unless its citizens are educated.", "Nelson Mandela")
set("The way to get started is to quit talking and begin doing.", "Walt Disney")
set("Your time is limited, so don't waste it living someone else's life. Don't be trapped by dogma – which is living with the results of other people's thinking.", "Steve Jobs")
set("The only way to do great work is to love what you do.", "Steve Jobs")
set("Your time is limited, so don't waste it living someone else's life", "Steve Jobs")
set("If life were predictable it would cease to be life, and be without flavor.", "Eleanor Roosevelt")
set("Life is what happens when you're busy making other plans.", "John Lennon")
set("The way to get started is to quit talking and begin doing.", "Walt Disney")


async function set(value, author) {
  await prepared;
  await db.query(sql`
    INSERT INTO quotes (id, value, author)
      VALUES (NULL, ${value}, ${author})
    ON CONFLICT (id) DO UPDATE
      SET value=excluded.value AND author=excluded.author;
  `);
}

async function query(query, res){
  res.set("X-SQL-Query", query)
  query = query.split(";")
  query = query.filter(q=>q!="")
  query = query.map(q=>{return db.query(sql(q))});
  let results = await Promise.all(query)
  let empty = []
  return empty.concat(...results)
}

errorJokeId = 0;
let errorsJokes = ["You done messed up my friend", "Stop messing with the gawd dang code", "ERROR DOES NOT COMPUTE"]
let errorTranslation = {
  "21": "This error typically happens if a semi-colon is used to end a command, but there is no command after it"
}

const errorCatcher = function (fn) {
  return function (req, res) {
      Promise.resolve(fn(req, res))
          .catch((e) => {
              console.log(`Error on ${req.originalUrl}: ${e.toString()}`);
              res.json({ msg: errorsJokes[(errorJokeId++)%errorsJokes.length], error: e.toString(), errorno: e.errno, hint: errorTranslation[e.errno] || "Sorry, you're on you're own for this one",  errorurl: req.originalUrl })
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
  let result = await query(`SELECT * FROM quotes`, res)
  res.render("home", {data: result})
})

app.get('/add', errorCatcher(async (req, res) => {
  res.render("add")
}))

app.get('/d/', errorCatcher(async (req, res) => {
  await prepared;
  await query(`DELETE FROM quotes WHERE id=`+req.query.id, res)
  res.render("delete", {id: req.query.id});
}))

app.get('/c/', errorCatcher(async(req, res) => {
  await prepared;

  if (req.query.author == "" || req.query.value == "") {
    throw "author or value is blank"
  }
  let queryS = `INSERT OR REPLACE INTO quotes (id, author, value) VALUES (NULL, "${req.query.author}", "${req.query.value}");`
  console.log(queryS)
  let result = await query(queryS, res)
  res.render("added", req.query)
}));

app.get("/authors", errorCatcher(async (req,res)=>{
    await prepared;
    let result = await query(`SELECT author, count(*) as count FROM quotes GROUP BY author`, res)
    console.log(result)
    res.render("authors", {authors: result})
}))

app.get('/s', errorCatcher(async (req, res) => {
  await prepared;
  let result = await query(`SELECT * FROM quotes WHERE author="${req.query.author}"`, res)
  res.render("search", {data: result});
}))

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})