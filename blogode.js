var express = require("express")
var sys = require("sys");
var fs = require("fs");
var Events = require('events');
var faye = require('faye');
var Step = require('step');
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

var loadedPlugins = {};
function loadPlugins() {
    fs.readdir('./plugins/', function(err, files) {
        for (var i=0; i < files.length; i++) {            
            var plugin = require('./plugins/' + files[i] + '/plugin.js').initialize();
            var pluginInfo = plugin.pluginInfos;
            loadedPlugins[pluginInfo[0]] = plugin;
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
    },
    plugins: function(req, res) {
        return req.plugins;
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
    },
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

function runPlugin(req, res, next) {
    req.events = events;
    sys.puts('running plugin')
    Step(
        function () {
            sys.puts('run 2')
            for(var p in loadedPlugins) {
                sys.puts('run 3')
                //calling this.parallel() means that we dump the results of each call
                //in order into tne next functions arguments array.
                sys.puts('loadedPlugins[p]: ' + sys.inspect(loadedPlugins[p]));
                loadedPlugins[p].run(req, res, this.parallel());
                sys.puts('this: ' + sys.inspect(this))
            }
            sys.puts('run 4')
        },
        function(err) {
            sys.puts('run 6')
            // if(err) throw err;
            sys.puts('run 7')

            // we want to create an  array of plugins aligned with the remaining
            // arguments in this function. To do this, I created a 1 element array
            // and pushed the remaining names in order onto that array. Then, when
            // we iterate through the arguments list, I can use the same index
            // for both arrays to assemble my final result.
            var pluginNames = [];
            for(var p in loadedPlugins) {
                sys.puts('run 7')
                pluginNames.push(p);
            }
            
            sys.puts('run 8')

            req.plugins = {};
            for(var p in loadedPlugins) {
                sys.puts('in loop!!!')
                req.plugins[p] = arguments[0];
            }
            sys.puts('plugins: ' + sys.inspect(req.plugins));
            sys.puts('run 9')

            req.events.emit('pluginsAreLoaded_' + req.session.lastAccess);
        }
    );
    next();
}


// Posts routes
app.get("/", runPlugin, postsController.index);
app.get("/feed", postsController.feed);
app.get("/search", runPlugin, postsController.search);
app.get("/:id", runPlugin, postsController.show);
app.post("/:id/comments/save", postsController.saveComment);

bayeux.attach(app);
app.listen(3000);
console.log("Server on port %s", app.address().port);