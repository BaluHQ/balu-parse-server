/*
 * A simple working function, that calls the DB, to be used to test that the parse server can run the cloud code
 * @request: input, request.params can be used to pass data into the function
 * @response: output, response.success(message) and response.error(message);
 */
Parse.Cloud.define('testCloudCode', function(request, response) {

    var jobName = 'testCloudCode';

    var JobLog = Parse.Object.extend('JobLog');
    var jobLog = new JobLog();
    jobLog.set('jobName',jobName);
    var acl = new Parse.ACL();
    acl.setRoleReadAccess("Analytics",true);
    jobLog.setACL(acl);

    jobLog.set('message','Cloud code operating correctly');

    jobLog.save({useMasterKey: true}).then(
        function(){
            console.log(jobName + ': jobLog.save executed successfully: confirm a new record has been added to jobLog class');
            response.success(jobName + ': jobLog.save executed successfully: confirm a new record has been added to jobLog class');
        },
        function(error){
            console.log(jobName + ': jobLog.save not executed successfully');
            response.error(jobName + ': jobLog.save not executed successfully');
        }
    );
});

/*
 * This job runs nightly, pulling all the vote up / down data and all the click-through count data
 * and turning it into a score to assign to each recommendation. (This score is used to sort recs in the sidebar)
 */


