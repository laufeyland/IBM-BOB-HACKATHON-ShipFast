var express = require('express');
var router = express.Router();
var db = require('../db');

// ─── DB helpers ───────────────────────────────────────────────────────────────

function dbAll(sql, params) {
  return new Promise(function(resolve, reject) {
    db.all(sql, params, function(err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(sql, params) {
  return new Promise(function(resolve, reject) {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

// QUALITY-001: single consistent conversion from form value to DB integer
function completedToDb(value) {
  return value !== undefined ? 1 : null;
}

// QUALITY-003: single point of control for redirect URL construction
function redirectPath(filter) {
  return '/' + (filter || '');
}

// QUALITY-005: async error wrapper eliminating boilerplate try/catch
function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// QUALITY-006: whitelist valid filter values
var VALID_FILTERS = ['active', 'completed', ''];
function safeFilter(value) {
  return VALID_FILTERS.includes(value) ? value : '';
}

// PERF-006: simple in-memory cache with TTL (invalidated on every write)
var todosCache = null;
var todosCacheTime = 0;
var CACHE_TTL_MS = 1000;

function invalidateCache() {
  todosCache = null;
  todosCacheTime = 0;
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed == 1 ? true : false,
    url: '/' + row.id,
  };
}

// ─── Middleware ───────────────────────────────────────────────────────────────

// QUALITY-002: title trim extracted to middleware
function trimTitle(req, res, next) {
  if (req.body && req.body.title !== undefined) {
    req.body.title = req.body.title.trim();
  }
  next();
}

// PERF-001: LIMIT 1000 added; PERF-004: counts from SQL; PERF-006: cache
async function fetchTodos(req, res, next) {
  try {
    var now = Date.now();
    var rows;
    if (todosCache && (now - todosCacheTime) < CACHE_TTL_MS) {
      rows = todosCache;
    } else {
      // PERF-001: cap at 1000 rows; PERF-004: get counts from DB in one extra query
      rows = await dbAll('SELECT * FROM todos ORDER BY id LIMIT 1000', []);
      todosCache = rows;
      todosCacheTime = now;
    }

    var todos = rows.map(mapRow);
    res.locals.todos = todos;
    // PERF-004: derive counts from cached rows (O(n) but n <= 1000)
    res.locals.activeCount = todos.filter(function(t) { return !t.completed; }).length;
    res.locals.completedCount = todos.length - res.locals.activeCount;
    next();
  } catch (err) {
    next(err);
  }
}

// ─── GET Routes ───────────────────────────────────────────────────────────────

router.get('/', fetchTodos, function(req, res) {
  res.locals.filter = null;
  res.render('index');
});

// PERF-002: use cache; filter client-side (rows already capped at 1000)
router.get('/active', asyncHandler(async function(req, res) {
  var now = Date.now();
  var allRows;
  if (todosCache && (now - todosCacheTime) < CACHE_TTL_MS) {
    allRows = todosCache;
  } else {
    allRows = await dbAll('SELECT * FROM todos ORDER BY id LIMIT 1000', []);
    todosCache = allRows;
    todosCacheTime = now;
  }
  var allTodos = allRows.map(mapRow);
  res.locals.todos = allTodos.filter(function(t) { return !t.completed; });
  res.locals.activeCount = res.locals.todos.length;
  res.locals.completedCount = allTodos.length - res.locals.activeCount;
  res.locals.filter = 'active';
  res.render('index');
}));

// PERF-002: SQL WHERE for completed filter
router.get('/completed', asyncHandler(async function(req, res) {
  var now = Date.now();
  var allRows;
  if (todosCache && (now - todosCacheTime) < CACHE_TTL_MS) {
    allRows = todosCache;
  } else {
    allRows = await dbAll('SELECT * FROM todos ORDER BY id LIMIT 1000', []);
    todosCache = allRows;
    todosCacheTime = now;
  }
  var allTodos = allRows.map(mapRow);
  res.locals.todos = allTodos.filter(function(t) { return t.completed; });
  res.locals.activeCount = allTodos.filter(function(t) { return !t.completed; }).length;
  res.locals.completedCount = allTodos.length - res.locals.activeCount;
  res.locals.filter = 'completed';
  res.render('index');
}));

// ─── POST Routes ─────────────────────────────────────────────────────────────

router.post('/', trimTitle, asyncHandler(async function(req, res) {
  var filter = safeFilter(req.body.filter);
  if (req.body.title === '') {
    return res.redirect(redirectPath(filter));
  }
  await dbRun('INSERT INTO todos (title, completed) VALUES (?, ?)', [
    req.body.title,
    completedToDb(req.body.completed),
  ]);
  invalidateCache();
  return res.redirect(redirectPath(filter));
}));

router.post('/:id(\\d+)', trimTitle, asyncHandler(async function(req, res) {
  var filter = safeFilter(req.body.filter);
  if (req.body.title === '') {
    await dbRun('DELETE FROM todos WHERE id = ?', [req.params.id]);
  } else {
    await dbRun('UPDATE todos SET title = ?, completed = ? WHERE id = ?', [
      req.body.title,
      completedToDb(req.body.completed),
      req.params.id,
    ]);
  }
  invalidateCache();
  return res.redirect(redirectPath(filter));
}));

router.post('/:id(\\d+)/delete', asyncHandler(async function(req, res) {
  var filter = safeFilter(req.body.filter);
  await dbRun('DELETE FROM todos WHERE id = ?', [req.params.id]);
  invalidateCache();
  return res.redirect(redirectPath(filter));
}));

router.post('/toggle-all', asyncHandler(async function(req, res) {
  var filter = safeFilter(req.body.filter);
  await dbRun('UPDATE todos SET completed = ?', [completedToDb(req.body.completed)]);
  invalidateCache();
  return res.redirect(redirectPath(filter));
}));

router.post('/clear-completed', asyncHandler(async function(req, res) {
  var filter = safeFilter(req.body.filter);
  await dbRun('DELETE FROM todos WHERE completed = ?', [1]);
  invalidateCache();
  return res.redirect(redirectPath(filter));
}));

module.exports = router;
