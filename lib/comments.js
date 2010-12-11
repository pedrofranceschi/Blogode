var sys = require('sys'),
    database = require('./database.js');
    
database.initialize();
    
exports.getCommentsOfPost = function(postId, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM comments WHERE post_id='" + escape(postId) + "';", function (error, results, fields) {
            if(error) {
                throw "Error getting comment: " + error;
            }
            
            callback(results);
        });
    });
}

exports.saveComment = function(postId, authorName, authorEmail, comment, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("INSERT INTO comments (post_id, author_name, author_email, comment) VALUES ('" + escape(postId) + "', '" + escape(authorName) + "', '" + escape(authorEmail) + "', '" + escape(comment) + "');", function (error, results, fields) {
            if(error) {
                throw "Error inserting comment: " + error;
            }
            
            callback(results.insertId);
        });
    });
}