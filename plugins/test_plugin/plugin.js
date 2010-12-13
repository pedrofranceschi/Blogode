var sys = require('sys');

// <%= pluginFunction('test_plugin', 'returnFirstElement', ['ASD']) %>

exports.initialize = function() {
    return ['test_plugin', "A Test plugin", "Pedro Franceschi", "pedrohfranceschi@gmail.com", "1.0"]
}

exports.returnFirstElement = function(numbersParam, callback) {
    callback(numbersParam[0]);
}

exports.returnFirstElement = function(numbersParam, callback) {
    callback(numbersParam[0]);
}