Parse.Cloud.define('bulkUpdateRecommendationRatings', function(req, res) {

    var jobName = 'bulkUpdateRecommendationRatings';

    console.log(jobName + ': function started');

    // First, we'll build a query to pull our userRecommendationRatings

    // To do, only pull ratings that have changed since last run.
    var UserRecommendationRating = Parse.Object.extend('UserRecommendationRating');
    userRecommendationRatingQuery = new Parse.Query(UserRecommendationRating);
    userRecommendationRatingQuery.include('recommendation');
    userRecommendationRatingQuery.limit(1000);

    // The test user can vote recs up or down, so let's filter out any such votes from this bulk update
    var userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('email','dev.baluhq@gmail.com');
    userRecommendationRatingQuery.doesNotMatchQuery('user',userQuery);

    console.log(jobName + ': userRecommendationRatingQuery set up complete, sending query to DB');

    userRecommendationRatingQuery.find({useMasterKey: true}).then(
        function(userRecommendationRatings){

            console.log(jobName + ': ' + userRecommendationRatings.length + ' results returned from userRecommendationRatingQuery. Looping through and adding up score for each rec');

            var key;
            var userRecommendationRatingArray = {};

            for(i = 0; i < userRecommendationRatings.length; i++){

                var score;

                key = userRecommendationRatings[i].get('recommendation').id;

                // If we've already incremented the score for this recommendaiton....
                if (userRecommendationRatingArray[key]) {
                    score = userRecommendationRatingArray[key];
                } else {
                    score = 0;
                }

                userRecommendationRatingArray[key] = score + userRecommendationRatings[i].get('ratingScore'); // a -1, 0, or 1
            }

            // Now move on to click counts
            // Clicks by the test user are not logged in the first place, so no need to restrict this time
            var RecommendationClickCount = Parse.Object.extend('RecommendationClickCount');
            var recommendationClickCountQuery = new Parse.Query(RecommendationClickCount);
            recommendationClickCountQuery.include('recommendation');
            recommendationClickCountQuery.limit(1000);

            console.log(jobName + ': recommendationClickCountQuery set up complete, sending query to DB');

            recommendationClickCountQuery.find({useMasterKey: true}).then(
                function(recommendationClickCounts) {

                    console.log(jobName + ': ' + recommendationClickCounts.length + ' results returned from recommendationClickCountQuery. Looping through and adding up score for each rec');

                    // We consider a click to be 1/5th as indicitive of "support" as a rating
                    // To do: integrate purchasing into this score
                    var recommendationClickCountArray = {};
                    for (j = 0; j < recommendationClickCounts.length; j++){
                        key = recommendationClickCounts[j].get('recommendation').id;
                        recommendationClickCountArray[key] = recommendationClickCounts[j].get('clickCount');
                    }

                    // Set up a log object to save at the end
                    var JobLog = Parse.Object.extend('JobLog');
                    var jobLog = new JobLog();
                    jobLog.set('jobName',jobName);
                    var acl = new Parse.ACL();
                    acl.setRoleReadAccess("Analytics",true);
                    jobLog.setACL(acl);

                    var message = '';

                    // With our recRatings and click counts, now
                    // go through the recs and set/update their aggregate scores
                    var Recommendation = Parse.Object.extend('Recommendation');
                    var recommendationQuery = new Parse.Query(Recommendation);
                    var countOfUpdatedRecs = 0;

                    console.log(jobName + ': recommendationQuery set up complete, sending query to DB (each)');

                    recommendationQuery.each(
                        function(recommendation){

                            var ratingScore = 0;
                            var actualClickCounts = 0;
                            key = recommendation.id;

                            // if we have click count and/or ratings for this rec, then increment the ratingScore
                            // For the website / until we get enough click-throughs, also store the actual number
                            if(recommendationClickCountArray[key]) {
                                ratingScore += recommendationClickCountArray[key] / 5;
                                actualClickCounts += recommendationClickCountArray[key];
                            }
                            if(userRecommendationRatingArray[key]) {
                                ratingScore += userRecommendationRatingArray[key];
                            }

                            if(recommendation.get('ratingScore') != ratingScore){
                                countOfUpdatedRecs = countOfUpdatedRecs + 1;
                            }
                            // set it, log it (optional), save it. Logs appear in parse console cloud code log
                            recommendation.set('ratingScore',Math.round(ratingScore)); // round to make sorting easier later
                            recommendation.set('clickCountSum',actualClickCounts);
                            console.log(jobName + ': set rec ' + key + '\'s ratingScore to ' + ratingScore);
                            recommendation.save(null, {useMasterKey: true});
                        }, {useMasterKey: true}
                    ).then(
                        function() {

                            console.log(jobName + ': job completd successfully, saving log');

                            message = 'Job completed successfully, having updated the ratingScores of ' + countOfUpdatedRecs + ' recommendations.';
                            jobLog.set('message',message);
                            jobLog.save({useMasterKey: true}).then(
                                function(){
                                    console.log(jobName + ': log saved successfully: ' + message);
                                    status.success('cloud.bulkUpdateRecommendationRatings: ' + message);
                                },
                                function(object,error2){
                                    message = 'Job completed successfully, having updated the ratingScores of ' + countOfUpdatedRecs + ' recommendations. But log failed to save. Parse log error: ' + error2.message;
                                    console.log(jobName + ': log saved unsuccessfully: ' + message);
                                    status.success('cloud.bulkUpdateRecommendationRatings: ' + message);
                                }
                            );
                        },
                        function(error) {
                            message = 'Job failed to complete. Error: ' + error.message;

                            console.log(jobName + ': job did not complete successfully: ' + message);

                            jobLog.set('message',message);
                            jobLog.save({useMasterKey: true}).then(
                                function(){
                                    console.log(jobName + ': log saved successfully: ' + message);
                                    status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                                },
                                function(object,error2){
                                    message = 'Job failed to complete AND log failed. Original job error: ' + error.message + ' || ' + 'Parse log error: ' + error2.message;
                                    console.log(jobName + ': log saved unsuccessfully: ' + message);
                                    status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                                }
                            );
                        }
                    );
                },
                function(error){
                    message = 'Job failed to complete. Error: ' + error.message;

                    console.log(jobName + ': job did not complete successfully: ' + message);

                    jobLog.set('message',message);
                    jobLog.save({useMasterKey: true}).then(
                        function(){
                            console.log(jobName + ': log saved successfully: ' + message);
                            status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                        },
                        function(object,error2){
                            message = 'Job failed to complete AND log failed. Original job error: ' + error.message + ' || ' + 'Parse log error: ' + error2.message;
                            console.log(jobName + ': log saved unsuccessfully: ' + message);
                            status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                        }
                    );
                }
            );
        },
        function(error){
            message = 'Job failed to complete. Error: ' + error.message;

            console.log(jobName + ': job did not complete successfully: ' + message);

            jobLog.set('message',message);
            jobLog.save({useMasterKey: true}).then(
                function(){
                    console.log(jobName + ': log saved successfully: ' + message);
                    status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                },
                function(object,error2){
                    message = 'Job failed to complete AND log failed. Original job error: ' + error.message + ' || ' + 'Parse log error: ' + error2.message;
                    console.log(jobName + ': log saved unsuccessfully: ' + message);
                    status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                }
            );
        }
    );
});

