var sys = require('sys')
var posts = require('../lib/posts')
, comments = require('../lib/comments');

exports.index = function(req, res){
    // return posts list

    posts.getPosts(10, function (posts){
        req.events.on('pluginsAreLoaded', function() {
            if(req.plugins != undefined) {
                res.render('posts/index', {
                    locals: { 'posts': posts }
                });
            }
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
        req.events.on('pluginsAreLoaded', function() {
            if(req.plugins != undefined) {
                res.render('posts/search', {
                    locals: { 'posts': undefined }
                });
            }
        });
    }

    posts.searchForPosts(req.param('keywords'), function(searchResults){
        req.events.on('pluginsAreLoaded', function() {
            if(req.plugins != undefined) {
                res.render('posts/search', {
                    locals: { 'posts': searchResults }
                });
            }
        });
    });

};

exports.show = function(req, res){
    // return an specific post (by ID)

    posts.getPost(req.param('id'), function(post) {
        comments.getCommentsOfPost(req.param('id'), function(comments){
            req.events.on('pluginsAreLoaded', function() {
                if(req.plugins != undefined) {
                    res.render('posts/show', {
                        locals: { 'post': post, 'comments': comments }
                    });
                }
            });
        });
    });
};

exports.saveComment = function(req, res){
    // saves a comment (for a post)

    if(!req.param('id') || !req.param('author_name') || !req.param('author_email') || !req.param('comment')) {
        return res.send("Missing parameters.");
    }

    var d = new Date();

    comments.saveComment(req.param('id'), req.param('author_name'), req.param('author_email'), req.param('comment'), function(comment) {
        bayeux.getClient().publish('/' + req.param('id') + '/comments/bayeux', {
            author_name: req.param('author_name'),
            comment: req.param('comment'),
            created_at: sys.inspect(comment.created_at)
        });

        return res.send("OK");
    });
}