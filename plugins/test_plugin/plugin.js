var sys = require('sys');
var http = require('http');
var cacheCreation;
var lastData;

exports.initialize = function () {
    return {
        pluginInfos: {
            "name": "test_plugin", 
            "description": "A Test plugin", 
            "creator_name": "Pedro Franceschi", 
            "creator_email": "pedrohfranceschi@gmail.com", 
            "version": "1.0"
        },
        run: function(req, res, callback) {
            var d = new Date();
            if(cacheCreation == undefined) {
                cacheCreation = d.getTime();
            }
            
            var difference = Math.floor((d.getTime() - cacheCreation)/1000);
            if(difference <= 60 && lastData != undefined) {
                callback(lastData);
            } else {
                getLastHashtagTweets("iphone", function(data){
                    callback(data);
                });
            }
            
            function getLastHashtagTweets(hashtag, callback) {
                var responseData = "";
                var google = http.createClient(80, 'search.twitter.com');
                var request = google.request('GET', '/search.json?q=' + escape(hashtag) + '&rpp=5',
                {'host': 'search.twitter.com'});
                request.end();
                request.on('response', function (response) {
                    response.setEncoding('utf8');
                    response.on('data', function (chunk) {
                        responseData += chunk;
                    });
                    response.on('end', function () {
                        var parser = JSON.parse(unescape(responseData));
                        lastData = sys.inspect(parser["results"]);
                        callback(lastData);
                    });
                });
            }

        }
    }
}