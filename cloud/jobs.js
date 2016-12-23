/*
 * Load JS files
 */
var log = require('./log.js');

/*
 * Global variables
 */
var gvScriptName = 'jobs';

module.exports = {

    /*
     * This job runs nightly, pulling all the vote up / down data and all the click-through count data
     * and turning it into a score to assign to each recommendation. (This score is used to sort recs in the sidebar)
     *
     * to do: could do with a significant refactor, especially to handle the logs. lvLog is now populated, like model.js
     * functions, but with no front-end to pass back to there's no useful output for any of it. Where is status defined?
     * What about pvResponse? 
     */

    bulkUpdateRecommendationRatings: function(pvArgs, pvResponse){

        var lvLog = '';
        var lvErrorMessage = '';
        var lvFunctionName = 'bulkUpdateRecommendationRatings';
        lvLog += log.log(gvScriptName,lvFunctionName,'Start','PROCS');

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

        lvLog += log.log(gvScriptName,lvFunctionName,'userRecommendationRatingQuery set up complete, sending query to DB','DEBUG');

        userRecommendationRatingQuery.find({useMasterKey: true}).then(
            function(userRecommendationRatings){

                lvLog += log.log(gvScriptName,lvFunctionName,userRecommendationRatings.length + ' results returned from userRecommendationRatingQuery. Looping through and adding up score for each rec',' INFO');

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

                lvLog += log.log(gvScriptName,lvFunctionName,'recommendationClickCountQuery set up complete, sending query to DB','DEBUG');

                recommendationClickCountQuery.find({useMasterKey: true}).then(
                    function(recommendationClickCounts) {

                        lvLog += log.log(gvScriptName,lvFunctionName,recommendationClickCounts.length + ' results returned from recommendationClickCountQuery. Looping through and adding up score for each rec',' INFO');

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

                        lvLog += log.log(gvScriptName,lvFunctionName,'recommendationQuery set up complete, sending query to DB (each)','DEBUG');

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

                                lvLog += log.log(gvScriptName,lvFunctionName,'set rec ' + key + '\'s ratingScore to ' + ratingScore,'DEBUG');

                                recommendation.save(null, {useMasterKey: true});
                            }, {useMasterKey: true}
                        ).then(
                            function() {

                                lvLog += log.log(gvScriptName,lvFunctionName,'Job completd successfully, saving to jobLog','PROCS');

                                message = 'Job completed successfully, having updated the ratingScores of ' + countOfUpdatedRecs + ' recommendations.';
                                jobLog.set('message',message);
                                jobLog.save({useMasterKey: true}).then(
                                    function(){
                                        lvLog += log.log(gvScriptName,lvFunctionName,'jobLog saved successfully','DEBUG');
                                        status.success('cloud.bulkUpdateRecommendationRatings: ' + message);
                                    },
                                    function(object,error2){
                                        message = 'Job completed successfully, having updated the ratingScores of ' + countOfUpdatedRecs + ' recommendations. But log failed to save. Parse log error: ' + error2.message;
                                        lvLog += log.log(gvScriptName,lvFunctionName,'jobLog failed to save','DEBUG');
                                        status.success('cloud.bulkUpdateRecommendationRatings: ' + message);
                                    }
                                );
                            },
                            function(error) {
                                message = 'Job failed to complete. Error: ' + error.message;
                                lvLog += log.log(gvScriptName,lvFunctionName,'job did not complete successfully: ' + error.message,'ERROR');

                                jobLog.set('message',message);
                                jobLog.save({useMasterKey: true}).then(
                                    function(){
                                        lvLog += log.log(gvScriptName,lvFunctionName,'jobLog saved successfully','DEBUG');
                                        status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                                    },
                                    function(object,error2){
                                        message = 'Job failed to complete AND log failed. Original job error: ' + error.message + ' || ' + 'Parse log error: ' + error2.message;
                                        lvLog += log.log(gvScriptName,lvFunctionName,'jobLog failed to save','DEBUG');
                                        status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                                    }
                                );
                            }
                        );
                    },
                    function(error){
                        message = 'Job failed to complete. Error: ' + error.message;
                        lvLog += log.log(gvScriptName,lvFunctionName,'job did not complete successfully: ' + error.message,'ERROR');
                        jobLog.set('message',message);
                        jobLog.save({useMasterKey: true}).then(
                            function(){
                                lvLog += log.log(gvScriptName,lvFunctionName,'jobLog saved successfully','DEBUG');
                                status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                            },
                            function(object,error2){
                                message = 'Job failed to complete AND log failed. Original job error: ' + error.message + ' || ' + 'Parse log error: ' + error2.message;
                                lvLog += log.log(gvScriptName,lvFunctionName,'jobLog failed to save','DEBUG');
                                status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                            }
                        );
                    }
                );
            },
            function(error){
                message = 'Job failed to complete. Error: ' + error.message;
                lvLog += log.log(gvScriptName,lvFunctionName,'job did not complete successfully: ' + error.message,'ERROR');
                jobLog.set('message',message);
                jobLog.save({useMasterKey: true}).then(
                    function(){
                        lvLog += log.log(gvScriptName,lvFunctionName,'jobLog saved successfully','DEBUG');
                        status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                    },
                    function(object,error2){
                        message = 'Job failed to complete AND log failed. Original job error: ' + error.message + ' || ' + 'Parse log error: ' + error2.message;
                        lvLog += log.log(gvScriptName,lvFunctionName,'jobLog failed to save','DEBUG');
                        status.error('cloud.bulkUpdateRecommendationRatings: ' + message);
                    }
                );
            }
        );
    }
};
