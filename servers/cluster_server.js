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
            
            var parser = JSON.parse(data);
            for(var i=0; i < parser.length; i++) {
                clusterInstances.push({
                    'host': parser[i].host,
                    'port': parser[i].port,
                    'isAvailable': false
                })
            }
            callback();
        });
    }
    
    var server = dgram.createSocket("udp4");
    
    server.on("message", function (msg, rinfo) {
        console.log("server got: " + msg + " from " +
        rinfo.address + ":" + rinfo.port);
    });
    
    server.on("listening", function () {
        var address = server.address();
        console.log("[CLUSTER SERVER] Initialized cluster socket on port " + address.port);
    });
    
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
    
    server.bind(6108);
    
    var httpServer = http.createServer().addListener('request', requestHandler).listen(serverPort);
    console.log('[CLUSTER SERVER] HTTP proxy server running on port ' + serverPort);
}