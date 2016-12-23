/*****************************************************
 * Description: Logging and error handling functions *
 *****************************************************/

/*
 * Load JS Files
 */

// nothing needed

/*
 * Global variables
 */

var gvAppName = 'balu-parse-server';
var gvScriptName_log = 'log';


/*
 * Logging control -- off by default
 */

var gvLogErrors = true;
var gvLogProcs  = false;
var gvLogRoutes = false;
var gvLogDebugs = false;
var gvLogInfos  = false;
var gvLogInits  = false;
var gvLogLstnrs = false;
var gvLogTemps  = false;

/*
 * Initialise the script
 */
(function initialise(){
    _setLoggingMode();
})();

module.exports = {

    setLoggingMode: _setLoggingMode,

    /*********************
     * Logging Functions *
     *********************/

    /*
     * Outputs a log message to the console and returns it as a string (so it can be passed back to a client app)
     *
     * - Whether the message is output & returned depends on the values set
     *   on the global variables at the top of this script
     * - Calls an internal function that does the work
     */
    log: function log(pvScriptName,pvFunctionName,pvMessage,pvLevel) {
        return l(pvScriptName,pvFunctionName,pvMessage,pvLevel);
    }
};

/*
 * Outputs a log message to the console and returns it as a string (so it can be passed back to a client app)
 *
 * - Whether the message is output and returned depends on the values set
 *   on the global variables at the top of this script
 */
function l(pvScriptName,pvFunctionName,pvMessage,pvLevel){

    // Build up our log text string
    var lvMaxAppNameLength = 22;
    var lvPadding = '                      '.substring(0,lvMaxAppNameLength - gvAppName.length + 1);
    var lvLogText = gvAppName.substring(0,lvMaxAppNameLength) + lvPadding + '| ' + pvLevel + ': ' + pvScriptName + '.' + pvFunctionName + ': ' + pvMessage;
    switch(pvLevel) {

        case 'ERROR':
            if (gvLogErrors) console.log(pvLevel + ': ' + pvScriptName + '.' + pvFunctionName + ': ' + pvMessage);
        break;

        case 'PROCS':
            // Short for "process", these are the ubiquitous logs that
            // track (at the least) the start of every function, as well
            // as other key points
            // On by default
            if (gvLogProcs)  console.log(pvLevel + ': ' + pvScriptName + '.' + pvFunctionName + ': ' + pvMessage);
        break;

        case 'ROUTE':
            // Similar to PROCS, but for the web server routes
            // On by default
            if (gvLogRoutes)  console.log(pvLevel + ': ' + pvScriptName + '.' + pvFunctionName + ': ' + pvMessage);
        break;

        case ' INFO':
            // Additional to PROCS, these don't just track process, they
            // record information as well. Similar to DEBUG.
            // Off by default
            if (gvLogInfos) console.log(pvLevel + ': ' + pvScriptName + '.' + pvFunctionName + ': ' + pvMessage);
        break;

        case 'DEBUG':
            // Useful log points for debugging
            // Off by default
            if (gvLogDebugs) console.log(pvLevel + ': ' + pvScriptName + '.' + pvFunctionName + ': ' + pvMessage);
        break;

        case 'INITS':
            // Rather than putting PROCS in init functions (which always fire
            // and, once the app is working reliably, aren't particularly interesting)
            // Off by default
            if (gvLogInits) console.log(pvLevel + ': ' + pvScriptName + '.' + pvFunctionName + ': ' + pvMessage);
        break;

        case 'LSTNR':
            // Rather than putting PROCS in listeners (which can fire
            // continually in some scenarios), use LSTNR and keep them ...
            // Off by default
            if (gvLogLstnrs) console.log(pvLevel + ': ' + pvScriptName + '.' + pvFunctionName + ': ' + pvMessage);
        break;

        case ' TEMP':
            // What it says on the tin. These should not stay in the code for long
            // On by default
            if (gvLogTemps) console.log(pvLevel + ': ' + pvScriptName + '.' + pvFunctionName + ': ' + pvMessage);
        break;

        default:
            lvLogText = 'UNKNOWN LOG TYPE' + ' >>> ' + lvLogText;
            console.log('UNKNN' + ': ' + pvScriptName + '.' + pvFunctionName + ': ' + pvMessage);
    }
    return '\n' + lvLogText;
}

function _setLoggingMode(){
   if(process.env.DATABASE_URI.includes('tst_balu') || process.env.DATABASE_URI.includes('localhost')) {
       gvLogProcs  = true;
       gvLogRoutes = true;
       gvLogDebugs = true;
       gvLogInfos  = true;
       gvLogInits  = true;
       gvLogLstnrs = true;
       gvLogTemps  = true;
       l('log','_setLoggingMode','balu-parse-server is accessing a test or local DB, so we are setting all logs to on','DEBUG');
   }
}
