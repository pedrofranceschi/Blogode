var sys = require('sys'),
    config = require('./config.js'),
    database = require('./database.js');

exports.getPages = function(callback) {    
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM pages;", function (error, results, fields) {
            if(error) {
                throw "Error getting pages: " + error;
            }
            console.log('results: ' + sys.inspect(results));
            mysql_client.query("SELECT * FROM users;", function (error1, results1, fields1) {
                if(error1) {
                    throw "Error getting pages' authors: " + error1;
                }
                var pages = new Array();
                for (var i=0; i < results.length; i++) {
                    var pageInfo = results[i];
                    var authorName = "";
                    
                    for (var j=0; j < results1.length; j++) {
                        if(results1[j].id == pageInfo.user_id) {
                            authorName = results1[j].name;
                            break;
                        }
                    }
                    
                    pageInfo['user_name'] = authorName;
                    pages.push(pageInfo);
                }
                callback(pages);
            });
        });
    });
}

exports.getPage = function(pageId, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM pages WHERE id = '" + escape(pageId) + "';", function (error, results, fields) {
            if(error) {
                throw "Error getting page: " + error;
            }
            if(results[0] == undefined) {
                callback(results[0]);
            } else {
                mysql_client.query("SELECT * FROM users WHERE id='" + escape(results[0].user_id) + "';", function (error1, results1, fields1) {
                    if(error1) {
                        throw "Error getting page's author: " + error1;
                    }
                    var pageInfo = results[0]
                    pageInfo['user_name'] = results1[0].name;
                    callback(pageInfo);
                });
            }
        });
    });
}

exports.createPage = function(title, body, userId, createdAt, callback) {
    var queryString;
    if(createdAt == 0) {
        queryString = "INSERT INTO pages (title, body, user_id) VALUES ('" + escape(title) + "', '" + escape(body) + "', " + userId + ");"
    } else {
        queryString = "INSERT INTO pages (title, body, user_id, created_at) VALUES ('" + escape(title) + "', '" + escape(body) + "', " + userId + ", '" + createdAt + "');"
    }
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query(queryString, function (error, results, fields) {
            if(error) {
                console.log(queryString);
                throw "Error creating page: " + error;
            }
            callback(results.insertId);
        });
    });
}

exports.updatePage = function(id, title, body, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("UPDATE pages SET title='" + escape(title) + "', body='" + escape(body) + "' WHERE id='" + escape(id) + "';", function (error, results, fields) {
            if(error) {
                throw "Error updating page: " + error;
            }
            callback();
        });
    });
}

exports.destroyPage = function(id, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("DELETE FROM pages WHERE id='" + escape(id) + "';", function (error, results, fields) {
            if(error) {
                throw "Error destroying page: " + error;
            }
            callback();
        });
    });
}