var sys = require('sys'),
    database = require('./database.js');
    
exports.getCommentsOfPost = function(postId, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM comments WHERE post_id='" + escape(postId) + "' ORDER BY id ASC;", function (error, results, fields) {
            if(error) {
                throw "Error getting comment: " + error;
            }
            var comments = new Array();
            for(var i = 0; i < results.length; i++) {
                var thisComment = results[i]
                thisComment.created_at = sys.inspect(thisComment.created_at)
                comments.push(thisComment);
            }
            
            callback(comments);
        });
    });
}

exports.saveComment = function(postId, authorName, authorEmail, comment, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("INSERT INTO comments (post_id, author_name, author_email, comment) VALUES ('" + escape(postId) + "', '" + escape(authorName) + "', '" + escape(authorEmail) + "', '" + escape(comment) + "'); SELECT * FROM comments WHERE id=LAST_INSERT_ID();", function (error, results, fields) {
            if(error) {
                throw "Error inserting comment: " + error;
            }
            
            mysql_client.query("SELECT * FROM comments WHERE id=" + results.insertId + ";", function (error, results, fields) {
                if(error) {
                    throw "Error inserting comment: " + error;
                }
                callback(results[0]);
            });
        });
    });
}