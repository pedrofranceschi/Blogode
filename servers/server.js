exports.startServer = function(serverPort, clusterServerIp, clusterServerPort, clusterSocketPort) {
    var express = require("express")
    var sys = require("sys");
    var fs = require("fs");
    var dgram = require("dgram");
    var Events = require('events');
    var faye = require('faye');
    var Step = require('step');
    var child = require('child_process');
    var posts = require('../lib/posts');
    var users = require('../lib/users');
    var comments = require('../lib/comments');
    var config = require('../lib/config')
      , postsController = require('../controllers/posts')
      , pagesController = require('../controllers/pages')
      , adminController = require('../controllers/admin')
      , adminFilter = require('../filters/admin');

    // Configure cluster comunication

    if(clusterSocketPort != 0) {
        var message = new Buffer("Some bytes");
        var server = dgram.createSocket("udp4");
        var client = dgram.createSocket("udp4");
        client.send(message, 0, message.length, clusterServerPort, clusterServerIp.toString());
        client.close();
        
        // var server = dgram.createSocket("udp4");
        server.on("message", function (msg, rinfo) {
            if(rinfo.address == clusterServerIp && rinfo.port == clusterSocketPort) {
                console.log("[CLUSTER INSTANCE] Received commands from cluster server. Executing... ");
                console.log(msg);
            } else {
                console.log("[CLUSTER INSTANCE] [ERROR] Command origin is invalid. ");
            }
            // console.log("server got: " + msg + " from " +
            // rinfo.address + ":" + rinfo.port);
        });    
        server.on("listening", function () {
            var address = server.address();
            console.log("[CLUSTER INSTANCE] Initialized cluster instance socket on port " + address.port);
        });
        server.bind(clusterSocketPort);
    }
    
    // End of cluster config.. Normal app  
    
    var app = express.createServer();
    
    var blogConfig;
    config.getAllBlogConfigKeyValues(function(value) {
        blogConfig = value;
    });
    
    child.exec("ulimit -n 8192");
    
    app.configure(function() {
        app.use(express.logger());
        app.use(express.bodyDecoder());
        app.use(express.methodOverride());
        app.use(express.cookieDecoder());
        app.use(express.session());
        app.set('view engine', 'ejs');
        app.set('views', __dirname + '/../views');
        app.use(express.staticProvider(__dirname + '/../public'));
        app.set('view options', {
            layout: 'layout'
        });
        loadPlugins();
        pagesController.updatePagesCache();
        postsController.updateTagsCache();
        config.getBlogConfigKeyValue("current_template", function(value){
            adminController.applyThemeWithName(value, function(error){
                if(error != undefined) {
                    console.log("Error loading theme.")
                    process.exit()
                }
            })
        });
    });
    
    var loadedPlugins = {};
    var pluginConfigVars = {};
    function loadPlugins() {
        fs.readdir('./plugins', function(err, files) {
            if(err) {
                console.log("Error loading plugins: " + sys.inspect(err));
            }
            for (var i=0; i < files.length; i++) {
                var plugin = require('../plugins/' + files[i] + '/plugin.js').initialize();
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
        },
        pages: function(req, res) {
            return pagesController.getPagesCache();
        },
        tags: function(req, res) {
            return postsController.getTagsCache();
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
        
        // console.log('loaded: ' + sys.inspect(loadedPlugins));
        // if(loadedPlugins == {}) {
        //     console.log('equal')
        //     req.events.emit('pluginsAreLoaded');
        //     next();
        // }
        
        var execOrder = new Array();
        
        for(p in loadedPlugins) {
            execOrder.push(p);
        }
        
        req.plugins = {};
        
        function executeNextPlugin() {
            if(execOrder.length == 0) {
                setTimeout(function(){
                    req.events.emit('pluginsAreLoaded');
                }, 10);
                next();
            } else {
                loadedPlugins[execOrder[0]].run(req, res, function(response){
                    req.plugins[execOrder[0]] = response;
                    execOrder.splice(0, 1);
                    executeNextPlugin();
                });
            }
        };
        
        executeNextPlugin();
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
    app.get('/admin/pages', adminFilter.verifyLogin, adminFilter.verifyPagePermission, adminController.pages);
    app.get('/admin/pages/new', adminFilter.verifyLogin, adminFilter.verifyPagePermission, adminController.newPage);
    app.get('/admin/pages/:id', adminFilter.verifyLogin, adminFilter.verifyPagePermission, adminController.showPage);
    app.post('/admin/pages/save', adminFilter.verifyLogin, adminFilter.verifyPagePermission, adminController.createPage);
    app.put('/admin/pages/:id', adminFilter.verifyLogin, adminFilter.verifyPagePermission, adminController.updatePage);
    app.get('/admin/pages/destroy/:id', adminFilter.verifyLogin, adminFilter.verifyPagePermission, adminController.destroyPage);
    app.get('/admin/logout', adminFilter.verifyLogin, adminController.logout);
    app.get('/admin/not_allowed', adminFilter.verifyLogin, adminController.notAllowed);
    
    // Posts routes
    app.get("/", runPlugin, postsController.index);
    app.get("/pages/:name", runPlugin, pagesController.showPage);
    app.get("/page/:id", runPlugin, postsController.showPage);
    app.get("/tag/:tag", runPlugin, postsController.showTag);
    app.get("/feed", postsController.feed);
    app.get("/search", runPlugin, postsController.search);
    app.get("/:id", runPlugin, postsController.show);
    app.post("/:id/comments/save", postsController.saveComment);
    
    bayeux.attach(app);
    app.listen(serverPort);
    console.log("Server on port %s", app.address().port);
}