// Express application adding the parse-server module to expose Parse compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');

/* Configure this Parse Server */

// Environment variables are managed in Heroku

var api = new ParseServer({
  databaseURI: process.env.DATABASE_URI,
  cloud:       process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js', // The location of the cloud code main.js file
  appId:       process.env.APP_ID, // The unique ID used by the apps' Parse SDK to access this Parse Server
  fileKey:     process.env.FILE_ID, // Used by Parse Server to access files still stored on parse.com
  masterKey:   process.env.MASTER_KEY, // The Parse master key here.
  serverURL:   process.env.SERVER_URL,  // The location to host this Parse Server.
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  },
  verifyUserEmails: true,
  publicServerURL: process.env.PUBLIC_SERVER_URL,
  appName: 'Balu',
  emailAdapter: {
     module: 'parse-server-simple-mailgun-adapter',
     options: {
       fromAddress: 'info@getbalu.org',
       domain: 'getbalu.org',
       apiKey: 'key-64f729379fba12e46c2410f25c4c7f20',
     }
  }
});

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('The Balu Parse Server is up and running, however it does not host any content directly. Try accessing one of the Balu apps instead.');
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('balu-parse-server listening on port ' + port);
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
