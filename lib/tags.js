var sys = require('sys'),
    database = require('./database.js'),
    posts = require('./posts.js')

exports.getAllTags = function(callback) {       
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM post_tags;", function (error, results, fields) {
            if(error) {
                throw "Error getting tags: " + error;
            }
            var tags = {};
            
            for(var i=0; i < results.length; i++) {
                if(tags[results[i].tag] == undefined) {
                    tags[results[i].tag] = 1;
                } else {
                    tags[results[i].tag] += 1;
                }
            };
            
            callback(tags);
        });
    });
}

    
exports.getPostsWithTag = function(tag, callback) {       
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM post_tags WHERE tag='" + escape(tag) + "';", function (error, results, fields) {
            if(error) {
                throw "Error getting post tags: " + error;
            }
            
            var postsArr = new Array();
            var postsToGet = new Array();
            
            for(var i=0; i < results.length; i++) {
                postsToGet.push(results[i].post_id);
            }
            
            function getNextPostData() {
                if(postsToGet.length == 0) {
                    callback(postsArr);
                } else {
                    posts.getPost(postsToGet[0], function(postData){
                        postsToGet.splice(0, 1);
                        postsArr.push(postData);
                        getNextPostData();
                    });
                }
            }
            
            getNextPostData();
        });
    });
}

exports.createTagsForPost = function(post_id, tags, callback) {       
    database.getDatabaseConnection(function (mysql_client) {
        for(var i=0; i < tags.length; i++) {
            mysql_client.query("INSERT INTO post_tags (post_id, tag) VALUES ('" + escape(post_id) + "', '" + escape(tags[i]) + "');");
        }
        setTimeout(function(){
            callback();
        }, 100);
    });
}

exports.deletePostTags = function(post_id, callback) {       
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("DELETE FROM post_tags WHERE post_id='" + escape(post_id) + "';", function (error, results, fields) {
            if(error) {
                throw "Error deleting post's tags: " + error;
            }
            callback();
        });
    });
}