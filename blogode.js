#!/usr/bin/node

var server = require("./server.js");

var args = new Array();

for(var i=0; i < process.argv.length; i++) {
    if(process.argv[i].indexOf("/") < 0 && process.argv[i].indexOf("node") < 0) {
        args.push(process.argv[i]);
    }
}

if(args[0] == "server") {
    var port = 3000;
    
    if(!isNaN(parseInt(args[1])) && parseInt(args[1]) > 0) {
        port = parseInt(args[1]);
    } else if(args[1] != undefined) {
        console.log("Invalid port.");
        process.exit();
    }
    
    server.startServer(port);
}