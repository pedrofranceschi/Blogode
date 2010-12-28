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
    },
    session: function(req, res) {
        return req.session;
    }
});

bayeux = new faye.NodeAdapter({
    mount: '/faye',
    timeout: 45
});

function runPlugin(req, res, next) {
    req.session = undefined;
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
app.get('/admin/posts', adminFilter.verifyLogin, adminFilter.verifyPostPermission, adminController.posts);
app.get('/admin/posts/new', adminFilter.verifyLogin, adminFilter.verifyPostPermission, adminController.newPost);
app.get('/admin/posts/:id', adminFilter.verifyLogin, adminFilter.verifyPostPermission, adminController.showPost);
app.post('/admin/posts/save', adminFilter.verifyLogin, adminFilter.verifyPostPermission, adminController.createPost);
app.put('/admin/posts/:id', adminFilter.verifyLogin, adminFilter.verifyPostPermission, adminController.updatePost);
app.get('/admin/posts/destroy/:id', adminFilter.verifyLogin, adminFilter.verifyPostPermission, adminController.destroyPost);
app.get('/admin/import', adminFilter.verifyLogin, adminFilter.verifyPostPermission, adminController.importer);
app.post('/admin/import/save', adminFilter.verifyLogin, adminFilter.verifyPostPermission, adminController.saveImport);
app.post('/admin/template/apply_template', adminFilter.verifyLogin, adminFilter.verifyTemplatePermission, adminController.applyTemplate);
app.put('/admin/template/set_file_content', adminFilter.verifyLogin, adminFilter.verifyTemplatePermission, adminController.setTemplateFileContent);
app.get('/admin/template/get_file_content', adminFilter.verifyLogin, adminFilter.verifyTemplatePermission, adminController.getTemplateFileContent);
app.get('/admin/template', adminFilter.verifyLogin, adminFilter.verifyTemplatePermission, adminController.templateIndex);
app.get('/admin/plugins', adminFilter.verifyLogin, adminFilter.verifyPluginPermission, adminController.pluginIndex);
app.post('/admin/plugins/set_config_variables', adminFilter.verifyLogin, adminFilter.verifyPluginPermission, adminController.setConfigVariables);
app.get('/admin/settings', adminFilter.verifyLogin, adminFilter.verifySettingsPermission, adminController.blogSettingsIndex);
app.post('/admin/settings/save', adminFilter.verifyLogin, adminFilter.verifySettingsPermission, adminController.saveBlogSettings);
app.get('/admin/users', adminFilter.verifyLogin, adminFilter.verifyUsersPermission, adminController.users);
app.put('/admin/users/update', adminFilter.verifyLogin, adminFilter.verifyUsersPermission, adminController.updateUser);
app.get('/admin/users/new', adminFilter.verifyLogin, adminFilter.verifyUsersPermission, adminController.newUser);
app.post('/admin/users/save', adminFilter.verifyLogin, adminFilter.verifyUsersPermission, adminController.saveUser);
app.get('/admin/users/destroy', adminFilter.verifyLogin, adminFilter.verifyUsersPermission, adminController.destroyUser);
app.get('/admin/comments', adminFilter.verifyLogin, adminFilter.verifyCommentPermission, adminController.comments);
app.get('/admin/comments/destroy', adminFilter.verifyLogin, adminFilter.verifyCommentPermission, adminController.destroyComment)
app.get('/admin/logout', adminFilter.verifyLogin, adminController.logout);
app.get('/admin/not_allowed', adminFilter.verifyLogin, adminController.notAllowed);

// Posts routes
app.get("/", runPlugin, postsController.index);
app.get("/page/:id", runPlugin, postsController.showPage);
app.get("/feed", postsController.feed);
app.get("/search", runPlugin, postsController.search);
app.get("/:id", runPlugin, postsController.show);
app.post("/:id/comments/save", postsController.saveComment);

bayeux.attach(app);
app.listen(3000);
console.log("Server on port %s", app.address().port);