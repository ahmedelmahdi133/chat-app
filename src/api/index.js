const express = require('express');
const serverless = require('serverless-http');

const app = express();
// middlewares & routes تمامًا كما في server.js
// احذف/علّق app.listen

module.exports = serverless(app);   // ← أهم سطر