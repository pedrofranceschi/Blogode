var sys = require("sys");

exports.verifyLogin = function (req, res, next) {
    // verifies if user is an admin
    
    if(!req.session.username) {
        return res.redirect("/admin/login");   
    }
    next();
};

exports.verifyPostPermission = function (req, res, next) {
    // verifies if user have permission to manage posts
    
    if(req.session.user_permission.toString().indexOf("1") < 0) {
        return res.redirect("/admin/not_allowed");
    }
    next();
};

exports.verifyTemplatePermission = function (req, res, next) {
    // verifies if user have permission to manage templates
    
    if(req.session.user_permission.toString().indexOf("2") < 0) {
        return res.redirect("/admin/not_allowed");
    }
    next();
};

exports.verifyPluginPermission = function (req, res, next) {
    // verifies if user have permission to manage plugins
    
    if(req.session.user_permission.toString().indexOf("3") < 0) {
        return res.redirect("/admin/not_allowed");
    }
    next();
};

exports.verifySettingsPermission = function (req, res, next) {
    // verifies if user have permission to manage blog settings
    
    if(req.session.user_permission.toString().indexOf("4") < 0) {
        return res.redirect("/admin/not_allowed");
    }
    next();
};

exports.verifyUsersPermission = function (req, res, next) {
    // verifies if user have permission to manage users
    
    if(req.session.user_permission.toString().indexOf("5") < 0) {
        return res.redirect("/admin/not_allowed");
    }
    next();
};