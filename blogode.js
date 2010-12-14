var express = require("express")
var sys = require("sys");
var fs = require("fs");
var faye = require('faye');
var posts = require('./lib/posts');
var users = require('./lib/users');
var comments = require('./lib/comments');
var config = require('./lib/config')
  , homeController = require('./controllers/home')
  , adminController = require('./controllers/admin')
  , adminFilter = require('./filters/admin');

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
            var pluginInfo = plugin.initialize();
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
});

bayeux = new faye.NodeAdapter({
    mount: '/faye',
    timeout: 45
});


app.get('/admin/template', adminFilter.verifyLogin, function(req, res) {
    // returns the template file editor
    
    config.getBlogConfigKeyValue('current_template', function(value) {
        var templateInfos = new Array();
        fs.readdir('./public/templates', function(err, files) {
            for (var i=0; i < files.length; i++) {
                var content = fs.readFileSync('./public/templates/' + files[i] + '/info.json')
                var templateParser = JSON.parse(content);
                templateParser['template_folder_name'] = files[i];
                
                var isCurrentTheme = false;
                if(value == files[i]) {
                    isCurrentTheme = true;
                }
                
                templateParser['current_theme'] = isCurrentTheme;
                templateInfos.push(templateParser);
            }
            
            res.render('admin/template/index', {
                layout: false,
                locals: { 'template_infos': templateInfos }
            });
        });
    })
});

app.get('/admin/template/get_file_content', adminFilter.verifyLogin, function(req, res) {
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

app.put('/admin/template/set_file_content', adminFilter.verifyLogin, function(req, res) {
    // sets a template file some content
    
    if(req.param('content') == '' || req.param('content') == undefined) {
        return res.send("Content can't be blank!");
    }
    
    var fileToWrite = ""
    var templateFileToWrite = ""
    
    config.getBlogConfigKeyValue('current_template', function(value) {
        if(req.param('file_type') == 'layout') {
            fileToWrite = "./views/layout.ejs";
            templateFileToWrite = "./public/templates/" + value + "/layout.html"
        } else if(req.param('file_type') == 'index') {
            fileToWrite = "./views/posts/index.ejs";
            templateFileToWrite = "./public/templates/" + value + "/posts/index.html"
        } else if(req.param('file_type') == "post_show") {
            fileToWrite = "./views/posts/show.ejs";
            templateFileToWrite = "./public/templates/" + value + "/posts/show.html"
        } else if(req.param('file_type') == "stylesheet") {
            fileToWrite = "./public/stylesheet.css";
            templateFileToWrite = "./public/templates/" + value + "/stylesheet.css"
        } else {
            return res.send("File not found.");
        }
        
        fs.writeFile(fileToWrite, req.param('content'), function (err) {
            if (err) throw err;
            fs.writeFile(templateFileToWrite, req.param('content'), function (err) {
                if (err) throw err;
                return res.redirect('/admin/template')
            });
        });
    
    });
    
});

app.post('/admin/template/apply_template', adminFilter.verifyLogin, function(req, res) {
    // apply a template as the current template
    
    if(req.param('name') == '' || req.param('name') == undefined) {
        return res.send("Template name can't be blank!");
    }
    
    var templatePath = './public/templates/' + req.param('name');
    
    fs.readFile(templatePath + '/info.json', function(err, content) {
        if (err) {
            if(err.message.indexOf("No such file or directory") >= 0) {
                return res.send("Template not found");
            } else {
                return res.send("Unknown error")
            }
        }
        
        fs.readFile(templatePath + '/layout.html', function(err, content) {
            if (err) return res.send("Layout file not found");
            fs.writeFile('./views/layout.ejs', content, function (err) {
                fs.readFile(templatePath + '/posts/index.html', function(err, content) {
                    if (err) return res.send("Index not found");
                    fs.writeFile('./views/posts/index.ejs', content, function (err) {
                        fs.readFile(templatePath + '/posts/show.html', function(err, content) {
                            if (err) return res.send("Read post file not found");
                            fs.writeFile('./views/posts/show.ejs', content, function (err) {
                                fs.readFile(templatePath + '/stylesheet.css', function(err, content) {
                                    if (err) return res.send("Stylesheet not found");
                                    fs.writeFile('./public/stylesheet.css', content, function (err) {
                                        config.setBlogConfigKeyValue('current_template', req.param('name'), function() {
                                            return res.redirect('/admin/template');  
                                        })
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

//Admin Routes
app.get("/admin", adminFilter.verifyLogin, adminController.index);
app.get("/admin/login", adminController.login);
app.post("/admin/authenticate", adminController.authenticate);
app.get('/admin/posts', adminFilter.verifyLogin, adminController.posts);
app.get('/admin/posts/new', adminFilter.verifyLogin, adminController.newPost);
app.get('/admin/posts/:id', adminFilter.verifyLogin, adminController.showPost);
app.post('/admin/posts/save', adminFilter.verifyLogin, adminController.createPost);
app.put('/admin/posts/:id', adminFilter.verifyLogin, adminController.updatePost);
app.get('/admin/posts/destroy/:id', adminFilter.verifyLogin, adminController.destroyPost);

//Home routes
app.get("/", homeController.index);
app.get("/feed", homeController.feed);
app.get("/search", homeController.search);
app.get("/:id", homeController.show);

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