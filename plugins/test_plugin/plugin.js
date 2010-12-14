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
        pluginInfos: ['test_plugin', "A Test plugin", "Pedro Franceschi", "pedrohfranceschi@gmail.com", "1.0"],
        run: function(req, res, callback) {
                 // code to run when it's time to get the result of the plugin.
                 // return HTML for easy integration into the final template
                 // note the req and res objects are available for inspection and use

                 // var output = "all done";
                 
                     var http = require('http');
                     var google = http.createClient(80, 'www.google.com');
                     var request = google.request('GET', '/',
                       {'host': 'www.google.com'});
                     request.end();
                     request.on('response', function (response) {
                       response.setEncoding('utf8');
                       response.on('data', function (chunk) {
                         responseData = chunk;
                         callback(chunk);
                         sys.puts('returning');
                       });
                     });
             }
    }
}