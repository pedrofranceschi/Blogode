var config = require ("../lib/config");
var postsController = require("./posts.js")
var pages = require("../lib/pages.js");

var pagesCache;

exports.updatePagesCache = function() {
    pages.getPages(function(pages){
        global.pagesCache = pages;
    });
}

exports.getPagesCache = function() {
    return global.pagesCache;
}

// exports.index = function(req, res) {
//     // TODO: cache current page to avoid disk I/O.
//     config.getBlogConfigKeyValue('index_page', function(page){
//         if(page == '0') {
//             postsController.index(req, res);
//         } else {
//             
//         }
//     });
// }

exports.showPage = function(req, res) {
    if(!req.param('name')) {
        return res.send("A page ID is needed.")
    }
    
    pages.getPageByLinkName(req.param('name'), function(page){
        req.events.on('pluginsAreLoaded', function() {
            res.render('pages/show', {
                locals: { 'page': page }
            });
        });
    });
}