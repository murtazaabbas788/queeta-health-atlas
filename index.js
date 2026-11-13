'use strict';

// Vercel uses this root entry point to identify the Express app.
require('express');

const app = require('./server/server');

module.exports = app;