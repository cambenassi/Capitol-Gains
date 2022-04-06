//hosting requires
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

//mongodb requires, get date for database name, connect
const mongo = require('./mongo.js');
const Trade = require('./schemas/blog.js');
const userSchema = require('./schemas/user-schema');

mongo.connectToDB().catch(console.error);

// start server hosting 
const app = express();
const port = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(port);

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'client/build')));
    
  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

