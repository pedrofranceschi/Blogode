var sys = require('sys');
var http = require('http');
var pluginHelper = require("../../lib/helper");

var cacheCreation;
var lastData;
var lastUsername;

exports.initialize = function () {
    return {
        pluginInfos: {
            "call_name": "user_tweets",
            "name": "User Tweets", 
            "description": "A plugin to show the last tweets from someone", 
            "creator_name": "Pedro Franceschi", 
            "creator_email": "pedrohfranceschi@gmail.com", 
            "version": "0.1"
        },
        configVariables: [
            {"access_name": "username", "name": "Twitter Username", "description": "The username to be searched", "field_type": "text"},
        ],
        run: function(req, res, callback) {
            var self = this;
            pluginHelper.getConfigVariableValue(self, 'username', function(username){
                if(username == undefined) {
                    callback("");
                }
                getLastUserTweets(username, function(data){
                    pluginHelper.renderView(self, 'view.html', { 'username': username, 'data': data }, function(final_content){
                        callback(final_content);
                    });
                });
                
                function getLastUserTweets(username, callback) {
                    var d = new Date();
                    if(cacheCreation == undefined) {
                        cacheCreation = d.getTime();
                    }
                    
                    var difference = Math.floor((d.getTime() - cacheCreation)/1000);
                    if(difference <= 60 && lastData != undefined && lastUsername == username) {
                        callback(lastData);
                    } else {
                        lastUsername = username;
                        cacheCreation = d.getTime();
                        
                        var responseData = "";
                        var google = http.createClient(80, 'api.twitter.com');
                        var request = google.request('GET', '/1/statuses/user_timeline.json?screen_name=' + escape(username) + '&count=3',
                        {'host': 'api.twitter.com', 'USER_AGENT': 'MyUserAgent'});
                        request.end();
                        request.on('response', function (response) {
                            response.setEncoding('utf8');
                            response.on('data', function (chunk) {
                                responseData += chunk;
                            });
                            response.on('end', function () {
                                var parser = JSON.parse(unescape(responseData));
                                lastData = parser;
                                
                                callback(lastData);
                            });
                        });
                    }
                }
            });
            
        }
    }
}