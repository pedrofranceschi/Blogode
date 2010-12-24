---
title: Docs
layout: default
---

Docs
=====================

How to create plugins and themes to Blogode.

Plugins How-To
----------

Creating a plugin to Blogode is as easy as creating a normal Node.js script.

The first step is to create a folder inside the plugins folder. The main plugin file is called **plugin.js**. All the plugin files, like other Javascript files and/or HTML views should be placed in the plugin folder.

**The plugin.js file**

The structure of the plugin.js file is like that:

	1: var pluginHelper = require("../../lib/helper");
	2: 
	3: exports.initialize = function () {
	4:     return {
	5:         pluginInfos: {
	6:             "call_name": "my_plugin",
	7:             "name": "My Plugin", 
	8:             "description": "My First Plugin", 
	9:             "creator_name": "Pedro Franceschi", 
	10:            "creator_email": "pedrohfranceschi@gmail.com", 
	11:            "version": "0.1"
	12:         },
	13:         configVariables: [
	14:         ],
	15:         run: function(req, res, callback) {
	16:             callback("This is just an example");
	17:         }
	18:     }
	19: }
	
**Plugin structure**

In line 1, we require the pluginHelper module, that will help to do things like rendering an HTML view or accessing  plugin preferences.

The main function of plugin.js is the initialize, that is declared in the line 3 up to the line 19. In line 4, we will return an object that is the plugin body. 

Your code will enter between lines 15 and 17.

**Plugin informations**

From line 5 to line 12, we define all the plugin informations. Here's what each of them represents:

* call_name: The name to call the plugin from the theme. Can't have spaces or any special characters.
* name: Plugin's name. Can have any kind of character.
* description: Plugin's description. Can have any kind of character.
* creator_name: The name of the plugin's author. Can have any kind of character.
* creator_email: A valid email address to get in touch with the plugin's creator. Can't have spaces or any special characters.
* version: The version of the plugin. Just numbers, characters (non-special) or pontuations.

**Calling a plugin**

To call a plugin from the HTML code (of the template), you just need to do this:

	<%= plugins.call_name %>
	
(replace the call_name with the call name you have setted to your plugin )

**Config variables**

Config variables are variables that the users that have permissions to manage plugins in the admin panel of Blogode, can change. Those variables are usually used to store a plugin preference, like the background color of a widget or the API key to interact with other web services.

In line 13 and 14, we don't have any config variable added. To add one, the code would be:

	configVariables: [
		{"access_name": "my_variable", "name": "Test variable", 
		"description": "A test variable", "field_type": "text"}
	],
	
(note that you can add multiple config variables)

**Returning content to the view**

After executing your code, you may want to return some HTML to the view. This is useful for plugins that need an interface 