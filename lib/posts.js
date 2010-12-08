var sys = require('sys'),
    database = require('./database.js');

exports.getPosts = function(callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM posts ORDER BY id DESC LIMIT 10;", function (error, results, fields) {
            if(error) {
                throw "Error getting posts: " + error;
            }
            
            callback(results);            
        });
    });
}