Parse.Cloud.beforeSave("SearchProduct", function(request, response) {

    var SearchCategory = Parse.Object.extend('SearchCategory');
    searchCategoryQuery = new Parse.Query(SearchCategory);
    searchCategoryQuery.get(request.object.get('searchCategories').id, {
        useMasterKey: true,
        success: function(searchCategory){
            request.object.set(
                "searchCategory_sort",
                searchCategory.get('categoryName').toLowerCase());

            var ProductGroup = Parse.Object.extend('ProductGroup');
            productGroupQuery = new Parse.Query(ProductGroup);
            productGroupQuery.get(request.object.get('productGroups').id, {
                useMasterKey: true,
                success: function(productGroup){

                    // Add the product group name to the searchProduct class for sorting
                    request.object.set(
                        "productGroup_sort",
                        productGroup.get('productGroupName').toLowerCase());

                    // Lower case the product name and brand
                    request.object.set(
                        "productName_LC",
                        request.object.get("productName").toLowerCase());
                    request.object.set(
                        "brand_LC",
                        request.object.get("brand").toLowerCase());

                    // Lower case all the search terms
                    request.object.set(
                        "searchTerm1_LC",
                        request.object.get("searchTerm1").toLowerCase());
                    request.object.set(
                        "searchTerm2_LC",
                        request.object.get("searchTerm2").toLowerCase());
                    request.object.set(
                        "searchTerm3_LC",
                        request.object.get("searchTerm3").toLowerCase());
                    request.object.set(
                        "searchTerm4_LC",
                        request.object.get("searchTerm4").toLowerCase());
                    request.object.set(
                        "searchTerm5_LC",
                        request.object.get("searchTerm5").toLowerCase());
                    request.object.set(
                        "searchTerm6_LC",
                        request.object.get("searchTerm6").toLowerCase());
                    request.object.set(
                        "searchTerm7_LC",
                        request.object.get("searchTerm7").toLowerCase());
                    request.object.set(
                        "negativeSearchTerm1_LC",
                        request.object.get("negativeSearchTerm1").toLowerCase());
                    request.object.set(
                        "negativeSearchTerm2_LC",
                        request.object.get("negativeSearchTerm2").toLowerCase());
                    request.object.set(
                        "negativeSearchTerm3_LC",
                        request.object.get("negativeSearchTerm3").toLowerCase());
                    request.object.set(
                        "negativeSearchTerm4_LC",
                        request.object.get("negativeSearchTerm4").toLowerCase());

                    // lower case the sex
                    request.object.set(
                        "sex_LC",
                        request.object.get("sex").toLowerCase());

/*
                    // Remove any undefineds
                    if(!request.object.get("searchTerm1")) {
                        request.object.set("searchTerm1", '');
                    }
                    if(!request.object.get("searchTerm2")) {
                        request.object.set("searchTerm2", '');
                    }
                    if(!request.object.get("searchTerm3")) {
                        request.object.set("searchTerm3", '');
                    }
                    if(!request.object.get("searchTerm4")) {
                        request.object.set("searchTerm4", '');
                    }
                    if(!request.object.get("searchTerm5")) {
                        request.object.set("searchTerm5", '');
                    }
                    if(!request.object.get("searchTerm6")) {
                        request.object.set("searchTerm6", '');
                    }
                    if(!request.object.get("searchTerm7")) {
                        request.object.set("searchTerm7", '');
                    }
                    if(!request.object.get("negativeSearchTerm1")) {
                        request.object.set("negativeSearchTerm1", '');
                    }
                    if(!request.object.get("negativeSearchTerm2")) {
                        request.object.set("negativeSearchTerm2", '');
                    }
                    if(!request.object.get("negativeSearchTerm3")) {
                        request.object.set("negativeSearchTerm3", '');
                    }
                    if(!request.object.get("negativeSearchTerm4")) {
                        request.object.set("negativeSearchTerm4", '');
                    }
                    if(!request.object.get("sex")) {
                        request.object.set("sex", '');
                    }
                    if(!request.object.get("searchTerm1_LC")) {
                        request.object.set("searchTerm1_LC", '');
                    }
                    if(!request.object.get("searchTerm2_LC")) {
                        request.object.set("searchTerm2_LC", '');
                    }
                    if(!request.object.get("searchTerm3_LC")) {
                        request.object.set("searchTerm3_LC", '');
                    }
                    if(!request.object.get("searchTerm4_LC")) {
                        request.object.set("searchTerm4_LC", '');
                    }
                    if(!request.object.get("searchTerm5_LC")) {
                        request.object.set("searchTerm5_LC", '');
                    }
                    if(!request.object.get("searchTerm6_LC")) {
                        request.object.set("searchTerm6_LC", '');
                    }
                    if(!request.object.get("searchTerm7_LC")) {
                        request.object.set("searchTerm7_LC", '');
                    }
                    if(!request.object.get("negativeSearchTerm1_LC")) {
                        request.object.set("negativeSearchTerm1_LC", '');
                    }
                    if(!request.object.get("negativeSearchTerm2_LC")) {
                        request.object.set("negativeSearchTerm2_LC", '');
                    }
                    if(!request.object.get("negativeSearchTerm3_LC")) {
                        request.object.set("negativeSearchTerm3_LC", '');
                    }
                    if(!request.object.get("negativeSearchTerm4_LC")) {
                        request.object.set("negativeSearchTerm4_LC", '');
                    }
                    if(!request.object.get("sex_LC")) {
                        request.object.set("sex_LC", '');
                    }
*/
                    response.success();
                },
                error: function(result, error) {
                    console.error("Error: " + error.code + " " + error.message);
                }
            });
        },
        error: function(result, error) {
            console.error("Error: " + error.code + " " + error.message);
        }
    });
});

