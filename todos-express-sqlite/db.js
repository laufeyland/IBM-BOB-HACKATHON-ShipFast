var sqlite3 = require('sqlite3');
var fs = require('fs');

fs.mkdirSync('./var/db', { recursive: true });

var db = new sqlite3.Database('./var/db/todos.db');

db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS todos ( \
    id INTEGER PRIMARY KEY, \
    title TEXT NOT NULL, \
    completed INTEGER \
  )");
  db.run("CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed)");
});

module.exports = db;
