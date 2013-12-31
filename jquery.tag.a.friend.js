/**
 * PLUGIN_NAME
 * Version: VERSION
 * URL: URL
 * Description: DESCRIPTION
 * Requires: JQUERY_VERSION, OTHER_PLUGIN(S), ETC.
 * Author: AUTHOR (AUTHOR_URL)
 * Copyright: Copyright 2013 YOUR_NAME
 * License: LICENSE_INFO
 */

// Plugin closure wrapper
// Uses dollar, but calls jQuery to prevent conflicts with other libraries
// Semicolon to prevent breakage with concatenation
// Pass in window as local variable for efficiency (could do same for document)
// Pass in undefined to prevent mutation in ES3
;(function($, document, window, undefined) {
    // Optional, but considered best practice by some
    "use strict";

    // Name the plug-in so it's only in one place
    var pluginName = 'tagfriends2';

    // Default options for the plug-in as a simple object
    var defaults = {
        property: 'value',
        anotherProperty: 10
    };

    // Plug-in constructor
    // This is the boilerplate to set up the plug-in to keep our actual logic in one place
    function Plugin(element, options) {
        this.element = element;
        this.id = $(this.element).prop('id')+'-tagger';
        
        this.tagger = $('<div id="'+this.id+'" class="tagfriends-wrapper" contentEditable="true">asd <span contentEditable="false">test</span>asdas</div>');
    	this.suggs = $('<ul class="tagfriends-tags-container"></ul>').hide();
    	
    	$('body').append(this.suggs);
        
        $(this.element).before(this.tagger);  
        
        this.range = rangy.createRange();
        this.el = document.getElementById(this.id);
        this.anchorNode = this.anchorOffset = this.focusNode = this.focusOffset = 0;
        this.isCollapsed = true;
        this.suggestionsVisible = false;
        this.lastw = "";
        //console.log(this.id);

        /*var el = document.getElementById(this.id);
        
        range.selectNodeContents(el);
        var sel = rangy.getSelection();
        sel.setSingleRange(range);
        console.log(sel.toString());
        
        range.setStart(3);
        
        sel.setSingleRange(range);*/
        
        var instance = this;

        $(this.el).bind('click keyup mouseup', function(){
        	var range = rangy.createRange();
        	range.selectNodeContents(this);
        	
        	var sel = rangy.getSelection();
        	instance.anchorNode = sel.nativeSelection.anchorNode;
        	instance.anchorOffset = sel.anchorOffset;
        	instance.focusNode = sel.nativeSelection.focusNode;
        	instance.focusOffset = sel.focusOffset;
        	instance.isCollapsed = sel.isCollapsed;
        	
        	/*console.log('anchorNode ' + instance.anchorNode.nodeValue);
        	console.log('anchorOffset ' + instance.anchorOffset);
        	console.log('focusNode ' + instance.focusNode.nodeValue);
        	console.log('focusOffset ' + instance.focusOffset);
        	console.log('isCollapsed ' + instance.isCollapsed);*/
        	
        	if(isTag(instance) && instance.isCollapsed === true){
        		suggest(instance);
        	}
        	else{
        		suggest(instance);
        	}
        });
        
        /*$(this.el).bind('click', function(){
        	var range = rangy.createRange();
        	range.selectNodeContents(this);
        	
        	var sel = rangy.getSelection();
        	
        	var sp1 = document.createElement('span');
        	sp1.appendChild(document.createTextNode("yo"));

        	var sp2 = sel.anchorOffset;
        	var parentDiv = this;

        	//parentDiv.insertBefore(sp1, sp2);
        });
        */
        // Merge the options given by the user with the defaults
        this.options = $.extend({}, defaults, options)

        // Attach data to the element
        this.$el      = $(element);
        this.$el.data(name, this);

        this._defaults = defaults;

        var meta      = this.$el.data(name + '-opts');
        this.opts     = $.extend(this._defaults, options, meta);

        this.init();
        
    }

    Plugin.prototype = {
        // Public functions accessible to users
        init: function() {
        	
        }    
    };

    $.fn[pluginName] = function(options) {
        // Iterate through each DOM element and return it
        return this.each(function() {
            // prevent multiple instantiations
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
            }
        });
    };
    
    var getClosestBefore = function(text, offset){
    	for ( var int = offset; int > 0; int--) {
			if(text[int] == '@'){
				return int;
			}
		}
    	return 0;
    }
    
    var getClosestAfter = function(text, offset){
    	for ( var int = offset; int < text.length; int++) {
			if(text[int] == '@'){
				return int;
			}
		}
    	return text.length;
    }

    // Private function that is only called by the plugin
    var isTag = function(i) {
    	var text = i.focusNode.nodeValue;
    	if(text == null) text = '';
    	var tags = text.split('@');
    	
    	var ws = getClosestBefore(text, i.focusOffset);
    	var we = getClosestAfter(text, i.focusOffset);
    	
    	if(we == ws) we = text.length;
    	
    	i.lastw = text.substr(ws, we);
    	console.log(i.lastw);
    	
    	return i.lastw.trim().substr(0, 1) == '@';
    }
    
    var addTag = function(i, val, txt){
    	var range = rangy.createRange();
    	range.selectNodeContents(i.el);
    	
    	var sel = rangy.getSelection();
    	var sp1 = document.createElement('span');
    	$(sp1).attr('data-id', val);
    	$(sp1).attr('contentEditable', 'false');
    	sp1.appendChild(document.createTextNode(txt));
    	
    	var sp2 = sel.anchorOffset;
    	i.el.insertBefore(sp1, sp2);
    }
    
    var hideSuggetions = function(i){
    	i.suggs.hide();
    }
    
    var showSuggetions = function(i){    	
    	$.ajax({
		  url: i.opts.url,
		  context: document.body
		}).done(function(data) {
			$.each(data.ret.data, function(index, v){
				var li = $('<li><a data-val="'+v.id+'" href="">'+v.text+'</a></li>');
				$(i.suggs).append(li);
			});
		});
    	

        i.suggs.find('a').bind('click', function(e){
        	e.preventDefault();
        	addTag(i, $(this).data('val'), $(this).text());
        	return false;
        });

    	
    	var pos = $(i.tagger).offset();
    	pos.top = pos.top + $(i.tagger).height();
    	i.suggs.offset(pos).show();
    }

})(jQuery, document, window);