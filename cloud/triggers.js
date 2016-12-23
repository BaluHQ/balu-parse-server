/*
 * Load JS files
 */
var log = require('./log.js');

/*
 * Global variables
 */
var gvScriptName = 'triggers';

module.exports = {

    searchProduct_beforeSave: function(pvArgs, pvResponse){

        var SearchCategory = Parse.Object.extend('SearchCategory');
        searchCategoryQuery = new Parse.Query(SearchCategory);
        searchCategoryQuery.get(pvArgs.object.get('searchCategories').id, {
            useMasterKey: true,
            success: function(searchCategory){
                pvArgs.object.set(
                    "searchCategory_sort",
                    searchCategory.get('categoryName').toLowerCase());

                var ProductGroup = Parse.Object.extend('ProductGroup');
                productGroupQuery = new Parse.Query(ProductGroup);
                productGroupQuery.get(pvArgs.object.get('productGroups').id, {
                    useMasterKey: true,
                    success: function(productGroup){

                        // Add the product group name to the searchProduct class for sorting
                        pvArgs.object.set(
                            "productGroup_sort",
                            productGroup.get('productGroupName').toLowerCase());

                        // Lower case the product name and brand
                        pvArgs.object.set(
                            "productName_LC",
                            pvArgs.object.get("productName").toLowerCase());
                        pvArgs.object.set(
                            "brand_LC",
                            pvArgs.object.get("brand").toLowerCase());

                        // Lower case all the search terms
                        pvArgs.object.set(
                            "searchTerm1_LC",
                            pvArgs.object.get("searchTerm1").toLowerCase());
                        pvArgs.object.set(
                            "searchTerm2_LC",
                            pvArgs.object.get("searchTerm2").toLowerCase());
                        pvArgs.object.set(
                            "searchTerm3_LC",
                            pvArgs.object.get("searchTerm3").toLowerCase());
                        pvArgs.object.set(
                            "searchTerm4_LC",
                            pvArgs.object.get("searchTerm4").toLowerCase());
                        pvArgs.object.set(
                            "searchTerm5_LC",
                            pvArgs.object.get("searchTerm5").toLowerCase());
                        pvArgs.object.set(
                            "searchTerm6_LC",
                            pvArgs.object.get("searchTerm6").toLowerCase());
                        pvArgs.object.set(
                            "searchTerm7_LC",
                            pvArgs.object.get("searchTerm7").toLowerCase());
                        pvArgs.object.set(
                            "negativeSearchTerm1_LC",
                            pvArgs.object.get("negativeSearchTerm1").toLowerCase());
                        pvArgs.object.set(
                            "negativeSearchTerm2_LC",
                            pvArgs.object.get("negativeSearchTerm2").toLowerCase());
                        pvArgs.object.set(
                            "negativeSearchTerm3_LC",
                            pvArgs.object.get("negativeSearchTerm3").toLowerCase());
                        pvArgs.object.set(
                            "negativeSearchTerm4_LC",
                            pvArgs.object.get("negativeSearchTerm4").toLowerCase());

                        // lower case the sex
                        pvArgs.object.set(
                            "sex_LC",
                            pvArgs.object.get("sex").toLowerCase());

                        pvResponse.success();
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
    },

    productGroup_beforeSave: function(pvArgs, pvResponse){

        pvArgs.object.set(
            "productGroupName_LC",
            pvArgs.object.get('productGroupName').toLowerCase());

        pvResponse.success();

    },

    website_beforeSave: function(pvArgs, pvResponse){
        pvResponse.success();
    },

    ethicalBrand_beforeSave: function(pvArgs, pvResponse){
    // to do: update the sort version on other tables, and do to this for all other cases too.

        pvArgs.object.set(
            "brandName_LC",
            pvArgs.object.get('brandName').toLowerCase());

        pvArgs.object.set(
            "twitterHandle_LC",
            pvArgs.object.get('twitterHandle').toLowerCase());

        pvArgs.object.set(
            "brandSpiel_LC",
            pvArgs.object.get('brandSpiel').toLowerCase());


        pvResponse.success();

    },

    searchCategory_beforeSave: function(pvArgs, pvResponse){

        pvArgs.object.set(
            "categoryName_LC",
            pvArgs.object.get('categoryName').toLowerCase());

        pvResponse.success();

    },


    recommendation_beforeSave: function(pvArgs, pvResponse){

        // if there's no HTTP or HTTPS etc on the URL, add HTTP
        // To do: we lower case the first part of the URL. For now I just need to remember to enter them lowercase
        var productURL_LC_HTTP = pvArgs.object.get("productURL");
        if (!/^(f|ht)tps?:\/\//i.test(productURL_LC_HTTP)) {
            productURL_LC_HTTP = 'http://' + productURL_LC_HTTP;
        }

        // This isn't the best way to do it, but it's easy:
        // Repeat the code, one for if we have a productGroup pointer in productGroups (product-level recommendations)
        // The other for if we have a searchCategory pointer (website-level recommendations)
        // For recommendations where both apply, it will simply do the update twice for brandName, productName and productURL twice
        if(typeof pvArgs.object.get('productGroups') !== 'undefined' && typeof pvArgs.object.get('productGroups').id !== 'undefined'){
            var ProductGroup = Parse.Object.extend('ProductGroup');
            productGroupQuery = new Parse.Query(ProductGroup);
            productGroupQuery.get(pvArgs.object.get('productGroups').id, {
                useMasterKey: true,
                success: function(productGroup){

                    var EthicalBrand = Parse.Object.extend('EthicalBrand');
                    ethicalBrandQuery = new Parse.Query(EthicalBrand);
                    ethicalBrandQuery.get(pvArgs.object.get('ethicalBrand').id, {
                        useMasterKey: true,
                        success: function(ethicalBrand){

                            pvArgs.object.set(
                                "productGroup_sort",
                                productGroup.get('productGroupName').toLowerCase());

                            pvArgs.object.set(
                                "productName_LC",
                                pvArgs.object.get("productName").toLowerCase());

                            pvArgs.object.set(
                                "brandName_sort",
                                ethicalBrand.get("brandName").toLowerCase());

                            pvArgs.object.set(
                                "productURL",
                                productURL_LC_HTTP);

                            pvResponse.success();
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

        if(typeof pvArgs.object.get('searchCategory') !== 'undefined' && typeof pvArgs.object.get('searchCategory').id !== 'undefined'){
            var SearchCategory = Parse.Object.extend('SearchCategory');
            searchCategoryQuery = new Parse.Query(SearchCategory);
            searchCategoryQuery.get(pvArgs.object.get('searchCategory').id, {
                useMasterKey: true,
                success: function(searchCategory){

                    var EthicalBrand = Parse.Object.extend('EthicalBrand');
                    ethicalBrandQuery = new Parse.Query(EthicalBrand);
                    ethicalBrandQuery.get(pvArgs.object.get('ethicalBrand').id, {
                        useMasterKey: true,
                        success: function(ethicalBrand){

                            pvArgs.object.set(
                                "productName_LC",
                                pvArgs.object.get("productName").toLowerCase());

                            pvArgs.object.set(
                                "brandName_sort",
                                ethicalBrand.get("brandName").toLowerCase());

                            pvArgs.object.set(
                                "productURL",
                                productURL_LC_HTTP);

                            pvArgs.object.set(
                                "searchCategory_sort",
                                searchCategory.get('categoryName').toLowerCase());

                            pvResponse.success();
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
    },


    categoryWebsiteJoin_beforeSave: function(pvArgs, pvResponse){

        var departments = pvArgs.object.get('departments');
        var departmentsLC = '';
        if(departments) {
            departmentsLC = departments.toLowerCase();
        }
        pvArgs.object.set(
            "departments_LC",
            departmentsLC
            );

        var Website = Parse.Object.extend('Website');
        var websiteQuery = new Parse.Query(Website);
        websiteQuery.get(pvArgs.object.get('website').id, {
            useMasterKey: true,
            success: function(website){
                pvArgs.object.set(
                    "websiteURL_sort",
                    website.get('websiteURL').toLowerCase());

                var SearchCategory = Parse.Object.extend('SearchCategory');
                searchCategoryQuery = new Parse.Query(SearchCategory);
                searchCategoryQuery.get(pvArgs.object.get('searchCategory').id, {
                    useMasterKey: true,
                    success: function(searchCategory){
                        pvArgs.object.set(
                            "categoryName_sort",
                            searchCategory.get('categoryName').toLowerCase());
                        pvArgs.object.set(
                            "isWebsiteOnOrOff_sort",
                            website.get('isWebsiteOnOrOff'));
                        pvResponse.success();
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
    },


    /*******************
     * For Test System *
     *******************/

    // Check if URL is unique

    BTS_CE_TestPage_beforeSave: function(pvArgs, pvResponse){

        if(pvArgs.object.isNew()){
            var BTS_CE_TestPage = Parse.Object.extend('BTS_CE_TestPage');
            var bts_CE_TestPage_query = new Parse.Query(BTS_CE_TestPage);
            bts_CE_TestPage_query.equalTo('url', pvArgs.object.get('url'));
            bts_CE_TestPage_query.first({
                success: function(object) {
                    if (object) {
                        pvResponse.error('A test page with this URL already exists.');
                    } else {
                        pvResponse.success();
                    }
                },
                error: function(error) {
                    pvResponse.error('Could not validate uniqueness for this test page');
                }
            });
        } else {
            pvResponse.success();
        }
    }
};
