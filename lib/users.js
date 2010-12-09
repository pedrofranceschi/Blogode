var sys = require('sys'),
    database = require('./database.js');

exports.verifyCredentials = function(username, password, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM users WHERE username='" + escape(username) + "' AND password='" + escape(password) + "';", function (error, results, fields) {
            if(error) {
                throw "Error verifying credentials: " + error;
            }
            if(results.length > 0) {
                callback(true, results[0].id);
            }
            callback(false, -1);
        });
    });
}