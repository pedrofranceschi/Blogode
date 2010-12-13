exports.verifyLogin = function (req, res, next) {
    // verifies if user is an admin
    
    if(!req.session.username) {
        return res.redirect("/admin/login");   
    }
    next();
};