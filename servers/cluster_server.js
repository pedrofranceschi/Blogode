exports.startClusterServer = function(serverPort) {
    var dgram = require("dgram");
    var http = require("http");
    var sys = require("sys");
    var fs = require("fs");
    
    var clusterInstances = new Array();
    
    function loadClusters(callback) {
        fs.readFile('./servers/cluster_config.json', function(error, data){
            if(error) {
                throw error;
            }

			clusterInstances = new Array();
            
            var parser = JSON.parse(data);
            for(var i=0; i < parser.length; i++) {
                var clusterData = parser[i]
                clusterData['isAvailable'] = false
                clusterInstances.push(clusterData)
            }
            updateClusterStatus(function(){
				console.log("[CLUSTER SERVER] Done updating cluster clients statuses.")
				console.log(sys.inspect(clusterInstances));
                callback();
            });
        });
    }
    
    var updateClusterStatus = function(callback) {
		var clustersToVerify = new Array();
        for(var i=0; i < clusterInstances.length; i++) {
            clustersToVerify.push(i)
        }
        
        function getClusterStatus() {
            if(clustersToVerify.length == 0) {
                callback();
            } else {
                var cluster = clusterInstances[clustersToVerify[0]];
                
                var serverResponded = false;
                var server = dgram.createSocket("udp4");

                server.on("message", function (msg, rinfo) {
                    serverResponded = true;
                    if(msg.toString("ascii") == "OK") {
                        clusterInstances[clustersToVerify[0]].isAvailable = true;
                    }
					server.close();
                    clustersToVerify.splice(0, 1);
                    getClusterStatus();
                }); 
                server.on("listening", function () {
                    var client = dgram.createSocket("udp4");
                    var message = new Buffer("$_is_online_$");
                    
                    var port = 6108;
                    
                    if(cluster.socket_port != undefined) {
                        if(!isNaN(parseInt(cluster.socket_port))) {
                            port = parseInt(cluster.socket_port);
                        }
                    }
                    
                    client.send(message, 0, message.length, port, cluster.host, function (err, bytes) {
						client.close();
                        if(err) {
                            clusterInstances[clustersToVerify[0]].isAvailable = false;
							server.close();
							// client.close();
                            clustersToVerify.splice(0, 1);
                            getClusterStatus();
                        } else {
                            setTimeout(function(){
                                if(serverResponded == false) {
                                    clusterInstances[clustersToVerify[0]].isAvailable = false;
									server.close();
									// client.close();
                                    clustersToVerify.splice(0, 1);
                                    getClusterStatus();
                                }
                            }, 500);
                        }
                    });
                });
                server.bind(6109);
                
            }
        }
        
        getClusterStatus();
    }

	function runNextClusterClientCheck() {
		// setTimeout(function(){
			loadClusters(function(){
				runNextClusterClientCheck();
			});
		// }, 5000);
	}
    
    var requestHandler = function(request, response) {
        console.log(sys.inspect(request));
        // if(_active.length == 0) {
        //  response.writeHead(500, {'Content-Type': 'text/html'});
        //  response.write('no server active');
        //  response.end();
        // } else {
        //  var index = Math.floor(Math.random()*_active.length);
        //  var node = _active[index];
        //     
        //  var proxy_headers = request.headers;
        //  var proxy_client = http.createClient(parseInt(node.port, 10), node.host);
        //  var proxy_request = proxy_client.request(request.method, request.url, proxy_headers);
        //     
        //  proxy_request.addListener("response", function (proxy_response) {
        //      response.writeHeader(proxy_response.statusCode, proxy_response.headers);
        // 
        //      proxy_response.addListener("data", function (chunk) {
        //          response.write(chunk);
        //      });
        // 
        //      proxy_response.addListener("end", function () {
        //          response.end();
        //      });
        //  });
        //     
        //  proxy_client.addListener("error", function (error) {
        //      for(var i=0; i<_cluster.length; i++) {
        //          if(node.host == _cluster[i].host && node.port == _cluster[i].port) {
        //              sys.puts('error, deactivating: '+node.host+':'+node.port);
        //              _cluster[i].active = false;
        //              _updateActives();
        //          }
        //     
        //          clearTimeout(_checkTimeout[_cluster[i].host + ':' + _cluster[i].port]);
        //          _clusterNodeCheck(_cluster[i]);
        //      }
        //     
        //      setTimeout(function() {
        //          _requestHandler(request, response);
        //      }, 200);
        //  });
        //     
        //  proxy_request.end();        
        // }
    };
    
    loadClusters(function(){
		runNextClusterClientCheck();
    });
    
    var httpServer = http.createServer().addListener('request', requestHandler).listen(serverPort);
    console.log('[CLUSTER SERVER] HTTP proxy server running on port ' + serverPort);
}