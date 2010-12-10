var sys = require('sys'),
    fs = require('fs'),
    Client = require('mysql').Client;

var client = new Client();

exports.getDatabaseConnection = function(callback) {
    this._getDatabaseSettingsFromConfig(function (hostname, username, password, database){
        client.user = username;
        client.password = password;
        client.host = hostname;
        client.connect();
        client.query('USE ' + escape(database));
        
        exports._createTables(client, function() {
            callback(client);
        });
    });
}

exports._createTables = function(mysql_client, callback) {
    mysql_client.query("CREATE TABLE IF NOT EXISTS posts (id INT PRIMARY KEY AUTO_INCREMENT, user_id INT, title VARCHAR(200), body TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);")
    mysql_client.query("CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100), description VARCHAR(500), email VARCHAR(100), username VARCHAR(100), password VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);")
    mysql_client.query("CREATE TABLE IF NOT EXISTS comments (id INT PRIMARY KEY AUTO_INCREMENT, in_reply_to_id INT, author_name VARCHAR(100), author_email VARCHAR(100), comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);")
    callback();
}

exports._getDatabaseSettingsFromConfig = function(callback) {
    fs.readFile('./config/database.json', function(err, content) {
        var parser = JSON.parse(content);
        callback(parser['hostname'], parser['username'], parser['password'], parser['database'])
    });
}