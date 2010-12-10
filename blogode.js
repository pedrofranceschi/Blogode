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
var users = require('./lib/users');

app.get("/", function(req, res){
    // return posts list
    
    posts.getPosts(10, function (posts){
        res.render('index', {
            locals: { 'posts': posts }
        });
    });
});

app.get("/admin", function(req, res){
    // return admin panel
    
    if(!req.session.username) {
        return res.redirect("/admin/login");   
    }
    
    res.render('admin/panel', {
        layout: false
    });
});


app.get("/admin/login", function(req, res){
    // return admin login page
    
    if(req.session.username) {
        return res.redirect("/admin")
    }
    
    res.render('admin/login', {
        layout: false
    });
});

app.post("/admin/authenticate", function(req, res){
    // verifies admin credentials
    
    if(!req.param('username') || !req.param('password')) {
        res.redirect('/admin/login')
    }
    
    users.verifyCredentials(req.param('username'), req.param('password'), function(isValidUser, userId){
        if(isValidUser) {
            req.session.username = req.param('username');
            req.session.user_id = userId;
        }
        res.redirect("/admin");
    });
});

app.get('/admin/posts', function(req, res) {
    // return the list of posts (as admin)
    
    if(!req.session.username)  {
        return res.redirect("/admin/login")
    }
    posts.getPosts(0, function (posts){
        res.render('admin/posts/index', {
            layout: false,
            locals: { 'posts': posts }
        });
    });
});

app.get('/admin/posts/new', function(req, res) {
    // return the formulary to create a new post
    
    if(!req.session.username)  {
        return res.redirect("/admin/login")
    }
    res.render('admin/posts/new', {
        layout: false
    });
});

app.get('/admin/posts/:id', function(req, res) {
    // return a post (to edit)
    
    if(!req.session.username)  {
        return res.redirect("/admin/login")
    }
    posts.getPost(req.param('id'), function (post){
        res.render('admin/posts/edit', {
            layout: false,
            locals: { 'post': post }
        });
    });
});

app.post('/admin/posts/save', function(req, res) {
    if(!req.session.username)  {
        return res.redirect("/admin/login")
    }
    sys.puts('saving: ' + sys.inspect(req.param('textEditor')))
    if(!req.param('title') || !req.param('body')) {
        return res.redirect("/admin/posts/new");
    }
    posts.createPost(req.param('title'), req.param('body'), req.session.user_id, function(postId) {
        return res.redirect('/admin/posts/' + postId);
    });
});

app.post('/admin/posts/update', function(req, res) {
    if(!req.session.username)  {
        return res.redirect("/admin/login")
    }
    if(!req.param('title') || !req.param('body')) {
        return res.redirect("/admin/posts/new");
    }
    posts.updatePost(req.param('id'), req.param('title'), req.param('body'), function() {
        return res.redirect('/admin/posts/' + req.param('id'));
    });
});

app.get('/admin/posts/destroy/:id', function(req, res) {
    if(!req.session.username)  {
        return res.redirect("/admin/login")
    }
    if(!req.param('id')) {
        return res.redirect("/admin/posts/");
    }
    posts.destroyPost(req.param('id'), function () {
        return res.redirect('/admin/posts/')
    });
});

app.listen(3000);
console.log("Server on port %s", app.address().port);