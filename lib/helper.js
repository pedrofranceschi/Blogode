var sys = require("sys");
var ejs = require("ejs");
var fs = require("fs");

exports.renderView = function(plugin, view, viewVariables, callback){
    fs.readFile('./plugins/' + plugin.pluginInfos["call_name"] + '/' + view, function(err, file_content) {
        if(err) sys.puts(err);
        
        callback(ejs.render(file_content.toString(), { locals: viewVariables }))
    });
}

exports.getConfigVariableValue = function(plugin, variableName, callback){
    fs.readFile('./config/plugins.json', function(err, content){
        if(err) throw err;
        var parser = JSON.parse(content);
        if(parser[plugin.pluginInfos.call_name] == undefined) {
            callback(undefined);
        } else {
            callback(parser[plugin.pluginInfos.call_name][variableName]);
        }
    });
}