Parse.Cloud.beforeSave("ProductGroup", function(request, response) {

    request.object.set(
        "productGroupName_LC",
        request.object.get('productGroupName').toLowerCase());

    response.success();

});

Parse.Cloud.beforeSave("Website", function(request, response) {

    response.success();

});

Parse.Cloud.beforeSave("EthicalBrand", function(request, response) {

// to do: update the sort version on other tables, and do to this for all other cases too.

    request.object.set(
        "brandName_LC",
        request.object.get('brandName').toLowerCase());

    request.object.set(
        "twitterHandle_LC",
        request.object.get('twitterHandle').toLowerCase());

    request.object.set(
        "brandSpiel_LC",
        request.object.get('brandSpiel').toLowerCase());


    response.success();

});

Parse.Cloud.beforeSave("SearchCategory", function(request, response) {

    request.object.set(
        "categoryName_LC",
        request.object.get('categoryName').toLowerCase());

    response.success();

});


Parse.Cloud.beforeSave("Recommendation", function(request, response) {

    // if there's no HTTP or HTTPS etc on the URL, add HTTP
    // To do: we lower case the first part of the URL. For now I just need to remember to enter them lowercase
    var productURL_LC_HTTP = request.object.get("productURL");
    if (!/^(f|ht)tps?:\/\//i.test(productURL_LC_HTTP)) {
        productURL_LC_HTTP = 'http://' + productURL_LC_HTTP;
    }

    // This isn't the best way to do it, but it's easy:
    // Repeat the code, one for if we have a productGroup pointer in productGroups (product-level recommendations)
    // The other for if we have a searchCategory pointer (website-level recommendations)
    // For recommendations where both apply, it will simply do the update twice for brandName, productName and productURL twice
    if(typeof request.object.get('productGroups') !== 'undefined'){
        var ProductGroup = Parse.Object.extend('ProductGroup');
        productGroupQuery = new Parse.Query(ProductGroup);
        productGroupQuery.get(request.object.get('productGroups').id, {
            useMasterKey: true,
            success: function(productGroup){

                var EthicalBrand = Parse.Object.extend('EthicalBrand');
                ethicalBrandQuery = new Parse.Query(EthicalBrand);
                ethicalBrandQuery.get(request.object.get('ethicalBrand').id, {
                    useMasterKey: true,
                    success: function(ethicalBrand){

                        request.object.set(
                            "productGroup_sort",
                            productGroup.get('productGroupName').toLowerCase());

                        request.object.set(
                            "productName_LC",
                            request.object.get("productName").toLowerCase());

                        request.object.set(
                            "brandName_sort",
                            ethicalBrand.get("brandName").toLowerCase());

                        request.object.set(
                            "productURL",
                            productURL_LC_HTTP);

                        response.success();
                    },
                    error: function(result, error) {
                        console.error("Error: " + error.code + " " + error.message);
                    }
                });
            },
            error: function(result, error) {
                console.error("Error: " + error.code + " " + error.message);
            }
        });
    } // if productGroups not null

    if(typeof request.object.get('searchCategory') !== 'undefined'){
        var SearchCategory = Parse.Object.extend('SearchCategory');
        searchCategoryQuery = new Parse.Query(SearchCategory);
        searchCategoryQuery.get(request.object.get('searchCategory').id, {
            useMasterKey: true,
            success: function(searchCategory){

                var EthicalBrand = Parse.Object.extend('EthicalBrand');
                ethicalBrandQuery = new Parse.Query(EthicalBrand);
                ethicalBrandQuery.get(request.object.get('ethicalBrand').id, {
                    useMasterKey: true,
                    success: function(ethicalBrand){

                        request.object.set(
                            "productName_LC",
                            request.object.get("productName").toLowerCase());

                        request.object.set(
                            "brandName_sort",
                            ethicalBrand.get("brandName").toLowerCase());

                        request.object.set(
                            "productURL",
                            productURL_LC_HTTP);

                        request.object.set(
                            "searchCategory_sort",
                            searchCategory.get('categoryName').toLowerCase());

                        response.success();
                    },
                    error: function(result, error) {
                        console.error("Error: " + error.code + " " + error.message);
                    }
                });
            },
            error: function(result, error) {
                console.error("Error: " + error.code + " " + error.message);
            }
        });
    } // if searchCategory is not null
});


