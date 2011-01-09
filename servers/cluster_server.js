exports.startClusterServer = function(serverPort) {
    var dgram = require("dgram");
    var http = require("http");
    var sys = require("sys");
    var fs = require("fs");
    
    var clusterInstances = new Array();
	var requestsRunningForNode = new Array();

    function loadClusters(callback) {
        fs.readFile('./servers/cluster_config.json', function(error, data){
            if(error) {
                throw error;
            }

			clusterInstances = new Array();
            
            var parser = JSON.parse(data);
            for(var i=0; i < parser.length; i++) {
                var clusterData = parser[i]
				requestsRunningForNode[i] = 0;
                clusterData['isAvailable'] = false
				clusterData['id'] = i
                clusterInstances.push(clusterData)
            }
            updateClusterStatus(function(){
				// console.log(sys.inspect(clusterInstances));
                callback();
            });
        });
    }

	function sendCommandToNode(node, command, callback) {
		var serverResponded = false;
        var client = dgram.createSocket("udp4");

		var port = 0;
		if(node.socket_port) {
			port = parseInt(node.socket_port);
		} else {
			port = 6108;
		}
        
		var message = new Buffer(command);

		client.send(message, 0, message.length, port, node.host);
		client.close();
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
		setTimeout(function(){
			loadClusters(function(){
				console.log('Clusters: ' + sys.inspect(clusterInstances));
				runNextClusterClientCheck();
			});
		}, 5000);
	}
	
	function getAvailableNodes() {
		var actives = new Array();
		
		for(var i=0; i < clusterInstances.length; i++) {
			if(clusterInstances[i].isAvailable) {
				actives.push(clusterInstances[i]);
			}
		}
		
		return actives;
	}
	
	function getNodeToHandleRequest(req, activeNodes) {
		if(req.url.indexOf("/admin") >= 0) {
			
			// Is admin request, so, we need sesssions and
			// all the requests needs to go to the same node.
			
			return activeNodes[0];
			
		} else {
			
			var sortable = new Array();
			for (var i=0; i < activeNodes.length; i++) {
				sortable.push([activeNodes[i], requestsRunningForNode[activeNodes[i].id]])
			}
			sortable.sort(function(a, b) {return a[1] - b[1]})

			console.log('sortable: ' + sys.inspect(sortable));
			
			return sortable[0][0];
			
		}
	}
	
    var requestHandler = function(request, response) {
		console.log('URL: ' + request.method + ' ' + sys.inspect(request.url));
		var activeNodes = getAvailableNodes();
		
		if(activeNodes.length == 0) {
			
			// TODO: if there's no node active, the cluster server
			// should become a client (node) an handle the requests.
			// The blog needs to be available ALWAYS.
			
			response.writeHead(500, {'Content-Type': 'text/html'});
			response.write('No active server to handle your request.');
			response.end();
		} else {
			var content = "";
			
			request.addListener('data', function(chunk)
			{
			    content += chunk;
			});

			request.addListener('end', function()
			{
			
			var node = getNodeToHandleRequest(request, activeNodes);
			
			requestsRunningForNode[node.id] += 1;
			
			console.log('Using node: ' + sys.inspect(node));
			
			var proxy_headers = request.headers;
			var proxy_client = http.createClient(parseInt(node.port, 10), node.host);
			proxy_headers['Content-Length'] = content.length;
			var proxy_request = proxy_client.request(request.method, request.url, proxy_headers);

			proxy_request.write(content);

			proxy_request.addListener("response", function (proxy_response) {
				response.writeHead(proxy_response.statusCode, proxy_response.headers);
			
				proxy_response.addListener("data", function (chunk) {
					response.write(chunk);
				});
			
				proxy_response.addListener("end", function () {
					if(requestsRunningForNode[node.id] > 0) {
						requestsRunningForNode[node.id] -= 1;
					}
					response.end();
				});
			});

			proxy_client.addListener("error", function (error) {
				for(var i=0; i < clusterInstances.length; i++) {
					if(node.host == clusterInstances[i].host && node.port == clusterInstances[i].port) {
						sys.puts('[CLUSTER SERVER] [ERROR] Deactivating cluster ' + node.host + ':' + node.port);
						clusterInstances[i].isAvailable = false;
					}
				}
			});
			
			proxy_request.end();
			});
		}
    };

	function verifyCommandOrigin(rinfo) {
		if(rinfo.address == "127.0.0.1") {
			return true;
		}
		for(var i=0; i < clusterInstances.length; i++) {
			if(rinfo.address == clusterInstances[i].host) {
				return true;
			}
		}
		return false;
	}

	function initializeNodeCommandsListener(port, callback) {
		var server = dgram.createSocket("udp4");

        server.on("message", function (msg, rinfo) {
			if(verifyCommandOrigin(rinfo)) {
				var message = msg.toString("ascii");
				var activeNodes = getAvailableNodes();
				if(message.indexOf("DESTROY_CACHE") >= 0) {
					console.log('[CLUSTER SERVER] Got destroy cache command from node.')
					for(var i=0; i < activeNodes.length; i++) {
						sendCommandToNode(activeNodes[i], message, function(){})
					}
				}
			}
		}); 
        server.on("listening", function () {
			console.log('[CLUSTER SERVER] Initialized node command listener on port ' + port);
		});
        server.bind(port);
	};
    
    loadClusters(function(){
		runNextClusterClientCheck();
    });

   	initializeNodeCommandsListener(6110, function(){
	});

    var httpServer = http.createServer().addListener('request', requestHandler).listen(serverPort);
    console.log('[CLUSTER SERVER] HTTP proxy server running on port ' + serverPort);
}