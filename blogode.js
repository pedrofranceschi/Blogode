var express = require("express")
var sys = require("sys");
var app = express.createServer();

app.use(express.bodyDecoder());
app.set('view engine', 'ejs');
app.configure(function() {
    app.use(express.logger());
    app.use(express.bodyDecoder());
    app.use(express.cookieDecoder());
    app.use(express.session());
    app.set('views', __dirname + '/views');
    app.use(express.staticProvider(__dirname + '/public'));
});

var posts = require('./lib/posts');

app.get("/", function(req, res){
    // return posts list
    
    posts.getPosts(function (posts){
        return res.send(sys.inspect(posts))
    });
    
    // return res.send("OK");
});

app.listen(3000);
console.log("Server on port %s", app.address().port);