Parse.Cloud.beforeSave("CategoryWebsiteJoin", function(request, response) {
    var departments = request.object.get('departments');
    var departmentsLC = '';
    if(departments) {
        departmentsLC = departments.toLowerCase();
    }
    request.object.set(
        "departments_LC",
        departmentsLC
        );

    var Website = Parse.Object.extend('Website');
    var websiteQuery = new Parse.Query(Website);
    websiteQuery.get(request.object.get('website').id, {
        useMasterKey: true,
        success: function(website){
            request.object.set(
                "websiteURL_sort",
                website.get('websiteURL').toLowerCase());

            var SearchCategory = Parse.Object.extend('SearchCategory');
            searchCategoryQuery = new Parse.Query(SearchCategory);
            searchCategoryQuery.get(request.object.get('searchCategory').id, {
                useMasterKey: true,
                success: function(searchCategory){
                    request.object.set(
                        "categoryName_sort",
                        searchCategory.get('categoryName').toLowerCase());
                    request.object.set(
                        "isWebsiteOnOrOff_sort",
                        website.get('isWebsiteOnOrOff'));
                    response.success();
                },
                error: function(result, error) {
                    console.error("Error: " + error.code + " " + error.message);
                }
            });
        },
        error: function(result, error) {
            console.error("Error: " + error.code + " " + error.message);
        }
    });
});


/*******************
 * For Test System *
 *******************/

// Check if URL is unique

Parse.Cloud.beforeSave('BTS_CE_TestPage', function(request, response) {
    if(request.object.isNew()){
        var BTS_CE_TestPage = Parse.Object.extend('BTS_CE_TestPage');
        var bts_CE_TestPage_query = new Parse.Query(BTS_CE_TestPage);
        bts_CE_TestPage_query.equalTo('url', request.object.get('url'));
        bts_CE_TestPage_query.first({
            success: function(object) {
                if (object) {
                    response.error('A test page with this URL already exists.');
                } else {
                    response.success();
                }
            },
            error: function(error) {
                response.error('Could not validate uniqueness for this test page');
            }
        });
    } else {
        response.success();
    }
});
