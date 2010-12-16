var sys = require("sys");
var fs = require("fs");

exports.setPluginConfigValues = function(pluginName, values, callback) {
    fs.readFile('./config/plugins.json', function(err, content){
        if(err) throw err;
        var parser = JSON.parse(content);
        parser[pluginName] = values;
        fs.writeFile('./config/plugins.json', JSON.stringify(parser), function (err) {
            if(err) throw err;
            callback();
        });
    });
}

exports.getPluginConfigValues = function(callback) {
    fs.readFile('./config/plugins.json', function(err, content){
        if(err) throw err;
        var parser = JSON.parse(content);
        callback(parser);
    });    
}

exports.getPluginConfigValues = function(callback) {
    fs.readFile('./config/plugins.json', function(err, content){
        if(err) throw err;
        var parser = JSON.parse(content);
        callback(parser);
    });    
}