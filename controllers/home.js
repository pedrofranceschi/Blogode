var posts = require('../lib/posts')
  , comments = require('../lib/comments');
  

exports.index = function(req, res){
  // return posts list
  posts.getPosts(10, function (posts){
    res.render('posts/index', {
      locals: { 'posts': posts }
    });
  });
};

exports.feed = function(req, res){
  // return posts in XML format
  posts.getPosts(10, function (postsResult){
    posts.generatePostsXML(postsResult, function(xmlString) {
      return res.send(xmlString); 
    });
  });
};

exports.search = function(req, res){
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
};

exports.show = function(req, res){
  // return an specific post (by ID)
  posts.getPost(req.param('id'), function(post) {
    comments.getCommentsOfPost(req.param('id'), function(comments){
      res.render('posts/show', {
        locals: { 'post': post, 'comments': comments }
      });
    });
  });
};