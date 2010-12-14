var sys = require('sys');
var Events = require('events');
var events = new Events.EventEmitter();
var responseData = "RESP";

exports.initialize = function(_eventEmitter) {
    events = _eventEmitter;
    // _eventEmitter
    return ['test_plugin', "A Test plugin", "Pedro Franceschi", "pedrohfranceschi@gmail.com", "1.0"]
}

exports.getGoogleResponse = function(numbersParam, callback) {
    events.emit('performAssyncOperation', this, 'getGoogleResponseAssync', '1', 0);
    callback(responseData);
}

exports.getGoogleResponseAssync = function(params, callback) {
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
      });
    });
}

exports.returnFirstElement = function(numbersParam, callback) {
    callback(numbersParam[0]);
}