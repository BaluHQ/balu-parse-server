/*
 * Load JS files
 */
var misc  = require('./misc.js');
var jobs  = require('./jobs.js');
var model = require('./model.js');
var triggers = require('./triggers.js');

/*
 * Global variables
 */
var gvScriptName = 'main';

/*
 * See model.js header for a good overview of how this all works
 */

/********
 * MISC *
 ********/

Parse.Cloud.define('getDatabaseURI', function(req, res) {
    misc.getDatabaseURI(req.params,res);
});

/************************
 * MODEL: Add Functions *
 ************************/

Parse.Cloud.define('addDirectoryLog', function(req, res) {
    model.addDirectoryLog(req.params,res);
});

/************************
 * MODEL: Get Functions *
 ************************/

Parse.Cloud.define('getUsers', function(req, res) {
    model.getUsers(req.params,res);
});

Parse.Cloud.define('getCategoryWebsiteJoins', function(req, res) {
    model.getCategoryWebsiteJoins(req.params,res);
});

Parse.Cloud.define('getEthicalBrands', function(req, res) {
    model.getEthicalBrands(req.params,res);
});

Parse.Cloud.define('getJobLogs', function(req, res) {
    model.getJobLogs(req.params,res);
});

Parse.Cloud.define('getLog_Events', function(req, res) {
    model.getLog_Events(req.params,res);
});

Parse.Cloud.define('getProductGroups', function(req, res) {
    model.getProductGroups(req.params,res);
});

Parse.Cloud.define('getRecommendations', function(req, res) {
    model.getRecommendations(req.params,res);
});

Parse.Cloud.define('getRecommendationClickCounts', function(req, res) {
    model.getRecommendationClickCounts(req.params,res);
});

Parse.Cloud.define('getSearchCategories', function(req, res) {
    model.getSearchCategories(req.params,res);
});

Parse.Cloud.define('getSearchProducts', function(req, res) {
    model.getSearchProducts(req.params,res);
});

Parse.Cloud.define('getStats_RecClickThroughs', function(req, res) {
    model.getStats_RecClickThroughs(req.params,res);
});

Parse.Cloud.define('getStats_Recommendations', function(req, res) {
    model.getStats_Recommendations(req.params,res);
});

Parse.Cloud.define('getUserLogs', function(req, res) {
    model.getUserLogs(req.params,res);
});

Parse.Cloud.define('getUserLogs_blockBrand', function(req, res) {
    model.getUserLogs_blockBrand(req.params,res);
});

Parse.Cloud.define('getUserLogs_Joyride', function(req, res) {
    model.getUserLogs_Joyride(req.params,res);
});

Parse.Cloud.define('getUserLogs_ManualSearch', function(req, res) {
    model.getUserLogs_ManualSearch(req.params,res);
});

Parse.Cloud.define('getUserLogs_ManualSearch_Results', function(req, res) {
    model.getUserLogs_ManualSearch_Results(req.params,res);
});

Parse.Cloud.define('getUserLogs_RecClickThrough', function(req, res) {
    model.getUserLogs_RecClickThrough(req.params,res);
});

Parse.Cloud.define('getUserLogs_Recommendations', function(req, res) {
    model.getUserLogs_Recommendations(req.params,res);
});

Parse.Cloud.define('getUserLogs_RecRatings', function(req, res) {
    model.getUserLogs_RecRatings(req.params,res);
});

Parse.Cloud.define('getUserLogs_Search', function(req, res) {
    model.getUserLogs_Search(req.params,res);
});

Parse.Cloud.define('getUserLogs_TrackedTabError', function(req, res) {
    model.getUserLogs_TrackedTabError(req.params,res);
});

Parse.Cloud.define('getUserSubmittedRecs', function(req, res) {
    model.getUserSubmittedRecs(req.params,res);
});

Parse.Cloud.define('getUserSubmittedWebsiteRecs', function(req, res) {
    model.getUserSubmittedWebsiteRecs(req.params,res);
});

Parse.Cloud.define('getWebsites', function(req, res) {
    model.getWebsites(req.params,res);
});

/*******************
 * Background jobs *
 *******************/

// To do: how do I schedule this to run. Params aren't right - shouldn't pass through req and res like this
Parse.Cloud.define('bulkUpdateRecommendationRatings', function(req, res) {
    jobs.bulkUpdateRecommendationRatings(req,res);
});

/************
 * Triggers *
 ************/

Parse.Cloud.beforeSave("SearchProduct", function(req, res) {
    triggers.searchProduct_beforeSave({object: req.object,user: req.user}, res);
});

Parse.Cloud.beforeSave("ProductGroup", function(req, res) {
    triggers.productGroup_beforeSave({object: req.object,user: req.user}, res);
});

Parse.Cloud.beforeSave("Website", function(req, res) {
    triggers.website_beforeSave({object: req.object,user: req.user}, res);
});

Parse.Cloud.beforeSave("EthicalBrand", function(req, res) {
    triggers.ethicalBrand_beforeSave({object: req.object,user: req.user}, res);
});

Parse.Cloud.beforeSave("SearchCategory", function(req, res) {
    triggers.searchCategory_beforeSave({object: req.object,user: req.user}, res);
});

Parse.Cloud.beforeSave("Recommendation", function(req, res) {
    triggers.recommendation_beforeSave({object: req.object,user: req.user}, res);
});

Parse.Cloud.beforeSave("CategoryWebsiteJoin", function(req, res) {
    triggers.categoryWebsiteJoin_beforeSave({object: req.object,user: req.user}, res);
});

Parse.Cloud.beforeSave('BTS_CE_TestPage', function(req, res) {
    triggers.BTS_CE_TestPage_beforeSave({object: req.object,user: req.user}, res);
});
