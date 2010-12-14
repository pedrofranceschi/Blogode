var express = require("express")
var sys = require("sys");
var fs = require("fs");
var Events = require('events');
var faye = require('faye');
var posts = require('./lib/posts');
var users = require('./lib/users');
var comments = require('./lib/comments');
var config = require('./lib/config')
  , postsController = require('./controllers/posts')
  , adminController = require('./controllers/admin')
  , adminFilter = require('./filters/admin');
  

var events = new Events.EventEmitter();

var app = express.createServer();

var blogConfig;
config.getAllBlogConfigKeyValues(function(value) {
    blogConfig = value;
});


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
    loadPlugins();
});

var loadedPlugins = new Array();
function loadPlugins() {
    fs.readdir('./plugins/', function(err, files) {
        for (var i=0; i < files.length; i++) {
            var plugin = require('./plugins/' + files[i] + '/plugin.js');
            var pluginInfo = plugin.initialize(events);
            loadedPlugins[pluginInfo[0].toString()] = plugin;
        }
    });
}

app.dynamicHelpers({
    blogName: function(){
        return blogConfig['blog_name'];
    },
    blogAddress: function(){
        return blogConfig['blog_address'];
    },
    blogDescription: function(){
        return blogConfig['blog_description'];
    }
});

app.helpers({
    pluginFunction: function(pluginName, functionToCall, parametersArray) {
        var plugin = loadedPlugins[pluginName];
        var response = "__WAITING_FOR_RESPONSE__";
        plugin[functionToCall](parametersArray, function(callbackParameters){
            response = callbackParameters
        });
        while(response == "__WAITING_FOR_RESPONSE__") {}
        return response;
    }
})

events.on('performAssyncOperation', function(plugin, functionName, tag, params) {
    plugin[functionName](params, function(response) {
        events.emit('didFinishAssyncOperation', tag, response);
    });
});

bayeux = new faye.NodeAdapter({
    mount: '/faye',
    timeout: 45
});

// Admin Routes
app.get("/admin", adminFilter.verifyLogin, adminController.index);
app.get("/admin/login", adminController.login);
app.post("/admin/authenticate", adminController.authenticate);
app.get('/admin/posts', adminFilter.verifyLogin, adminController.posts);
app.get('/admin/posts/new', adminFilter.verifyLogin, adminController.newPost);
app.get('/admin/posts/:id', adminFilter.verifyLogin, adminController.showPost);
app.post('/admin/posts/save', adminFilter.verifyLogin, adminController.createPost);
app.put('/admin/posts/:id', adminFilter.verifyLogin, adminController.updatePost);
app.get('/admin/posts/destroy/:id', adminFilter.verifyLogin, adminController.destroyPost);
app.post('/admin/template/apply_template', adminFilter.verifyLogin, adminController.applyTemplate);
app.put('/admin/template/set_file_content', adminFilter.verifyLogin, adminController.setTemplateFileContent);
app.get('/admin/template/get_file_content', adminFilter.verifyLogin, adminController.getTemplateFileContent);
app.get('/admin/template', adminFilter.verifyLogin, adminController.templateIndex);

// Posts routes
app.get("/", postsController.index);
app.get("/feed", postsController.feed);
app.get("/search", postsController.search);
app.get("/:id", postsController.show);
app.post("/:id/comments/save", postsController.saveComment);

bayeux.attach(app);
app.listen(3000);
console.log("Server on port %s", app.address().port);