/*
 * Load JS files
 */
var log = require('./log.js');

/*
 * Global variables
 */
var gvScriptName = 'model';
var gvTestWebsiteURL = 'balutestwebsite.html';

/*  **************
 *  * CLIENT APP *
 *  **************
 *
 *  Functions in this script can be called from the client app via:
 *
 *      Parse.Cloud.run(functionName, parameters, options}
 *
 *  Parse Server will wrap up the "parameters" parameter into a request object and pass it on to the receiving function.
 *  The "options" parameter, on the otherhand, must contain:
 *
 *    - The sessionToken
 *    - A success callback
 *    - An error callback
 *
 *  For example:
 *
 *      Parse.Cloud.run("<functionName>", pvParams, {
 *          sessionToken: <sessionToken>,
 *          success: successCallback, // function(pvResponse){...}
 *          error:   errorCallback,  // function(pvError){...}
 *      );
 *
 *  ******************************
 *  * PARSE SERVER API (main.js) *
 *  ******************************
 *
 *  Calls to Parse.Cloud.run will fire a wrapper function defined in main.js, which must be expressed as...
 *
 *      Parse.Cloud.define("<functionName>", function(req,res){
 *          model.functionName(req.params,res);
 *       });
 *
 *  ... where req is an object built by the Parse Server that looks roughly like this:
 *
 *      {"params":pvParms,
 *       "master":false,
 *       // you only get the user object if you include sessionToken in the options param of Parse.Cloud.run
 *       "user": {"_perishable_token":"<perishableToken>",
 *                "createdAt":"<createdAt>",
 *                "updatedAt":"<updatedAt>",
 *                "username":"<userName", // for Balu, this is the email address
 *                "email":"<emailAddress>",
 *                "joyrideStatus":"<joyrideStatus",
 *                "whoIs":"<whoIs>",
 *                "sessionToken":"<sessionToken>",
 *                "objectId":"<userId>"},
 *       "installationId":"<app id>",
 *       "log":{"appId":"<app id>"},
 *       "headers":{"user-agent":"node-XMLHttpRequest, Parse/js1.9.2 (NodeJS 7.0.0)",
 *                  "accept":"*",
 *                  "content-type":"text/plain",
 *                  "host":"<hostName>",
 *                  "content-length":"226",
 *                  "connection":"close"},
 *       "functionName":"<functionName>"}
 *
 *  main.js does little else other than pull out the req.params to pass through to the backend
 *
 *  *****************************************************
 *  * PARSE SERVER BACKEND (model.js, triggers.js, etc) *
 *  *****************************************************
 *
 *  We define our functions as:
 *
 *      function(pvArgs, pvResponse) {
 *          lvErrorMessage = '';
 *          lvLog = '';
 *          lvArgs = {}
 *          ...
 *      }
 *
 *  Where, as described aboce, the pvArgs is req.params and pvResponse is the res object.
 *
 *  On successfull completion, backend functions should call...
 *
 *      lvArgs.data = <the data object pulled from the database>
 *      lvArgs.log = lvLog;
 *      pvResponse.success(lvArgs)
 *
 *  ...which will fire the success callback defined by the client app in the options object.
 *  Parse Server passes back only one parameter, which is lvArgs
 *
 *  On error, backend functions should call...
 *
 *    lvErrorMessage = "<userFriendlyErrorMessage>";
 *    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + " (" + pvError.message + ")","ERROR");
 *    pvResponse.error(JSON.stringify({message:lvErrorMessage,log:lvLog}));
 *
 *  ...which will fire the error callback defined by the client app in the options object. (Note that
 *  this does NOT terminate execution). Parse Server will then pass back an object with two values, one
 *  for the error code and the other for the error message:
 *
 *      {"code": <errorCode>, "error": <errorMessage>}
 *
 */

