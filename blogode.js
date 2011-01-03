#!/usr/bin/node

var server = require("./servers/server.js");
var clusterServer = require("./servers/cluster_server.js");

var args = new Array();

for(var i = 0; i < process.argv.length; i++) {
    if(process.argv[i].indexOf("/") < 0 && process.argv[i].indexOf("node") < 0) {
        args.push(process.argv[i]);
    }
}   

if(args[0] == "server") {
    var port = 3000;
    var clusterArg = 1;

    if(!isNaN(parseInt(args[1])) && parseInt(args[1]) > 0) {
        port = parseInt(args[1]);
        clusterArg = 2;
    }
    
    var clusterAddress = "";
    var clusterPort = 0;
    
    if(args[clusterArg] == "cluster") {
        var addr = args[clusterArg+1]
        if(addr != undefined) {
            if(addr.indexOf(":") >= 0) {
                var separator = addr.split(":");
                if(isNaN(parseInt(separator[1]))) {
                    console.log('Invalid cluster port.')
                } else {
                    clusterAddress = separator[0];
                    clusterPort = parseInt(separator[1]);
                }
            } else {
                clusterAddress = addr;
                clusterPort = 6108; // default port
            }
        } else {
            console.log("Invalid cluster server address")
            process.exit(-1);
        }
    }
    
    // exports.startServer = function(serverPort, clusterServerIp, clusterServerPort, clusterSocketPort) {

    server.startServer(port, clusterAddress, clusterPort, 6108);
} else if(args[0] == "cluster") {
    var port = 3000;

    if(!isNaN(parseInt(args[1])) && parseInt(args[1]) > 0) {
        port = parseInt(args[1]);
    } else if(args[1] != undefined) {
        console.log("Invalid port.");
        process.exit();
    }
    
    clusterServer.startClusterServer(port);
} else if(args[0] == undefined) {
    console.log("Missing arguments.");
    process.exit();
} else {
    console.log("Invalid argument.");
    process.exit();
}