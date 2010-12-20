var sys = require('sys'),
    database = require('./database.js');

database.initialize();

exports.verifyCredentials = function(username, password, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM users WHERE username='" + escape(username) + "' AND password='" + escape(password) + "';", function (error, results, fields) {
            if(error) {
                throw "Error verifying credentials: " + error;
            }
            if(results.length > 0) {
                callback(true, results[0].id, results[0].permission_level);
            }
            callback(false, -1);
        });
    });
}

exports.getUsers = function(callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("SELECT * FROM users;", function (error, results, fields) {
            if(error) {
                throw "Error getting users: " + error;
            }

            callback(JSON.parse(unescape(JSON.stringify(results))));
        });
    });
}

exports.updateUser = function(id, permissionLevel, name, description, email, username, password, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("UPDATE users SET name='" + escape(name) + "', permission_level='" + escape(permissionLevel) + "', description='" + escape(description) + "', email='" + escape(email) + "', username='" + escape(username) + "', password='" + escape(password) + "' WHERE id='" + escape(id) + "';", function (error, results, fields) {
            if(error) {
                throw "Error updating user: " + error;
            }

            callback();
        });
    });
};

exports.createUser = function(permissionLevel, name, description, email, username, password, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("INSERT INTO users (permission_level, name, description, email, username, password) VALUES ('" + escape(permissionLevel) + "', '" + escape(name) + "', '" + escape(description) + "', '" + escape(email) + "', '" + escape(username) + "', '" + escape(password) + "');", function (error, results, fields) {
            if(error) {
                throw "Error creating user: " + error;
            }

            callback();
        });
    });
};

exports.destroyUser = function(id, callback) {
    database.getDatabaseConnection(function (mysql_client) {
        mysql_client.query("DELETE FROM users WHERE id='" + escape(id) + "';", function (error, results, fields) {
            if(error) {
                throw "Error deleting user: " + error;
            }

            callback();
        });
    });
};