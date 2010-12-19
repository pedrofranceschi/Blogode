var sys = require('sys');
var fs = require('fs');

exports.getBlogConfigKeyValue = function(key, callback) {
    fs.readFile('./config/blog.json', function(err, content) {
        if(err) {
            throw err;
        } else {
            var configParser = JSON.parse(content);
            callback(configParser[key]);
        }
    });
}

exports.getAllBlogConfigKeyValues = function(callback) {
    fs.readFile('./config/blog.json', function(err, content) {
        if(err) {
            throw err;
        } else {
            var configParser = JSON.parse(content);
            callback(configParser);
        }
    });
}

exports.setBlogConfigKeyValue = function(key, value, callback) {
    fs.readFile('./config/blog.json', function(err, content) {
        if(err) {
            throw err;
        } else {
            var configParser = JSON.parse(content);
            configParser[key] = value;
            
            fs.writeFile('./config/blog.json', JSON.stringify(configParser), function (err) {
                if (err) throw err;
                callback();
            });
        }
    });
}

exports.setAllBlogConfigKeyValues = function(keyAndValues, callback) {
    fs.writeFile('./config/blog.json', JSON.stringify(keyAndValues), function (err) {
        if (err) throw err;
        callback();
    });
}