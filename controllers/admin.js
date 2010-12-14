var sys = require("sys")
  , users = require('../lib/users')
  , posts = require('../lib/posts');
  
exports.index = function(req, res){
  // return admin panel

  res.render('admin/panel', {
    layout: false
  });
};

exports.login = function(req, res){
  // return admin login page
    
  if(req.session.username) {
    return res.redirect("/admin");
  }
    
  res.render('admin/login', {
    layout: false
  });
};

exports.authenticate = function(req, res){
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
};


exports.posts = function(req, res) {
  // return the list of posts (as admin)
    
  posts.getPosts(0, function (posts){
      res.render('admin/posts/index', {
      layout: false,
      locals: { 'posts': posts }
    });
  });
};

exports.newPost = function(req, res) {
  // return the formulary to create a new post
    
  res.render('admin/posts/new', {
    layout: false
  });
};

exports.showPost = function(req, res) {
  // return a post (to edit)
    
  posts.getPost(req.param('id'), function (post){
    res.render('admin/posts/edit', {
      layout: false,
      locals: { 'post': post }
    });
  });
};

exports.createPost = function(req, res) {
  // saves a post
    
  if(!req.param('title') || !req.param('body')) {
    return res.redirect("/admin/posts/new");
  }
  posts.createPost(req.param('title'), req.param('body'), req.session.user_id, function(postId) {
    return res.redirect('/admin/posts/' + postId);
  });
};

exports.updatePost = function(req, res) {
  // updates a post
    
  if(!req.param('title') || !req.param('body')) {
    return res.redirect("/admin/posts/new");
  }
  posts.updatePost(req.param('id'), req.param('title'), req.param('body'), function() {
    return res.redirect('/admin/posts/' + req.param('id'));
  });
};

exports.destroyPost = function(req, res) {
  // destroys a post
    
  if(!req.param('id')) {
    return res.redirect("/admin/posts/");
  }
  posts.destroyPost(req.param('id'), function () {
    return res.redirect('/admin/posts/')
  });
};
