var sys = require('sys'),
    database = require('./database.js');

exports.verifyCredentials = function(username, password, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM admins WHERE username='" + escape(username) + "' AND password='" + escape(password) + "';", function (error, results, fields) {
            if(error) {
                throw "Error verifying credentials: " + error;
            }
            var isAdmin = false;
            if(results.length > 0) {
                isAdmin = true;
            }
            callback(isAdmin);           
        });
    });
}