var sys = require('sys')
var posts = require('../lib/posts')
, comments = require('../lib/comments')
, config = require('../lib/config');

var postsPerPage;
config.getBlogConfigKeyValue('blog_posts_per_page', function(value) {
    postsPerPage = parseInt(value);
});

var postsCache;

var self = this;

exports.index = function(req, res){
    // return posts list
    
    self._getPostsUsingCache(function(posts_) {
        posts.getPostsIds(function(postsIds){
            req.events.on('pluginsAreLoaded', function() {
                if(req.plugins != undefined) {
                    var totalPages = 0;
                    if(postsIds.length <= postsPerPage) {
                        totalPages = -1;
                    }
                    res.render('posts/index', {
                        locals: { 'posts': posts_, currentPage:1, 'totalPages': totalPages }
                    });
                }
            });
        });
    });
};

// cache functions
exports._getPostsUsingCache = function(callback) {
    if(postsCache == undefined) {
        posts.getPosts(0, postsPerPage, function (err, posts_){
            postsCache = posts_;
            callback(posts_);
        });
    } else {
        callback(postsCache);
    }
};

exports.destroyCache = function() {
    postsCache = undefined;
}

// normal functions

exports.showPage = function(req, res){
    var pageNumber = parseInt(req.param('id'));
    
    if(pageNumber <= 1 || req.param('id') == undefined) {
        return res.redirect('/');
    }
    
    posts.getPostsIds(function(postsIds){
        if(pageNumber-1 > postsIds.length/postsPerPage) {
            return res.send("Page not found.");
        }
        var initialPost = postsIds[(postsPerPage*(pageNumber-1))-1].id
        posts.getPosts(initialPost, postsPerPage, function (err, posts){
            req.events.on('pluginsAreLoaded', function() {
                if(req.plugins != undefined) {
                    res.render('posts/index', {
                        locals: { 'posts': posts, currentPage:pageNumber, totalPages:(postsIds.length/postsPerPage) }
                    });
                }
            });
        });
    });
};

exports.feed = function(req, res){
    // return posts in XML format

    posts.getPosts(0, 0, function (err, postsResult){
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