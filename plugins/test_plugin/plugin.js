var sys = require('sys');
var Events = require('events');
var events = new Events.EventEmitter();
var responseData = "RESP";

// exports.initialize = function(_eventEmitter) {
//     events = _eventEmitter;
//     // _eventEmitter
//     return ['test_plugin', "A Test plugin", "Pedro Franceschi", "pedrohfranceschi@gmail.com", "1.0"]
// }

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
                 // code to run when it's time to get the result of the plugin.
                 // return HTML for easy integration into the final template
                 // note the req and res objects are available for inspection and use

                 // var output = "all done";
                 
                 var responseData = "";
                 var http = require('http');
                 var google = http.createClient(80, 'search.twitter.com');
                 var request = google.request('GET', '/search.json?q=%23twitter&rpp=5',
                   {'host': 'search.twitter.com'});
                 request.end();
                 request.on('response', function (response) {
                   response.setEncoding('utf8');
                   response.on('data', function (chunk) {
                       responseData += chunk;
                   });
                   response.on('end', function () {
                       var parser = JSON.parse(responseData);
                       callback(sys.inspect(parser["results"]));
                   });
                 });
                                  
             }
    }
}