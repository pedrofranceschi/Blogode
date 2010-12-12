var express = require("express")
var sys = require("sys");
var fs = require("fs");
var app = express.createServer();
var faye = require('faye');

app.configure(function() {
    app.use(express.logger());
    app.use(express.bodyDecoder());
    app.use(express.methodOverride());
    app.use(express.cookieDecoder());
    app.use(express.session());
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(express.staticProvider(__dirname + '/public'));
    app.set('view options', {
        layout: 'layout'
    });
});

bayeux = new faye.NodeAdapter({
    mount: '/faye',
    timeout: 45
});

var posts = require('./lib/posts');
var users = require('./lib/users');
var comments = require('./lib/comments');

app.get("/", function(req, res){
    // return posts list
    
    posts.getPosts(10, function (posts){
        res.render('posts/index', {
            locals: { 'posts': posts }
        });
    });
});

app.get("/feed", function(req, res){
    // return posts in XML format
    
    posts.getPosts(10, function (postsResult){
        posts.generatePostsXML(postsResult, function(xmlString) {
            return res.send(xmlString); 
        });
    });
});

function adminLoginFilter(req, res, next) {
    // verifies if user is an admin
    
    if(!req.session.username) {
        return res.redirect("/admin/login");   
    }
    next();
}

app.get("/admin", adminLoginFilter, function(req, res){
    // return admin panel
    
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

app.get('/admin/posts', adminLoginFilter, function(req, res) {
    // return the list of posts (as admin)
    
    posts.getPosts(0, function (posts){
        res.render('admin/posts/index', {
            layout: false,
            locals: { 'posts': posts }
        });
    });
});

app.get('/admin/posts/new', adminLoginFilter, function(req, res) {
    // return the formulary to create a new post
    
    res.render('admin/posts/new', {
        layout: false
    });
});

app.get('/admin/posts/:id', adminLoginFilter, function(req, res) {
    // return a post (to edit)
    
    posts.getPost(req.param('id'), function (post){
        res.render('admin/posts/edit', {
            layout: false,
            locals: { 'post': post }
        });
    });
});

app.post('/admin/posts/save', adminLoginFilter, function(req, res) {
    // saves a post
    
    if(!req.param('title') || !req.param('body')) {
        return res.redirect("/admin/posts/new");
    }
    posts.createPost(req.param('title'), req.param('body'), req.session.user_id, function(postId) {
        return res.redirect('/admin/posts/' + postId);
    });
});

app.put('/admin/posts/:id', adminLoginFilter, function(req, res) {
    // updates a post
    
    if(!req.param('title') || !req.param('body')) {
        return res.redirect("/admin/posts/new");
    }
    posts.updatePost(req.param('id'), req.param('title'), req.param('body'), function() {
        return res.redirect('/admin/posts/' + req.param('id'));
    });
});

app.get('/admin/posts/destroy/:id', adminLoginFilter, function(req, res) {
    // destroys a post
    
    if(!req.param('id')) {
        return res.redirect("/admin/posts/");
    }
    posts.destroyPost(req.param('id'), function () {
        return res.redirect('/admin/posts/')
    });
});

app.get('/admin/template', adminLoginFilter, function(req, res) {
    // returns the template file editor
    
    res.render('admin/template/index', {
        layout: false
    });
});

app.get('/admin/template/get_file_content', adminLoginFilter, function(req, res) {
    // returns a template file content
    
    var fileToRead = ""
    if(req.param('file_type') == 'layout') {
        fileToRead = "./views/layout.ejs";
    } else if(req.param('file_type') == 'index') {
        fileToRead = "./views/posts/index.ejs";
    } else if(req.param('file_type') == "post_show") {
        fileToRead = "./views/posts/show.ejs";
    } else if(req.param('file_type') == "stylesheet") {
        fileToRead = "./public/stylesheet.css";
    } else {
        return res.send("File not found.");
    }
    
    fs.readFile(fileToRead, function(err, content) {
        if (err) throw err;
        return res.send(content);
    });
    
});

app.put('/admin/template/set_file_content', adminLoginFilter, function(req, res) {
    // sets a template file some content
    
    if(req.param('content') == '' || req.param('content') == undefined) {
        return res.send("Content can't be blank!");
    }
    
    var fileToWrite = ""
    if(req.param('file_type') == 'layout') {
        fileToWrite = "./views/layout.ejs";
    } else if(req.param('file_type') == 'index') {
        fileToWrite = "./views/posts/index.ejs";
    } else if(req.param('file_type') == "post_show") {
        fileToWrite = "./views/posts/show.ejs";
    } else if(req.param('file_type') == "stylesheet") {
        fileToWrite = "./public/stylesheet.css";
    } else {
        return res.send("File not found.");
    }
    
    fs.writeFile(fileToWrite, req.param('content'), function (err) {
        if (err) throw err;
        return res.redirect('/admin/template')
    });
    
    // fs.readFile(fileToRead, function(err, content) {
    //     return res.send(content);
    // });
    
});

app.get("/search", function(req, res){
    // performs a search for a post
    
    if(!req.param('keywords')) {
        res.render('posts/search', {
            locals: { 'posts': undefined }
        });
    }
    
    posts.searchForPosts(req.param('keywords'), function(searchResults){
        res.render('posts/search', {
            locals: { 'posts': searchResults }
        }); 
    });
    
});

app.get("/:id", function(req, res){
    // return an specific post (by ID)
    
    posts.getPost(req.param('id'), function(post) {
        comments.getCommentsOfPost(req.param('id'), function(comments){
            res.render('posts/show', {
                locals: { 'post': post, 'comments': comments }
            });
        });
    });
});

app.post("/:id/comments/save", function(req, res){
    // saves a comment (for a post)
    
    if(!req.param('id') || !req.param('author_name') || !req.param('author_email') || !req.param('comment')) {
        return res.send("Missing parameters.");
    }
    
    comments.saveComment(req.param('id'), escape(req.param('author_name')), escape(req.param('author_email')), escape(req.param('comment')), function(commentId) {
        bayeux.getClient().publish('/' + req.param('id') + '/comments/bayeux', {
            id: commentId,
            author_name: req.param('author_name'),
            comment: req.param('comment')
        });
        
        return res.send("OK");
    });
});

bayeux.attach(app);
app.listen(3000);
console.log("Server on port %s", app.address().port);