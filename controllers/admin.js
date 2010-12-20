var sys = require("sys")
, fs = require("fs");

var users = require('../lib/users')
, posts = require('../lib/posts')
, config = require('../lib/config')
, pluginsLib = require('../lib/plugins');

var plugins = {};

exports.setPlugins = function(plugins_) {
    plugins = plugins_;
}

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

    users.verifyCredentials(req.param('username'), req.param('password'), function(isValidUser, userId, permissionLevel){
        if(isValidUser) {
            req.session.username = req.param('username');
            req.session.user_id = userId;
            req.session.user_permission = permissionLevel;
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


exports.templateIndex = function(req, res) {
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
};

exports.getTemplateFileContent = function(req, res) {
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

};

exports.setTemplateFileContent = function(req, res) {
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

};

exports.applyTemplate = function(req, res) {
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
};

exports.pluginIndex = function(req, res) {
    // returns the plugin manager

    pluginsLib.getPluginConfigValues(function(data){
        res.render('admin/plugins/index', {
            layout: false,
            locals: { 'plugins': plugins, 'pluginValues': data }
        });
    });
};

exports.setConfigVariables = function(req, res) {
    // sets a plugin's config variable(s)

    var plugin = plugins[req.param("call_name")];
    var pluginConfig = {};
    for(var i=0; i < plugin.configVariables.length; i++) {
        pluginConfig[plugin.configVariables[i].access_name] = req.param(plugin.configVariables[i].access_name)
    }
    pluginsLib.setPluginConfigValues(req.param("call_name"), pluginConfig, function(callback){
        res.redirect("/admin/plugins");
    });    
};

exports.blogSettingsIndex = function(req, res) {
    config.getAllBlogConfigKeyValues(function(configData) {
        res.render('admin/settings/index', {
            layout: false,
            locals: { 'configKeys': configData }
        });
    });
};

exports.saveBlogSettings = function(req, res) {
    // /admin/settings/save
    
    config.getAllBlogConfigKeyValues(function(configData) {
        var objectToWrite = {};
        for(key in configData) {
            objectToWrite[key] = req.param(key);
        }
        config.setAllBlogConfigKeyValues(objectToWrite, function(){
            return res.redirect('/admin/settings')
        });
    });
};

exports.logout = function(req, res) {
    req.session.destroy();
    
    return res.redirect('/admin/login')
};

exports.notAllowed = function(req, res) {
    res.render('admin/not_allowed', {
        layout: false
    });
};

exports.users = function(req, res) {
    users.getUsers(function(users){    
        res.render('admin/users/index', {
            layout: false,
            locals: { 'users': users }
        });
    });
};

exports.updateUser = function(req, res) {
    if(!req.param('id')) {
        return res.send("A user id is needed.");
    }
    
    var permissionLevel = "";
    
    if(req.param('manage_posts') == 'on') { permissionLevel += 1; }
    if(req.param('manage_templates') == 'on') { permissionLevel += 2; }
    if(req.param('manage_plugins') == 'on') { permissionLevel += 3; }
    if(req.param('manage_settings') == 'on') { permissionLevel += 4; }
    if(req.param('manage_users') == 'on') { permissionLevel += 5; }
    
    users.updateUser(req.param('id'), permissionLevel, req.param('name'), req.param('description'), req.param('email'), req.param('username'), req.param('password'), function(){
        return res.redirect('/admin/users')
    });
};

exports.newUser = function(req, res) {
    res.render('admin/users/new', {
        layout: false
    });
};

exports.saveUser = function(req, res) {
    var permissionLevel = "";
    
    if(req.param('manage_posts') == 'on') { permissionLevel += 1; }
    if(req.param('manage_templates') == 'on') { permissionLevel += 2; }
    if(req.param('manage_plugins') == 'on') { permissionLevel += 3; }
    if(req.param('manage_settings') == 'on') { permissionLevel += 4; }
    if(req.param('manage_users') == 'on') { permissionLevel += 5; }
    
    users.createUser(permissionLevel, req.param('name'), req.param('description'), req.param('email'), req.param('username'), req.param('password'), function(){
        return res.redirect('/admin/users')
    });
};

exports.destroyUser = function(req, res) {
    if(!req.param('id')) {
        return res.send("A user id is needed.");
    }
    
    users.destroyUser(req.param('id'), function(){
        return res.redirect('/admin/users');
    });
};