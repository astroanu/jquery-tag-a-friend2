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
		url:'',
    	pageStart:1,
    	pageKey:'curpage',
    	pagePerKey:'pg_lmt',
    	pagePer:10,
    	queryKey:'q',
    	dataObj:['ret','data'],
    	tagFormat:'[@%?]',
    	allowDuplicates:false,
    	debug:false
    };
    
    //indexOf for old browsers
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (elt /*, from*/) {
            var len = this.length >>> 0;
            var from = Number(arguments[1]) || 0;
            from = (from < 0) ? Math.ceil(from) : Math.floor(from);
            if (from < 0) from += len;

            for (; from < len; from++) {
                if (from in this && this[from] === elt) return from;
            }
            return -1;
        };
    }

    // Plug-in constructor
    // This is the boilerplate to set up the plug-in to keep our actual logic in one place
    function Plugin(element, options) {
        this.element = element;
        this.id = $(this.element).prop('id')+'-tagger';
        
        this.tagger = $('<div id="'+this.id+'" class="tagfriends-wrapper" contentEditable="true"></div>');
    	this.suggs = $('<ul class="tagfriends-tags-container"></ul>').hide();
    	
    	$('body').append(this.suggs);
        
        $(this.element).before(this.tagger);  
        
        rangy.init();
        this.range = rangy.createRangyRange();
        this.el = document.getElementById(this.id);
        this.anchorNode = this.anchorOffset = this.focusNode = this.focusOffset = 0;
        this.isCollapsed = true;
        this.suggestionsVisible = false;
        this.suggestionsDisabled = false;
        this.suggestionsHover = false;
        this.activeTagNode = null;
        this.lastw = "";     
        this.tagged = [];

        var instance = this;

        $(this.el).bind('click keyup', function(e){
        	instance.range = rangy.createRangyRange();
        	instance.range.selectNodeContents(this);
        	
        	var sel = rangy.getSelection();
        	instance.anchorNode = sel.anchorNode;
        	instance.anchorOffset = sel.anchorOffset;
        	instance.focusNode = sel.focusNode;
        	instance.focusOffset = sel.focusOffset;
        	instance.isCollapsed = sel.isCollapsed;
        	
        	/*console.log('anchorNode ' + instance.anchorNode.nodeValue);
        	console.log('anchorOffset ' + instance.anchorOffset);
        	console.log('focusNode ' + instance.focusNode.nodeValue);
        	console.log('focusOffset ' + instance.focusOffset);
        	console.log('isCollapsed ' + instance.isCollapsed);*/
        	//console.log('-----------------------------');
        	//console.log('suggdisd: '+instance.suggestionsDisabled);        	
        	
        	if(e.keyCode == 8 || e.keyCode == 39){
        		endSpacer(instance);
        	}
        	
        	if(e.keyCode == 8 || e.keyCode == 46){
        		deleteTag(instance);
        	}        	
        	
        	if(e.keyCode == 40){
        		instance.suggs.find('a').first().focus();
        	}
        	
        	isSuggestible(instance, function(d){
        		//console.log('isSuggestible callback '+d);
        		instance.suggestionsDisabled = d;
        	});
        	//console.log('suggdisd2: '+instance.suggestionsDisabled);
        	if(isTag(instance) === true && instance.isCollapsed === true && instance.suggestionsVisible === false){
        		suggest(instance, function(d){
        			//console.log('suggest callback ' +d);
        			instance.suggestionsDisabled = d;
        		});
        	}
        	else{
        		hideSuggest(instance);
        	}
        	//console.log('suggdisd3: '+instance.suggestionsDisabled);
        });
        
        $(this.suggs).on('scroll', function(e) {
            e.preventDefault();
        });
        
        $(this.suggs).on({
            mouseenter: function () {
            	instance.suggestionsHover = true;
            },
            mouseleave: function () {
            	instance.suggestionsHover = false;
            }
        }, function(){
        	console.log(instance.suggestionsHover);
        });
        
        $(this.suggs).on('keypress keyup', 'a', function(e){
        	if(e.keyCode == 38){
        		e.preventDefault();
        		$(this).parent().prev().children('a').focus();
        	}
        	
        	if(e.keyCode == 40){
        		e.preventDefault();
        		$(this).parent().next().children('a').focus();
        	}
        	
        	if(e.keyCode == 27){
        		hideSuggest(instance);
        		instance.range.setStartAfter(instance.range.anchorNode);
        	}
        });
        
        $(this.el).on('paste', function (e) {
        	try{
	        	e.preventDefault();
	        	var txt = '';
	        	
	        	if(e.originalEvent.clipboardData !== undefined){
	        		txt = e.originalEvent.clipboardData.getData('Text');
	        	}else if(window !== undefined){
	        		txt = window.clipboardData.getData('Text');
	        	}
	
	        	var p = document.createTextNode(txt);
	        	instance.range.selectNodeContents(instance.focusNode);
	        	instance.range.setStart(instance.focusNode, instance.focusOffset);    	
		    	
		    	instance.range.insertNode(p);
		    	
		    	instance.range.setStartAfter(p);
		    	instance.range.setEndAfter(p); 
		    	rangy.getSelection().removeAllRanges();
		    	rangy.getSelection().addRange(instance.range);
        	}
        	catch(e){
        		if(instance.opts.debug === true){console.log(e);}       		
        	}
    	});
        
        $(this.el).on('paste', '.tag', function(e){ 
        	e.preventDefault();
        	return false;
        });
        
        $(this.el).on('click', '.tag', function(){        	
        	if($(this).hasClass('tag')){
        		$(this).parent().find('.tag').removeClass('active');
        		$(this).addClass('active');
        	}
        });
        
        $(this.el).on('blur click keypress keyup', function(e){
        	if(e.keyCode == 13){
        		e.preventDefault();
        	}
        	drawBBCode(instance);
        	if($(instance.anchorNode).parents('.tag').length == 0){
        		$(this).find('.tag').removeClass('active');
        	}
        });

        // Merge the options given by the user with the defaults
        this.options = $.extend({}, defaults, options);

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

    $.fn[pluginName] = function(methodOrOptions) {
    	var methods = {
	        refresh : function() { 

	        }
	    };
        // Iterate through each DOM element and return it
    	
    	if ( methods[methodOrOptions] ) {
            return methods[ methodOrOptions ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof methodOrOptions === 'object' || ! methodOrOptions ) {
            // Default to "init"
        	return this.each(function() {
                // prevent multiple instantiations
                if (!$.data(this, 'plugin_' + pluginName)) {
                    $.data(this, 'plugin_' + pluginName, new Plugin(this, methodOrOptions));
                }
            });
        } else {
            $.error( 'Method ' +  methodOrOptions + ' does not exist on jQuery.' + pluginName);
        }        
    };
    
    var drawBBCode = function(i){
    	try{
	    	if(i.range != null){
		    	var nodes = i.range.getNodes();
		    	var bb = ''; var ltxt = '';
		    	$.each(nodes, function(index, value){
		    		switch ($(value).prop('tagName')) {
						case 'SPAN':
							if($(value).hasClass('tag')){
								bb += i.opts.tagFormat.replace('%?', $(value).data('id'));
								ltxt = $(value).text();
		    				}
							break;
			
						case undefined:
							if( $(value).text() !=ltxt){
								bb += ' ' + $(value).text() + ' ';
							}
							break;
					}
		    	});
		
		
				bb = bb.replace( /[\s\n\r]+/g, ' ' );
				$(i.element).val(bb);
	    	}
	    }
		catch(e){
			if(i.opts.debug === true){console.log(e);}       		
		}
    }
    
    var deleteTag = function(i){
    	var tag = $(i.focusNode).parents('.tag');
    	for (var key in i.tagged) {
    	    if (i.tagged[key] == tag.data('id')) {
    	    	i.tagged.splice(key, 1);
    	    	tag.remove();
    	    }
    	}    	
    }
    
    var endSpacer = function(i){
    	if(i.focusNode != null){
	    	var str = i.focusNode.toString();
		 	var len = str.length;
		 	//console.log(str.charCodeAt( len-1));
		 	//console.log(str.substr(len, -1));
		 	if(str.substr(len, -1) != ' '){
		 		var s = document.createTextNode(' ');
			 	$(i.el).append(s);
		 	}		 	
    	}
    }
    
    var getClosestBefore = function(text, offset){
    	text = text.split('');
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
    
    var isSuggestible = function(i, callback){
    	if(i.focusNode != null){
	    	var text = i.focusNode.nodeValue;
	    	if(text == null) text = '';
	    	var tags = text.split('@');
	    	
	    	var ws = getClosestBefore(text, i.focusOffset);
	    	var we = getClosestAfter(text, i.focusOffset);
	    	
	    	if(we == ws) we = text.length;
	    	
	    	var neww = text.substring(ws, we);
	    	
	    	//console.log('new: '+ neww+' old: '+i.lastw);
	    	
	    	callback(neww == i.lastw); 
    	}
    }

    // Private function that is only called by the plugin
    var isTag = function(i) {
    	if(i.focusNode != null){
	    	var text = i.focusNode.nodeValue;
	    	if(text == null) text = '';
	    	var tags = text.split('@');

	    	var ws = getClosestBefore(text, i.focusOffset);
	    	var we = getClosestAfter(text, i.focusOffset);
	    	
	    	//console.log(ws + ' ' + we);
	    	
	    	if(we == ws) we = text.length;
	    	
	    	i.lastw = text.substring(ws, we);
	
	    	//console.log('lastw: ' + i.lastw);
	    	
	    	var tl = $.trim(i.lastw);
	    	return tl.substring(0, 1) == '@';
    	}
    	return false;
    }
    
    var addTag = function(i, val, txt){
    	if(i.tagged.indexOf(val) < 0){
	    	i.range.selectNodeContents(i.focusNode);
	    	i.range.setStart(i.focusNode, i.focusOffset);    	
	    	
	    	var sp1 = document.createElement('span');
	    	$(sp1).attr('data-id', val);
	    	$(sp1).attr('unselectable', 'on');
	    	$(sp1).addClass('tag');
	    	sp1.contentEditable = false;
	    	
	    	var spc = document.createElement('span');
	    	spc.contentEditable = false;
	    	$(spc).attr('unselectable', 'on');
	    	$(spc).addClass('tag-inner');
	    	spc.appendChild(document.createTextNode(txt));
	    	sp1.appendChild(spc);
	    	
	    	i.range.insertNode(sp1);
	
	    	i.range.selectNode(i.anchorNode);
	    	var ds = getClosestBefore(i.range.toString(), i.range.toString().length-i.lastw.length);
	    	var de = i.focusOffset;
	    	
	    	if(ds == 0 && i.range.toString().length - i.lastw.length > 0){
	    		ds = i.range.toString().length - i.lastw.length;
	    	}
	    	
	    	//console.log('delete ' + ds+ ' ' + de);
	
	    	i.range.setStart(i.focusNode, ds);
	    	i.range.setEnd(i.focusNode, de);
	    	i.range.deleteContents();
	    	
	    	i.range.selectNodeContents(i.focusNode);
	    	
	    	endSpacer(i);
	    	
	    	i.range.setStartAfter(sp1);
	    	i.range.setEndAfter(sp1); 
	    	rangy.getSelection().removeAllRanges();
	    	rangy.getSelection().addRange(i.range);
	    	
	    	if(i.opts.allowDuplicates === false){
	    		i.tagged.push(val);
	    	}	    	
	    	
	    	drawBBCode(i);	
    	}
    }
    
    var hideSuggest = function(i){
    	i.suggs.hide();
    }
    
    var suggest = function(i, callback){
    	var q = i.lastw.substring(1);
    	//console.log('sug disabled: '+i.suggestionsDisabled);
    	if(q !== '' && i.suggestionsDisabled == false){
	    	var data = {};    	
	    	data[i.opts.pageKey] = i.opts.pageStart;
	    	data[i.opts.pagePerKey] = i.opts.pagePer;
	    	data[i.opts.queryKey] = q;
	    	
	    	$.ajax({
	    		url: i.opts.url,
	    		type:'post',
	    		data: data
			}).done(function(data) {
				/*for ( var int = 0; int < i.opts.dataObj.length; int++){
					data = data[i.opts.dataObj[int]];
					console.log(i.opts.dataObj[int]);
				}*/
				
				var ret = data.ret.data;
				
				//console.log(ret.length);
				
				if(ret.length == 0){
					//console.log('empty data');
					hideSuggest(i);
					callback(true);
				}
				else{
					$(i.suggs).empty();
					
					$.each(ret, function(index, v){
						var li = $('<li><a data-val="'+v.id+'" href="">'+v.text+'</a></li>');
						$(i.suggs).append(li);
					});
					
					i.suggs.find('a').bind('click', function(e){
				     	e.preventDefault();
				      	addTag(i, $(this).data('val'), $(this).text());
				      	hideSuggest(i);
				      	drawBBCode(i);
				       	return false;
				    });
					
					var pos = $(i.tagger).offset();
					var pad = $(i.tagger).css('padding-bottom');
					pos.top = pos.top + $(i.tagger).height() + (parseInt(pad)*2) +1;
			    	//console.log(parseInt(pad));
			    	i.suggs.css({top:pos.top,left:pos.left});
			    	i.suggs.show();
			    	callback(false);
				}
			});
    	}
    }

})(jQuery, document, window);