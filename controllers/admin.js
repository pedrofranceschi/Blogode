var sys = require("sys")
, fs = require("fs");

var users = require('../lib/users')
, posts = require('../lib/posts')
, pages = require('../lib/pages')
, config = require('../lib/config')
, tags = require('../lib/tags')
, comments = require('../lib/comments')
, importer = require("../lib/importer")
, pluginsLib = require('../lib/plugins')
, postsController = require('../controllers/posts')
, pagesController = require('../controllers/pages');

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

	console.log('params: ' + sys.inspect(req.param))

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
    
    posts.getPosts(0, 0, function (err, posts){
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
    
    var tagsArr = new Array();
    
    if(req.param('tags').indexOf(",") >= 0) {
        var preTags = req.param('tags').split(',');
        for(var i=0; i < preTags.length; i++) {
            tagsArr.push(preTags[i].replace(/^\s*|\s*$/g,''))
        } 
    } else if(req.param('tags') != "") {
        tagsArr.push(req.param('tags'));
    }
    
    posts.createPost(req.param('title'), req.param('body'), req.session.user_id, 0, function(postId) {
        tags.createTagsForPost(postId, tagsArr, function(){
			global.sendCommandToClusterServer("DESTROY_CACHE_POSTS");
			global.sendCommandToClusterServer("DESTROY_CACHE_TAGS");
            postsController.destroyCache();
            postsController.updateTagsCache();
            return res.redirect('/admin/posts/' + postId);
        });
    });
};

exports.updatePost = function(req, res) {
    // updates a post

    if(!req.param('title') || !req.param('body')) {
        return res.redirect("/admin/posts/new");
    }
    
    var tagsArr = new Array();
    
    if(req.param('tags').indexOf(",") >= 0) {
        var preTags = req.param('tags').split(',');
        for(var i=0; i < preTags.length; i++) {
            tagsArr.push(preTags[i].replace(/^\s*|\s*$/g,''))
        } 
    } else if(req.param('tags') != "") {
        tagsArr.push(req.param('tags'));
    }
    
    posts.updatePost(req.param('id'), req.param('title'), req.param('body'), function() {
        tags.deletePostTags(req.param('id'), function(){
            tags.createTagsForPost(req.param('id'), tagsArr, function(){
				global.sendCommandToClusterServer("DESTROY_CACHE_POSTS");
				global.sendCommandToClusterServer("DESTROY_CACHE_TAGS");
                postsController.destroyCache();
                postsController.updateTagsCache();
                return res.redirect('/admin/posts/' + req.param('id'));
            });
        });
    });
};

exports.destroyPost = function(req, res) {
    // destroys a post

    if(!req.param('id')) {
        return res.redirect("/admin/posts/");
    }
    posts.destroyPost(req.param('id'), function () {
        tags.deletePostTags(req.param('id'), function(){
			global.sendCommandToClusterServer("DESTROY_CACHE_POSTS");
			global.sendCommandToClusterServer("DESTROY_CACHE_TAGS");
            postsController.destroyCache();
            postsController.updateTagsCache();
            return res.redirect('/admin/posts/')
        });
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
    
    config.getBlogConfigKeyValue('current_template', function(value) {
        var fileToRead = ""
        if(req.param('file_type') == 'layout') {
            fileToRead = "./public/templates/" + value + "/layout.html";
        } else if(req.param('file_type') == 'index') {
            fileToRead = "./public/templates/" + value + "/posts/index.html";
        } else if(req.param('file_type') == "post_show") {
            fileToRead = "./public/templates/" + value + "/posts/show.html";
        } else if(req.param('file_type') == "page_show") {
            fileToRead = "./public/templates/" + value + "/pages/show.html";
        } else if(req.param('file_type') == "search_results") {
            fileToRead = "./public/templates/" + value + "/posts/search.html";
        } else if(req.param('file_type') == "stylesheet") {
            fileToRead = "./public/templates/" + value + "/stylesheet.css";
        } else {
            return res.send("File not found.");
        }
        
        fs.readFile(fileToRead, function(err, content) {
            if (err) throw err;
            return res.send(content);
        });
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
        } else if(req.param('file_type') == "page_show") {
            fileToWrite = "./views/pages/show.ejs";
            templateFileToWrite = "./public/templates/" + value + "/pages/show.html"
        } else if(req.param('file_type') == "stylesheet") {
            fileToWrite = "./public/stylesheet.css";
            templateFileToWrite = "./public/templates/" + value + "/stylesheet.css"
        } else if(req.param('file_type') == "search_results"){
            fileToWrite = "./views/posts/search.ejs";
            templateFileToWrite = "./public/templates/" + value + "/posts/search.html"
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

    if(!req.param('name')) {
        return res.send("Template name can't be blank!");
    }
    exports.applyThemeWithName(req.param('name'), function(error){
        if(error != undefined) {
            return res.send(error);
        } else {
            return res.redirect('/admin/template');
        }
    });
};

exports.applyThemeWithName = function(name, callback) {
    var templatePath = './public/templates/' + name;

    fs.readFile(templatePath + '/info.json', function(err, content) {
        if (err) {
            if(err.message.indexOf("No such file or directory") >= 0) {
                callback("Template not found");
            } else {
                callback("Unknown error")
            }
        }

        fs.readFile(templatePath + '/layout.html', function(err, content) {
            if (err) callback("Layout file not found");
            fs.writeFile('./views/layout.ejs', content, function (err) {
                fs.readFile(templatePath + '/posts/index.html', function(err, content) {
                    if (err) callback("Index not found");
                    fs.writeFile('./views/posts/index.ejs', content, function (err) {
                        fs.readFile(templatePath + '/posts/show.html', function(err, content) {
                            if (err) callback("Read post file not found");
                            fs.writeFile('./views/posts/show.ejs', content, function (err) {
                                fs.readFile(templatePath + '/pages/show.html', function(err, content) {
                                    if (err) callback("Read page file not found");
                                    fs.writeFile('./views/pages/show.ejs', content, function (err) {
                                        fs.readFile(templatePath + '/posts/search.html', function(err, content) {
                                            if(err) callback("Search file not found.");
                                            fs.writeFile('./views/posts/search.ejs', content, function (err) {
                                                fs.readFile(templatePath + '/stylesheet.css', function(err, content) {
                                                    if (err) callback("Stylesheet not found");
                                                    fs.writeFile('./public/stylesheet.css', content, function (err) {
                                                        config.setBlogConfigKeyValue('current_template', name, function() {
                                                            callback();  
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
    if(req.param('manage_comments') == 'on') { permissionLevel += 2; }
    if(req.param('manage_pages') == 'on') { permissionLevel += 3; }
    if(req.param('manage_templates') == 'on') { permissionLevel += 4; }
    if(req.param('manage_plugins') == 'on') { permissionLevel += 5; }
    if(req.param('manage_settings') == 'on') { permissionLevel += 6; }
    if(req.param('manage_users') == 'on') { permissionLevel += 7; }
    
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
    if(req.param('manage_comments') == 'on') { permissionLevel += 2; }
    if(req.param('manage_pages') == 'on') { permissionLevel += 3; }
    if(req.param('manage_templates') == 'on') { permissionLevel += 4; }
    if(req.param('manage_plugins') == 'on') { permissionLevel += 5; }
    if(req.param('manage_settings') == 'on') { permissionLevel += 6; }
    if(req.param('manage_users') == 'on') { permissionLevel += 7; }
    
    users.createUser(permissionLevel, req.param('name'), req.param('description'), req.param('email'), req.param('username'), req.param('password'), function(userId){
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

exports.importer = function(req, res) {
    res.render('admin/posts/import', {
        layout: false
    });
};

exports.saveImport = function(req, res) {
    if(!req.param('xml')) {
        return res.send("Missing parameters.");
    }

	global.sendCommandToClusterServer("DESTROY_CACHE_POSTS");
	global.sendCommandToClusterServer("DESTROY_CACHE_TAGS");
	
    postsController.destroyCache();
    importer.importXMLDump(req.param('xml'), function(){
        return res.redirect("/admin/posts");
    });
};

exports.comments = function(req, res) {
    comments.getComments(0, 0, function(comments){
        res.render('admin/comments/index', {
            layout: false,
            locals: { 'comments': comments }
        });
    });
};

exports.destroyComment = function(req, res) {
    if(!req.param('id')) {
        return res.send("A comment id is needed");
    }
    
    comments.destroyComment(req.param('id'), function(){
        return res.redirect('/admin/comments');
    });
};

exports.pages = function(req, res) {
    pages.getPages(function(pages){
        res.render('admin/pages/index', {
            layout: false,
            locals: { 'pages': pages }
        });
    });
};

exports.newPage = function(req, res) {
    res.render('admin/pages/new', {
        layout: false
    });
};

exports.showPage = function(req, res) {
    pages.getPage(req.param('id'), function (page){
        res.render('admin/pages/edit', {
            layout: false,
            locals: { 'page': page }
        });
    });
};

exports.createPage = function(req, res) {
    if(!req.param('title') || !req.param('body')) {
        return res.redirect("/admin/pages/new");
    }
    pages.createPage(req.param('title'), req.param('body'), req.session.user_id, 0, function(postId) {
		global.sendCommandToClusterServer("DESTROY_CACHE_PAGES");
        pagesController.updatePagesCache();
        return res.redirect('/admin/pages/' + postId);
    });
};

exports.updatePage = function(req, res) {
    if(!req.param('title') || !req.param('body') || !req.param('id')) {
        return res.redirect("/admin/pages/new");
    }
    pages.updatePage(req.param('id'), req.param('title'), req.param('body'), function() {
		global.sendCommandToClusterServer("DESTROY_CACHE_PAGES");
        pagesController.updatePagesCache();
        return res.redirect('/admin/pages/' + req.param('id'));
    });
};

exports.destroyPage = function(req, res) {
    if(!req.param('id')) {
        return res.redirect("/admin/pages/");
    }
    pages.destroyPage(req.param('id'), function () {
        pagesController.updatePagesCache();
		global.sendCommandToClusterServer("DESTROY_CACHE_PAGES");
        return res.redirect('/admin/pages/')
    });
};