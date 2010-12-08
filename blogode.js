var express = require("express")
var sys = require("sys");
var app = express.createServer();

app.configure(function() {
    app.use(express.logger());
    app.use(express.bodyDecoder());
    app.use(express.cookieDecoder());
    app.use(express.session());
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(express.staticProvider(__dirname + '/public'));
    app.set('view options', {
        layout: 'layout'
    });
});

var posts = require('./lib/posts');
var admin = require('./lib/admin');

app.get("/", function(req, res){
    // return posts list
    
    posts.getPosts(function (posts){
        res.render('index', {
            locals: { 'posts': posts }
        });
    });
});

app.get("/admin", function(req, res){
    // return admin panel
    
    if(!req.session.admin_username) {
        return res.redirect("/admin/login");   
    }
    
    res.render('admin_panel', {
        layout: false
    });
});


app.get("/admin/login", function(req, res){
    // return admin login page
    
    if(req.session.admin_username) {
        return res.redirect("/admin")
    }
    
    res.render('admin_login', {
        layout: false
    });
});

app.post("/admin/authenticate", function(req, res){
    // verifies admin credentials
    
    if(!req.param('username') || !req.param('password')) {
        res.redirect('/admin/login')
    }
    
    admin.verifyCredentials(req.param('username'), req.param('password'), function(isAdmin){
        if(isAdmin) {
            req.session.admin_username = req.param('username')
        }
        res.redirect("/admin");
    });
});

app.listen(3000);
console.log("Server on port %s", app.address().port);