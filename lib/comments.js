var sys = require('sys'),
    database = require('./database.js');
    
exports.getCommentsOfPost = function(postId, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM comments WHERE id='" + escape(postId) + "';", function (error, results, fields) {
            if(error) {
                throw "Error getting comment: " + error;
            }
            
            callback(results[0]);
        });
    });
}