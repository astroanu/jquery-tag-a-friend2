THIS PLUGIN IS NOT UNDER DEVELOPMENT ANYMORE. IF YOU HAVE FIXES SEND A MERGE REQUEST.

jQuery Tag a Friend
=========

Documentation and demos : http://astroanu.github.io/jquery-tag-a-friend2

This is a plugin to tag friends just like in facebook. It supports multiple tags in text and also includes url detection. These are some of the key features.

  - Custom BB code format for templating text
  - Scrape urls callback
  - Turn on off duplicate tagging

Requirements
--------------
The plugin requires jQuery (tested on 1.9) and Rangy 1.2.3. If you're using the minified Rangy included version no need of including Rangy seperately.

Usage
-------

You can initialize the plugin by calling tagfriends2 on a text area or an input

````
$('#postbox').tagfriends2({
    url:'/url_to_fetch_data_from.php',
});
````


License
----

MIT

    
