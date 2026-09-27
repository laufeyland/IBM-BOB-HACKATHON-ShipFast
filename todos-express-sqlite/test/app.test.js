'use strict';

const assert = require('assert');

/**
 * Smoke tests for todos-express-sqlite.
 * These tests verify the app module loads without errors and the db helper
 * exports a valid sqlite3 Database instance.
 *
 * Run:  npm test
 */

describe('App bootstrap', function () {
  it('should load app.js without throwing', function () {
    assert.doesNotThrow(() => require('../app'));
  });
});

describe('DB module', function () {
  it('should export a sqlite3 Database instance', function () {
    const db = require('../db');
    assert.ok(db, 'db should be truthy');
    assert.strictEqual(typeof db.all, 'function', 'db.all should be a function');
    assert.strictEqual(typeof db.run, 'function', 'db.run should be a function');
  });
});
