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
    mysql_client.query("CREATE TABLE IF NOT EXISTS posts (id INT PRIMARY KEY AUTO_INCREMENT, user_id INT, title varchar(200), body text, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);")
    mysql_client.query("CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY AUTO_INCREMENT, name varchar(100), description varchar(500), email varchar(100), username varchar(100), password varchar(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);")
    callback();
}

exports._getDatabaseSettingsFromConfig = function(callback) {
    fs.readFile('./config/database.json', function(err, content) {
        var parser = JSON.parse(content);
        callback(parser['hostname'], parser['username'], parser['password'], parser['database'])
    });
}