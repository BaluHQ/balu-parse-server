/*
 * Load JS files
 */
var log = require('./log.js');

/*
 * Global variables
 */
var gvScriptName = 'misc';

module.exports = {

    getDatabaseURI: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvFunctionName = 'getDatabaseURI';

        // only return the database name, not the whole URI (it contains the username and password!)
        var lvArgs = {databaseURI: process.env.DATABASE_URI.substring(process.env.DATABASE_URI.indexOf('/',11)+1)};

        lvLog += log.log(gvScriptName,lvFunctionName,'DATABASE_URI == ' + lvArgs.databaseURI,' INFO');

        lvArgs.log = lvLog;

        pvResponse.success(lvArgs);
    }
};
