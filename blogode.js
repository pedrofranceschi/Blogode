var express = require("express")
var sys = require("sys");
var fs = require("fs");
var Events = require('events');
var faye = require('faye');
var Step = require('step');
var child = require('child_process');
var posts = require('./lib/posts');
var users = require('./lib/users');
var comments = require('./lib/comments');
var config = require('./lib/config')
  , postsController = require('./controllers/posts')
  , adminController = require('./controllers/admin')
  , adminFilter = require('./filters/admin');
  

var app = express.createServer();

var blogConfig;
config.getAllBlogConfigKeyValues(function(value) {
    blogConfig = value;
});

child.exec("limit -n 8192");

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

var loadedPlugins = {};
var pluginConfigVars = {};
function loadPlugins() {
    fs.readdir('./plugins/', function(err, files) {
        for (var i=0; i < files.length; i++) {            
            var plugin = require('./plugins/' + files[i] + '/plugin.js').initialize();
            var pluginInfo = plugin.pluginInfos;
            loadedPlugins[pluginInfo['call_name']] = plugin;
            pluginConfigVars[pluginInfo['call_name']] = plugin.configVariables;
        }
        adminController.setPlugins(loadedPlugins);
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
    },
    plugins: function(req, res) {
        return req.plugins;
    }
});

bayeux = new faye.NodeAdapter({
    mount: '/faye',
    timeout: 45
});

function runPlugin(req, res, next) {
    if(req.events == undefined) {
        req.events = new Events.EventEmitter();
    }
    var execOrder = new Array();
    Step(
        function () {
            var counter = 0;
            for(var p in loadedPlugins) {
                execOrder[p] = counter;
                var par = this.parallel();
                setTimeout(function() {
                    loadedPlugins[p].run(req, res, par);
                }, 90);
                counter += 1;
            }
            counter = 0;
        },
        function(err) {
            req.plugins = {};
            for(var p in loadedPlugins) {
                req.plugins[p] = arguments[execOrder[p]];
            }
            
            execOrder = undefined;
            req.events.emit('pluginsAreLoaded');
            next();
        }
    );
    next();
}

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
app.get('/admin/plugins', adminFilter.verifyLogin, adminController.pluginIndex);
app.post('/admin/plugins/set_config_variables', adminFilter.verifyLogin, adminController.setConfigVariables);

// Posts routes
app.get("/", runPlugin, postsController.index);
app.get("/feed", postsController.feed);
app.get("/search", runPlugin, postsController.search);
app.get("/:id", runPlugin, postsController.show);
app.post("/:id/comments/save", postsController.saveComment);

bayeux.attach(app);
app.listen(3000);
console.log("Server on port %s", app.address().port);