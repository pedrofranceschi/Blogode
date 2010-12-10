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