module.exports = {

    getUsers: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUsers';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start (pvArgs.user_systemUsers == ' + pvArgs.user_systemUsers + ')','PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        // To do: this is a bit messy, with much more looping than needed, because I haven't sorted the tables correctly so can't pop items from the two datasets as they are matched.

        var userQuery = new Parse.Query(Parse.User);

        if(pvArgs.user_systemUsers === 'EXCLUDE') {
            userQuery.notContainedIn('email',['dev.baluhq@gmail.com','brian.spurling@gmail.com','brian@outlandish.com','gisellecory@gmail.com']);
            userQuery.notContainedIn('whoIs',['TEST']);
        } else if(pvArgs.user_systemUsers === 'ONLY') {
            userQuery.containedIn('email',['dev.baluhq@gmail.com','brian.spurling@gmail.com','brian@outlandish.com','gisellecory@gmail.com']);
            userQuery.containedIn('whoIs',['TEST']);
        } else if(pvArgs.user_systemUsers === 'BOTH') {
            // Do nothing
        }

        userQuery.limit(1000);
        userQuery.descending('createdAt');
        userQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'User.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' Users from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++) {
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        userId: pvData[i].id,
                        email: pvData[i].get('email'),
                        emailVerified: pvData[i].get('emailVerified'),
                        joyrideStatus: pvData[i].get('joyrideStatus'),
                        whoIs: pvData[i].get('whoIs')});
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    }, // function: getUsers

    getCategoryWebsiteJoins: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getCategoryWebsiteJoins';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start','PROCS');

        // to return the data to the callback
        var lvArgs = {rowCount: null, data: []};

        var categoryWebsiteJoinQuery = new Parse.Query(Parse.Object.extend('CategoryWebsiteJoin'));
        categoryWebsiteJoinQuery.include('searchCategory');
        categoryWebsiteJoinQuery.include('website');
        categoryWebsiteJoinQuery.limit(1000);
        categoryWebsiteJoinQuery.ascending('categoryName_sort,websiteURL_sort');
        categoryWebsiteJoinQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'CategoryWebsiteJoin.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' CategoryWebsiteJoins from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        categoryWebsiteJoinId: pvData[i].id,
                        searchCategoryId: pvData[i].get('searchCategory').id,
                        websiteId: pvData[i].get('website').id,
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        departments: pvData[i].get('departments'),
                        searchCategoryName: pvData[i].get('searchCategory').get('categoryName'),
                        searchCategoryShortName: pvData[i].get('searchCategory').get('categoryShortName'),
                        websiteURL: pvData[i].get('website').get('websiteURL'),
                        isWebsiteOnOrOff: pvData[i].get('website').get('isWebsiteOnOrOff'),
                        isWebsiteLevelRec: pvData[i].get('isWebsiteLevelRec')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getEthicalBrands: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getEthicalBrands';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start','PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var ethicalBrandQuery = new Parse.Query(Parse.Object.extend('EthicalBrand'));
        if(pvArgs.archived === 'EXCLUDE') {
            ethicalBrandQuery.notEqualTo('isArchived',true);
        } else if (pvArgs.archived === 'ONLY') {
            ethicalBrandQuery.equalTo('isArchived',true);
        } else if (pvArgs.archived === 'BOTH') {
            // do nothing
        }
        ethicalBrandQuery.limit(1000);
        ethicalBrandQuery.ascending('brandName_LC');
        ethicalBrandQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'EthicalBrand.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' EthicalBrands from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    var lvBaluFavourite = null;
                    if(pvData[i].get('baluFavourite') !== null && typeof(pvData[i].get('baluFavourite')) !== 'undefined'){
                        lvBaluFavourite = pvData[i].get('baluFavourite').toString();
                    }
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        brandId: pvData[i].id,
                        brandName: pvData[i].get('brandName'),
                        homepage: pvData[i].get('homepage'),
                        twitterHandle: pvData[i].get('twitterHandle'),
                        baluFavourite: lvBaluFavourite,
                        brandSpiel: pvData[i].get('brandSpiel'),
                        isArchived: pvData[i].get('isArchived')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getJobLogs: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getJobLogs';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start','PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var jobLogQuery = new Parse.Query(Parse.Object.extend('JobLog'));
        jobLogQuery.limit(1000);
        jobLogQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'JobLog.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' JobLogs from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getLog_Events: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getLog_Events';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var log_EventQuery = new Parse.Query(Parse.Object.extend('Log_Event'));
        //log_EventQuery.include('');
        log_EventQuery.limit(1000);
        //log_EventQuery.ascending('');

        log_EventQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'Log_Event.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' Log_Events from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getProductGroups: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getProductGroups';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var productGroupQuery = new Parse.Query(Parse.Object.extend('ProductGroup'));
        productGroupQuery.limit(1000);
        productGroupQuery.ascending('productGroupName_LC');

        productGroupQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'ProductGroup.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' ProductGroups from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    var lvChristmasBanner = '';
                    if(pvData[i].get('christmasBanner') !== null && typeof(pvData[i].get('christmasBanner')) !== 'undefined'){
                        lvChristmasBanner = pvData[i].get('christmasBanner').toString();
                    }
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        productGroupId: pvData[i].id,
                        productGroupName: pvData[i].get('productGroupName'),
                        christmasBanner: lvChristmasBanner
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getRecommendations: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getRecommendations';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var recommendationQuery = new Parse.Query(Parse.Object.extend('Recommendation'));
        if(pvArgs.archived === 'EXCLUDE') {
            recommendationQuery.notEqualTo('isArchived',true);
        } else if (pvArgs.archived === 'ONLY') {
            recommendationQuery.equalTo('isArchived',true);
        } else if (pvArgs.archived === 'BOTH') {
            // do nothing
        }
        recommendationQuery.include('productGroups'); // should be singular
        recommendationQuery.include('ethicalBrand');
        recommendationQuery.include('searchCategory');
        recommendationQuery.limit(1000);
        recommendationQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'Recommendation.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' Recommendations from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    var lvProductGroupId = null;
                    var lvProductGroupName = null;

                    if(typeof pvData[i].get('productGroups') !== 'undefined' && pvData[i].get('productGroups') !== 'undefined' && pvData[i].get('productGroups') !== null){
                        lvProductGroupId = pvData[i].get('productGroups').id;
                        lvProductGroupName = pvData[i].get('productGroups').get('productGroupName');
                    }
                    var lvSearchCategoryId = null;
                    var lvSearchCategoryName = null;

                    if(typeof pvData[i].get('searchCategory') !== 'undefined' && pvData[i].get('searchCategory') !== 'undefined' && pvData[i].get('searchCategory') !== null){
                        lvSearchCategoryId = pvData[i].get('searchCategory').id;
                        lvSearchCategoryName = pvData[i].get('searchCategory').get('categoryName');
                    }

                    var lvImageURL = "";
                    if(pvData[i].get('image')){
                        lvImageURL = pvData[i].get('image').url();
                    }

                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        recommendationId: pvData[i].id,
                        productName: pvData[i].get('productName'),
                        productURL: pvData[i].get('productURL'),
                        productGroupId: lvProductGroupId,
                        productGroupName: lvProductGroupName,
                        brandId: pvData[i].get('ethicalBrand').id,
                        brandName: pvData[i].get('ethicalBrand').get('brandName'),
                        pageConfirmationSearch: pvData[i].get('pageConfirmationSearch'),
                        searchCategoryId: lvSearchCategoryId,
                        searchCategoryName: lvSearchCategoryName,
                        imageURL: lvImageURL,
                        isArchived: pvData[i].get('isArchived')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getRecommendationClickCounts: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getRecommendationClickCounts';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var recommendationClickCountQuery = new Parse.Query(Parse.Object.extend('RecommendationClickCount'));
        //recommendationClickCountQuery.include('');
        recommendationClickCountQuery.limit(1000);
        //recommendationClickCountQuery.ascending('');

        recommendationClickCountQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'RecommendationClickCount.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' RecommendationClickCounts from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getSearchCategories: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getSearchCategories';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var searchCategoryQuery = new Parse.Query(Parse.Object.extend('SearchCategory'));
        //searchCategoryQuery.include('');
        searchCategoryQuery.limit(1000);
        searchCategoryQuery.ascending('categoryName_LC');

        searchCategoryQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'SearchCategory.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' SearchCategorys from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        searchCategoryId: pvData[i].id,
                        categoryName: pvData[i].get('categoryName'),
                        categoryShortName: pvData[i].get('categoryShortName'),
                        whyDoWeCare: pvData[i].get('whyDoWeCare')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getSearchProducts: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getSearchProducts';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var searchProductQuery = new Parse.Query(Parse.Object.extend('SearchProduct'));
        searchProductQuery.include('productGroups'); // should be singular. Mistake when setting up DB
        searchProductQuery.include('searchCategories'); // should be singular. Mistake when setting up DB

        searchProductQuery.limit(1000);
        searchProductQuery.ascending('productName_LC');
        searchProductQuery.ascending('productGroup_sort');
        searchProductQuery.ascending('searchCategory_sort');

        searchProductQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'SearchProduct.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' SearchProducts from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        searchProductId: pvData[i].id,
                        productGroupId: pvData[i].get('productGroups').id,
                        productGroupName: pvData[i].get('productGroups').get('productGroupName'),
                        searchCategoryId: pvData[i].get('searchCategories').id,
                        searchCategoryName: pvData[i].get('searchCategories').get('categoryName'),
                        productName: pvData[i].get('productName'),
                        brand: pvData[i].get('brand'),
                        andOr: pvData[i].get('andOr'),
                        searchTerm1: pvData[i].get('searchTerm1'),
                        searchTerm2: pvData[i].get('searchTerm2'),
                        searchTerm3: pvData[i].get('searchTerm3'),
                        searchTerm4: pvData[i].get('searchTerm4'),
                        searchTerm5: pvData[i].get('searchTerm5'),
                        searchTerm6: pvData[i].get('searchTerm6'),
                        searchTerm7: pvData[i].get('searchTerm7'),
                        sex: pvData[i].get('sex'),
                        negativeSearchTerm1: pvData[i].get('negativeSearchTerm1'),
                        negativeSearchTerm2: pvData[i].get('negativeSearchTerm2'),
                        negativeSearchTerm3: pvData[i].get('negativeSearchTerm3'),
                        negativeSearchTerm4: pvData[i].get('negativeSearchTerm4'),
                        negativeAndOr: pvData[i].get('negativeAndOr')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getStats_RecClickThroughs: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getStats_RecClickThroughs';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var stats_RecClickThroughQuery = new Parse.Query(Parse.Object.extend('Stats_RecClickThrough'));
        //stats_RecClickThroughQuery.include('');
        stats_RecClickThroughQuery.limit(1000);
        //stats_RecClickThroughQuery.ascending('');

        stats_RecClickThroughQuery.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'Stats_RecClickThrough.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' Stats_RecClickThroughs from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getStats_Recommendations: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getStats_Recommendations';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var stats_RecommendationQuery = new Parse.Query(Parse.Object.extend('Stats_Recommendation'));
        //stats_RecommendationQuery.include('');
        stats_RecommendationQuery.limit(1000);
        //stats_RecommendationQuery.ascending('');

        stats_RecommendationQuery.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'Stats_Recommendation.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' Stats_Recommendations from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserLogs: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserLogs';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        userLog_query = new Parse.Query(Parse.Object.extend('UserLog'));

        userLog_query.include('user');
        userLog_query.limit(1000);
        userLog_query.descending('createdAt');

        var lvEventNameQuery = 'NO FILTER';
        if(typeof(pvArgs.userLog_eventNames) !== 'undefined' && pvArgs.userLog_eventNames !== null) {
            userLog_query.containedIn('eventName', pvArgs.userLog_eventNames);
            lvEventNameQuery = pvArgs.userLog_eventNames;
        }
        userLog_query.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserLog.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserLogs from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    // In case we don't always have a user
                    var lvEmail = null;
                    if (typeof(pvData[i].get('user')) !== 'undefined' && pvData[i].get('user') !== null){
                         lvEmail = pvData[i].get('user').get('email');
                    }
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        email: lvEmail,
                        eventName: pvData[i].get('eventName'),
                        tabURL: pvData[i].get('tabURL')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserLogs_blockBrand: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserLogs_blockBrand';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        userLog_blockBrand_query = new Parse.Query(Parse.Object.extend('UserLog_BlockBrand'));

        userLog_blockBrand_query.include('user');
        userLog_blockBrand_query.limit(1000);
        userLog_blockBrand_query.ascending('user');
        userLog_blockBrand_query.descending('createdAt');
        userLog_blockBrand_query.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserLog_BlockBrand.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserLog_BlockBrands from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    // In case we don't always have a user
                    var lvEmail = null;
                    if (typeof(pvData[i].get('user')) !== 'undefined'){
                         lvEmail = pvData[i].get('user').get('email');
                    }
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        email: lvEmail,
                        reason: pvData[i].get('reason'),
                        eventName: pvData[i].get('eventName'),
                        brandName: pvData[i].get('brandName'),
                        productName: pvData[i].get('productName'),
                        tabURL: pvData[i].get('tabURL')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserLogs_Joyride: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserLogs_Joyride';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var userLog_JoyrideQuery = new Parse.Query(Parse.Object.extend('UserLog_Joyride'));
        //userLog_JoyrideQuery.include('');
        userLog_JoyrideQuery.limit(1000);
        //userLog_JoyrideQuery.ascending('');

        userLog_JoyrideQuery.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserLog_Joyride.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserLog_Joyrides from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserLogs_ManualSearch: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserLogs_ManualSearch';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        userLog_ManualSearch_query = new Parse.Query(Parse.Object.extend('UserLog_ManualSearch'));
        userLog_ManualSearch_query.include('user');

        if(lvArgs.userLogManualSearch_noResults === 'ONLY'){
            userLog_ManualSearch_query.equalTo('eventName','MANUAL_SEARCH_NO_RESULTS');
        } else if(lvArgs.userLogManualSearch_noResults === 'EXCLUDE'){
            userLog_ManualSearch_query.notEqualTo('eventName','MANUAL_SEARCH_NO_RESULTS');
        } else if(lvArgs.userLogManualSearch_noResults === 'BOTH'){
            // Do nothing
        }

        userLog_ManualSearch_query.limit(1000);
        userLog_ManualSearch_query.descending('createdAt');
        userLog_ManualSearch_query.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserLog_ManualSearch.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserLog_ManualSearchs from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    // In case we don't always have a user (some click throughs are anonymous, if done from a manual search without logging in)
                    var lvEmail = null;
                    if (typeof(pvData[i].get('user')) !== 'undefined' && pvData[i].get('user') !== null){
                         lvEmail = pvData[i].get('user').get('email');
                    }
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        email: lvEmail,
                        eventName: pvData[i].get('eventName'),
                        searchTerm: pvData[i].get('searchTerm'),
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserLogs_ManualSearch_Results: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserLogs_ManualSearch_Results';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var userLog_ManualSearch_ResultsQuery = new Parse.Query(Parse.Object.extend('UserLog_ManualSearch_Results'));
        //userLog_ManualSearch_ResultsQuery.include('');
        userLog_ManualSearch_ResultsQuery.limit(1000);
        //userLog_ManualSearch_ResultsQuery.ascending('');

        userLog_ManualSearch_ResultsQuery.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserLog_ManualSearch_Results.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserLog_ManualSearch_Results from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserLogs_RecClickThrough: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserLogs_RecClickThrough';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        userLog_recClickThrough_query = new Parse.Query(Parse.Object.extend('UserLog_RecClickThrough'));

        userLog_recClickThrough_query.include('user');
        userLog_recClickThrough_query.include('recommendation');
        userLog_recClickThrough_query.include('recommendation.ethicalBrand');
        userLog_recClickThrough_query.limit(1000);
        userLog_recClickThrough_query.descending('createdAt');
        userLog_recClickThrough_query.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserLog_RecClickThrough.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserLog_RecClickThrough from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    // In case we don't always have a user (some click throughs are anonymous, if done from a manual search without logging in)
                    var lvEmail = null;
                    if (typeof(pvData[i].get('user')) !== 'undefined'){
                         lvEmail = pvData[i].get('user').get('email');
                    }
                    // We don't always have a recommendation (some have been deleted from the DB, prior to archiving implemented)
                    var lvBrandName = null;
                    if (typeof(pvData[i].get('recommendation')) !== 'undefined'){
                         lvBrandName = pvData[i].get('recommendation').get('ethicalBrand').get('brandName');
                    }
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        email: lvEmail,
                        brandName: lvBrandName,
                        productName: pvData[i].get('recProductName'),
                        tabURL: pvData[i].get('tabURL'),
                        hyperlinkURL: pvData[i].get('hyperlinkURL')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserLogs_Recommendations: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserLogs_Recommendations';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        userLog_recommendations_query = new Parse.Query(Parse.Object.extend('UserLog_Recommendations'));

        userLog_recommendations_query.include('user');
        userLog_recommendations_query.include('recommendation');
        userLog_recommendations_query.limit(1000);
        userLog_recommendations_query.descending('createdAt');
        userLog_recommendations_query.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserLog_Recommendations.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserLog_Recommendations from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    // In case we don't always have a user
                    var lvEmail = null;
                    if (typeof(pvData[i].get('user')) !== 'undefined'){
                         lvEmail = pvData[i].get('user').get('email');
                    }
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        email: lvEmail,
                        twitterHandles: pvData[i].get('twitterHandles'),
                        tabURL: pvData[i].get('tabURL')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserLogs_RecRatings: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserLogs_RecRatings';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var userLog_RecRatingsQuery = new Parse.Query(Parse.Object.extend('UserLog_RecRatings'));
        //userLog_RecRatingsQuery.include('');
        userLog_RecRatingsQuery.limit(1000);
        //userLog_RecRatingsQuery.ascending('');

        userLog_RecRatingsQuery.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserLog_RecRatings.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserLog_RecRatings from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserLogs_Search: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = '';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');


        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var userLog_SearchQuery = new Parse.Query(Parse.Object.extend('UserLog_Search'));
        //userLog_SearchQuery.include('');
        userLog_SearchQuery.limit(1000);
        //userLog_SearchQuery.ascending('');

        userLog_SearchQuery.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserLog_Search.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserLog_Search from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString()
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserLogs_TrackedTabError: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserLogs_TrackedTabError';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var userLog_TrackedTabError_query = new Parse.Query(Parse.Object.extend('UserLog_TrackedTabError'));
        userLog_TrackedTabError_query.include('user');
        userLog_TrackedTabError_query.include('recommendation');

        if(pvArgs.userLogTrackedTabError_processed === 'ONLY') {
            userLog_TrackedTabError_query.equalTo('processed',true);
        } else if (pvArgs.userLogTrackedTabError_processed === 'EXCLUDE') {
            userLog_TrackedTabError_query.notEqualTo('processed',true);
        } else if (pvArgs.userLogTrackedTabError_processed === 'BOTH') {
            // no filter - return everything
        }

        userLog_TrackedTabError_query.limit(1000);
        userLog_TrackedTabError_query.ascending('processed,originalURL');
        userLog_TrackedTabError_query.descending('createdAt');
        userLog_TrackedTabError_query.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserLog_TrackedTabError.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserLog_TrackedTabErrors from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    // In case we don't always have a user
                    var lvEmail = null;
                    if (typeof(pvData[i].get('user')) !== 'undefined'){
                         lvEmail = pvData[i].get('user').get('email');
                    }
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        email: lvEmail,
                        originalURL: pvData[i].get('originalURL'),
                        productName: pvData[i].get('recommendation').get('productName'),
                        pageConfirmationSearch: pvData[i].get('pageConfirmationSearch'),
                        processed: pvData[i].get('processed')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserSubmittedRecs: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserSubmittedRecs';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var userSubmittedRec_query = new Parse.Query(Parse.Object.extend('UserSubmittedRec'));

        userSubmittedRec_query.include('user');
        userSubmittedRec_query.limit(1000);

        if(pvArgs.userSubmittedRec_processed === 'ONLY') {
            userSubmittedRec_query.equalTo('processed',true);
        } else if (pvArgs.userSubmittedRec_processed === 'EXCLUDE') {
            userSubmittedRec_query.notEqualTo('processed',true);
        } else if (pvArgs.userSubmittedRec_processed === 'BOTH') {
            // no filter - return everything
        }

        userSubmittedRec_query.ascending('processed,user');
        userSubmittedRec_query.descending('createdAt');
        userSubmittedRec_query.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserSubmittedRec.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserSubmittedRecs from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    // In case we don't always have a user
                    var lvEmail = null;
                    if (typeof(pvData[i].get('user')) !== 'undefined'){
                         lvEmail = pvData[i].get('user').get('email');
                    }
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        email: lvEmail,
                        productName: pvData[i].get('productName'),
                        URLOrTwitter: pvData[i].get('URLOrTwitter'),
                        why: pvData[i].get('why'),
                        processed: pvData[i].get('processed')
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getUserSubmittedWebsiteRecs: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getUserSubmittedWebsiteRecs';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start', 'PROCS');

        var lvArgs = {rowCount: null, data: []}; // to return the data to the callback

        var userSubmittedWebsiteRec_query = new Parse.Query(Parse.Object.extend('UserSubmittedWebsiteRec'));
        userSubmittedWebsiteRec_query.include('user');
        userSubmittedWebsiteRec_query.limit(1000);
        userSubmittedWebsiteRec_query.ascending('processed,user');
        userSubmittedWebsiteRec_query.descending('createdAt');

        if(pvArgs.userSubmittedWebsiteRec_processed === 'ONLY') {
            userSubmittedWebsiteRec_query.equalTo('processed',true);
        } else if (pvArgs.userSubmittedWebsiteRec_processed === 'EXCLUDE') {
            userSubmittedWebsiteRec_query.notEqualTo('processed',true);
        } else if (pvArgs.userSubmittedWebsiteRec_processed === 'BOTH') {
            // no filter - return everything
        }

        userSubmittedWebsiteRec_query.find({
            sessionToken: pvArgs.sessionToken,
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'UserSubmittedWebsiteRec.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' UserSubmittedWebsiteRecs from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    // In case we don't always have a user
                    var lvEmail = null;
                    if (typeof(pvData[i].get('user')) !== 'undefined'){
                         lvEmail = pvData[i].get('user').get('email');
                    }
                    lvArgs.data.push({
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        email: lvEmail,
                        websiteRec: pvData[i].get('websiteRec'),
                    });
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function(pvError) {
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    getWebsites: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'getWebsites';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start','PROCS');

        // to return the data to the callback
        var lvArgs = {rowCount: null, data: []};

        var websiteQuery = new Parse.Query(Parse.Object.extend('Website'));
        //websiteQuery.include('');
        websiteQuery.limit(1000);
        websiteQuery.notEqualTo('websiteURL',gvTestWebsiteURL);
        websiteQuery.ascending('websiteURL');

        websiteQuery.find({
            success: function(pvData){
                if(pvData.length >= 1000) {
                    lvErrorMessage = 'Website.find() is exceeding Parse Server row limit. Code needs upgrading otherwise data will be ignored!';
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage,'ERROR');
                    //pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
                lvLog += log.log(gvScriptName,lvFunctionName,'retrieved ' + pvData.length + ' Websites from DB',' INFO');
                lvArgs.rowCount = pvData.length;
                for(var i = 0; i < pvData.length; i++){
                    lvArgs.data.push({
                        websiteId: pvData[i].id,
                        createdAt: pvData[i].createdAt.toLocaleString(),
                        websiteURL: pvData[i].get('websiteURL'),
                        isWebsiteOnOrOff: pvData[i].get('isWebsiteOnOrOff')});
                }
                lvArgs.log = lvLog;
                pvResponse.success(lvArgs);
            },
            error: function (pvError){
                lvErrorMessage = pvError.message; // should be a user-friendly message
                lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
            }
        });
    },

    /*
     * Save an event to the log
     * Note, this is anonymous (no users)
     */
    addDirectoryLog: function(pvArgs,pvResponse) {
        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'addDirectoryLog';
        var log_event = new (Parse.Object.extend("DirectoryLog"))();
        var lvACL = new Parse.ACL();
        lvACL.setRoleReadAccess("Analytics",true);
        // For the log events that require no bespoke code...
        if(pvArgs.eventName === 'WEB_APP-REC_CLICK_THROUGH' ||
           pvArgs.eventName === 'WEB_APP-BRAND_CLICK_THROUGH' ||
           pvArgs.eventName === 'WEB_APP-BRAND_DETAIL_CLICK' ||
           pvArgs.eventName === 'WEB_APP-SEARCH' ||
           pvArgs.eventName === 'WEB_APP-PAGE_LOAD') {
            log_event.set('eventName',pvArgs.eventName);

            var lvRecommendation_pointer;
            var lvBrand_pointer;
            if(pvArgs !== null) {
                if(pvArgs.recommendationId !== null && typeof pvArgs.recommendationId !== 'undefined'){
                    lvRecommendation_pointer = {__type: "Pointer",className: "Recommendation",objectId: pvArgs.recommendationId};
                }
                if(pvArgs.brandId !== null && typeof pvArgs.brandId !== 'undefined'){
                    lvBrand_pointer = {__type: "Pointer",className: "EthicalBrand",objectId: pvArgs.brandId};
                }

                log_event.set('recommendation',lvRecommendation_pointer);
                log_event.set('ethicalBrand',lvBrand_pointer);
                log_event.set('searchTerm',pvArgs.searchTerm);
                log_event.set('url',pvArgs.url);
            }

            log_event.set('message',pvArgs.message);

            log_event.setACL(lvACL);

            log_event.save({
                success: function(){
                    var lvArgs = {};
                    lvArgs.log = lvLog;
                    pvResponse.success(lvArgs);
                },
                error: function (pvError){
                    var lvErrorMessage = pvError.message; // should be a user-friendly message
                    lvLog += log.log(gvScriptName,lvFunctionName,lvErrorMessage + ' (' + pvError.message + ')','ERROR');
                    pvResponse.error(JSON.stringify({message: lvErrorMessage,log:lvLog}));
                }
            });

        }
    },
};
