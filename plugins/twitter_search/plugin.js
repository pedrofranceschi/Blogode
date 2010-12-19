var sys = require('sys');
var http = require('http');
var pluginHelper = require("../../lib/helper");

var cacheCreation;
var lastData;
var lastHashtag;

exports.initialize = function () {
    return {
        pluginInfos: {
            "call_name": "twitter_search",
            "name": "Twitter Search", 
            "description": "A plugin to show the last tweets about something", 
            "creator_name": "Pedro Franceschi", 
            "creator_email": "pedrohfranceschi@gmail.com", 
            "version": "0.1"
        },
        configVariables: [
            {"access_name": "search_term", "name": "Search Term", "description": "The term to be searched", "field_type": "text"},
        ],
        run: function(req, res, callback) {
            var self = this;
            pluginHelper.getConfigVariableValue(self, 'search_term', function(hashTag){
                getLastHashtagTweets(hashTag, function(data){
                    pluginHelper.renderView(self, 'view.html', { hashtag: hashTag, data: data}, function(final_content){
                        callback(final_content);
                    });
                });
                
                function getLastHashtagTweets(hashtag, callback) {
                    var d = new Date();
                    if(cacheCreation == undefined) {
                        cacheCreation = d.getTime();
                    }
                    
                    var difference = Math.floor((d.getTime() - cacheCreation)/1000);
                    if(difference <= 60 && lastData != undefined && lastHashtag == hashTag) {
                        callback(lastData);
                    } else {
                        lastHashtag = hashTag;
                        cacheCreation = d.getTime();
                        
                        var responseData = "";
                        var google = http.createClient(80, 'search.twitter.com');
                        var request = google.request('GET', '/search.json?q=' + escape(hashtag) + '&rpp=5',
                        {'host': 'search.twitter.com', 'USER_AGENT': 'MyUserAgent'});
                        request.end();
                        request.on('response', function (response) {
                            response.setEncoding('utf8');
                            response.on('data', function (chunk) {
                                responseData += chunk;
                            });
                            response.on('end', function () {
                                var parser = JSON.parse(unescape(responseData));
                                lastData = parser["results"];
                                
                                callback(lastData);
                            });
                        });
                    }
                }
            });
            
        }
    }
}