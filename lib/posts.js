var sys = require('sys'),
    config = require('./config.js'),
    database = require('./database.js');

exports.closeConnection = function() {
    database.close();
};

exports.recreateConnection = function() {
    database.reconnect();
};

exports.getPosts = function(sincePost, numberOfPosts, callback) {       
    var limitString = "";
    var higherPostLimitString = "";
    
    if(numberOfPosts != 0) {
        limitString = "LIMIT " + numberOfPosts;
    }
    if(sincePost != 0) {
        higherPostLimitString = " WHERE id < " + sincePost;
    }
    
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM posts " + higherPostLimitString + " ORDER BY id DESC " + limitString + " ;", function (error, results, fields) {
            if(error) {
                throw "Error getting posts: " + error;
            }
            mysql_client.query("SELECT * FROM users;", function (error1, results1, fields1) {
                if(error1) {
                    throw "Error getting posts' authors: " + error1;
                }
                mysql_client.query("SELECT * FROM post_tags;", function (error2, results2, fields2) {
                    if(error2) {
                        throw "Error getting posts' tags: " + error2;
                    }
                    var posts = new Array();
                    for (var i=0; i < results.length; i++) {
                        var postInfo = results[i];
                        var authorName = "";
                        
                        for (var j=0; j < results1.length; j++) {
                            if(results1[j].id == postInfo.user_id) {
                                authorName = results1[j].name;
                                break;
                            }
                        }
                        
                        var postTags = new Array();
                        
                        for (var k=0; k < results2.length; k++) {
                            if(results2[k].post_id == postInfo.id) {
                                postTags.push(unescape(results2[k].tag));
                            }
                        }
                        
                        postInfo['user_name'] = authorName;
                        postInfo['tags'] = postTags;
                        posts.push(postInfo);
                    }
                    callback(null, posts);
                });
            });
        });
    });
}

exports.getPost = function(postId, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM posts WHERE id = '" + escape(postId) + "';", function (error, results, fields) {
            if(error) {
                throw "Error getting post: " + error;
            }
            if(results[0] == undefined) {
                callback(results[0]);
            } else {
                mysql_client.query("SELECT * FROM users WHERE id='" + escape(results[0].user_id) + "';", function (error1, results1, fields1) {
                    if(error1) {
                        throw "Error getting post's author: " + error1;
                    }
                    var postInfo = results[0]
                    postInfo['user_name'] = results1[0].name;
                    
                    mysql_client.query("SELECT * FROM post_tags WHERE post_id='" + escape(postId) + "';", function (error2, results2, fields2) {
                        if(error2) {
                             throw "Error getting post's tags: " + error2;
                        }
                        var tags = new Array();
                        for(var i=0; i < results2.length; i++) {
                            tags.push(unescape(results2[i].tag));
                        }
                        
                        postInfo['tags'] = tags;
                        callback(postInfo);
                    });
                    
                });
            }
        });
    });
}

exports.searchForPosts = function(keyWords, callback) {
    var escapedKeyWords = escape(keyWords).replace(/%20/g, "%");
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM posts WHERE title LIKE '%" + escapedKeyWords + "%' || body LIKE '%" + escapedKeyWords + "%';", function (error, results, fields) {
            if(error) {
                throw "Error getting search results: " + error;
            }
            mysql_client.query("SELECT * FROM users;", function (error1, results1, fields1) {
                if(error1) {
                    throw "Error getting posts' authors: " + error1;
                }
                var posts = new Array();
                for (var i=0; i < results.length; i++) {
                    var postInfo = results[i];
                    var authorName = "";
                    
                    for (var j=0; j < results1.length; j++) {
                        if(results1[j].id == postInfo.user_id) {
                            authorName = results1[j].name;
                            break;
                        }
                    }
                    
                    postInfo['user_name'] = authorName;
                    posts.push(postInfo);
                }
                callback(posts);
            });
        });
    });
}

exports.getPostsIds = function(callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT id FROM posts ORDER BY id DESC;", function (error, results, fields) {
            if(error) {
                throw "Error getting posts' ids: " + error;
            }
            callback(results);
        });
    });
}

exports.createPost = function(title, body, userId, createdAt, callback) {
    var queryString;
    if(createdAt == 0) {
        queryString = "INSERT INTO posts (title, body, user_id) VALUES ('" + escape(title) + "', '" + escape(body) + "', " + userId + ");"
    } else {
        queryString = "INSERT INTO posts (title, body, user_id, created_at) VALUES ('" + escape(title) + "', '" + escape(body) + "', " + userId + ", '" + createdAt + "');"
    }
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query(queryString, function (error, results, fields) {
            if(error) {
                throw "Error creating post: " + error;
            }
            callback(results.insertId);
        });
    });
}

exports.updatePost = function(id, title, body, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("UPDATE posts SET title='" + escape(title) + "', body='" + escape(body) + "' WHERE id='" + escape(id) + "';", function (error, results, fields) {
            if(error) {
                throw "Error creating post: " + error;
            }
            callback();
        });
    });
}

exports.destroyPost = function(id, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("DELETE FROM posts WHERE id='" + escape(id) + "';", function (error, results, fields) {
            if(error) {
                throw "Error destroying post: " + error;
            }
            callback();
        });
    });
}

exports.generatePostsXML = function(jsonObject, callback) {
    
    config.getAllBlogConfigKeyValues(function(value) {
        var unescapedXML = '' + 
        '<?xml version="1.0" ?>' + 
        '<rss version="2.0">' + 
        '  <channel>' + 
        '    <title>' + value['blog_name'] + '</title>' + 
        '    <link>' + value['blog_address'] + '</link>' + 
        '    <description>' + value['blog_description'] + '</description>' + 
        '    <image>' + 
        '        <url>http://www.xul.fr/xul-icon.gif</url>' + 
        '        <link>http://www.xul.fr/en/index.php</link>' + 
        '    </image>';
        
        for (var i=0; i < jsonObject.length; i++) {
            var thisObject = jsonObject[i];
            unescapedXML += '' + 
            '<item>' +
            '   <title>' + unescape(thisObject.title) + '</title>' + 
            '   <link>/' + unescape(thisObject.id) + '</link>' + 
            '   <author>' + unescape(thisObject.user_name) + '</author>' +
            '   <pubDate>' + thisObject.created_at + '</pubDate>' + 
            '   <description>' + unescape(thisObject.body) + '</description>' + 
            '</item>';
        }
        
        unescapedXML += '' +
        '</channel>' +
        '</rss>';
        
        callback(unescapedXML);
    });
}