/**
 * tagfriends2 Version: 2.1 URL: http://astroanu.github.io/jquery-tag-a-friend2/
 * Description: A facebook-like taggin interface Author: Anuradha Jayathilaka
 * (https://github.com/astroanu) Copyright: Copyright 2014 Anuradha Jayathilaka
 * License: MIT
 */
/**
 * tagfriends2 Version: 2.0 URL: http://astroanu.github.io/jquery-tag-a-friend2/
 * Description: A facebook-like taggin interface Author: Anuradha Jayathilaka
 * (https://github.com/astroanu) Copyright: Copyright 2014 Anuradha Jayathilaka
 * License: MIT
 */

;(function($, document, window, undefined) {
    "use strict";
    var pluginName = 'tagfriends2';
    var defaults = {
		url:'',
    	pageStart:1,
    	pageKey:'curpage',
    	pagePerKey:'pg_lmt',
    	pagePer:500,
    	queryKey:'q',
    	dataObj:['ret','data'],
    	tagFormat:'[@%?]',
    	allowDuplicates:false,
    	debug:false,
    	scroller:null,
    	onScrape:null,
    	onUpdate:null,
    	sugDelay:1000,
    	sugTpl:'<li><a data-val="{id}" href="">{text}</a></li>',
    	extraClass:'',
    	tagClass:'',
    	suggClass:'',
    	placeholder:''
    };

    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (elt) {
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

    function Plugin(element, options) {
        this.element = element;
        this.tagger = $('<div autocomplete="off" autocorrect="off" autocapitalize="off" data-placeholder="'+options.placeholder+'" spellcheck="false" class="tagfriends-wrapper '+options.extraClass+'" contentEditable="true"></div>');
    	this.suggs = $('<ul class="tagfriends-tags-container"></ul>').addClass(options.suggClass).hide();
    	$(this.element).hide();
    	$('body').append(this.suggs);
    	
    	if(options.debug == true){}
        
        $(this.element).before(this.tagger);  
        
        rangy.init();
        this.range = rangy.createRangyRange();
        this.anchorNode = this.anchorOffset = this.focusNode = this.focusOffset = 0;
        this.isCollapsed = true;
        this.suggestionsVisible = false;
        this.suggestionsDisabled = false;
        this.suggestionsHover = false;
        this.activeTagNode = null;
        this.lastw = "";     
        this.lastq = '';
        this.tagged = [];
        this.link = '';        

        var instance = this;

        $(this.tagger).bind('click keyup', function(e){
        	endSpacer(instance);
        	instance.range = rangy.createRangyRange();
        	instance.range.selectNodeContents(this);
        	
        	var sel = rangy.getSelection();
        	instance.anchorNode = sel.anchorNode;
        	instance.anchorOffset = sel.anchorOffset;
        	instance.focusNode = sel.focusNode;
        	instance.focusOffset = sel.focusOffset;
        	instance.isCollapsed = sel.isCollapsed;

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
        		instance.suggestionsDisabled = d;
        	});
        	setTimeout(function(){
	        	if(isTag(instance) === true && instance.isCollapsed === true && instance.suggestionsVisible === false){
	            	suggest(instance, function(d){
            			instance.suggestionsDisabled = d;
            		});
	        	}
	        	else{
	        		hideSuggest(instance);
	        	}
        	},instance.opts.sugDelay);        		
        	onUpdate(instance);
        });
        
        $(document).on('click', function(){
        	hideSuggest(instance);
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
        }, function(){ });
        
        $(this.suggs).on('keypress keydown', 'a', function(e){
        	if(e.keyCode == 38){
        		e.preventDefault();
        		$(this).parent().prev().children('a').focus();
        		$(this.suggs).scrollTop($(this).prevAll().length * $(this).outerHeight());
        		return false;
        	}
        	
        	if(e.keyCode == 40){
        		e.preventDefault();
        		$(this).parent().next().children('a').focus();
        		$(this.suggs).scrollTop($(this).prevAll().length * $(this).outerHeight());
        		return false;
        	}
        	
        	if(e.keyCode == 27){
        		hideSuggest(instance);
        		instance.range.setStartAfter(instance.range.anchorNode);
        	}
        });
        
        $(this.suggs).on('hover', function(e){
        	$(this).blur();
        });
        
        $(this.tagger).on('paste', function (e) {
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
		    	
	        	if(isUrl(txt) === true && instance.link == ''){	        
	        		scrapeUrl(instance, txt);
	        		instance.link = txt;
	        	}	
        	}
        	catch(e){
        		if(instance.opts.debug === true){}       		
        	}
    	});
        
        $(this.tagger).on('paste', '.tag', function(e){ 
        	e.preventDefault();
        	return false;
        });
        
        $(this.tagger).on('click', '.tag', function(){        	
        	if($(this).hasClass('tag')){
        		$(this).parent().find('.tag').removeClass('active');
        		$(this).addClass('active');
        	}
        });
        
        $(this.tagger).on('blur click keypress keyup', function(e){
        	if(e.keyCode == 13){
        		e.preventDefault();
        	}
        	drawBBCode(instance);
        	if($(instance.anchorNode).parents('.tag').length == 0){
        		$(this).find('.tag').removeClass('active');
        	}
        });
        
        $(this.tagger).on('change keydown keypress input', function() {
    		if (this.textContent) {
    			this.dataset.divPlaceholderContent = 'true';
    		}
    		else {
    			delete(this.dataset.divPlaceholderContent);
    		}
    	});

        this.options = $.extend({}, defaults, options);

        this.$el      = $(element);
        this.$el.data(name, this);

        this._defaults = defaults;

        var meta      = this.$el.data(name + '-opts');
        this.opts     = $.extend(this._defaults, options, meta);

        this.init();
        
    }

    Plugin.prototype = {
        init: function() {}
    };

    $.fn[pluginName] = function(methodOrOptions) {
    	var methods = {
			refresh : function(e,o) { 
				drawBBCode($(e).data('plugin_' + pluginName));
	        },
	        value:function(e,o){
	        	drawBBCode($(e).data('plugin_' + pluginName));
	        	return $($(e).data('plugin_' + pluginName).element).val();
	        },
	        clearUrl:function(e,o){
	        	$(e).data('plugin_' + pluginName).link = '';
	        },
	        clear:function(e,o){
	        	clear($(e).data('plugin_' + pluginName));
	        },
	        focus:function(e,o){
	        	focus($(e).data('plugin_' + pluginName));
	        },
	        blur:function(e,o){
	        	blur($(e).data('plugin_' + pluginName));
	        }
	    };
    	
    	if (methods[methodOrOptions] ) {
    		var f = methods[ methodOrOptions ];
    		if(typeof f == 'function'){
    			return f( this, Array.prototype.slice.call( arguments, 1 ));
    		}
        } else if ( typeof methodOrOptions === 'object' || ! methodOrOptions ) {
        	return this.each(function() {
                if (!$.data(this, 'plugin_' + pluginName)) {
                    $.data(this, 'plugin_' + pluginName, new Plugin(this, methodOrOptions));
                }
            });
        } else {
            $.error( 'Method ' +  methodOrOptions + ' does not exist on jQuery.' + pluginName);
        }        
    };
    
    var blur = function(){
    	$(i.tagger).blur();
    }

    var focus = function(i){
    	$(i.tagger).focus();
    }
    
    var clear = function(i){
    	$(i.tagger).text('');
    	$(i.element).empty();
    	i.tagged= [];
    }
    
    var isUrl = function(s){
    	var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    	return regexp.test(s);
    }
    
    var scrapeUrl = function(i, url){
		if(typeof i.opts.onScrape == 'function'){
			i.opts.onScrape(url);
		}
    }
    
    var drawBBCode = function(i){
    	try{
	    	if(i.range != null){
		    	var nodes = i.range.getNodes();
		    	var bb = ''; var ltxt = '';
		    	i.tagged = [];
		    	$.each(nodes, function(index, value){
		    		switch ($(value).prop('tagName')) {
						case 'SPAN':
							if($(value).hasClass('tag')){
								bb += i.opts.tagFormat.replace('%?', $(value).data('id'));
								ltxt = $(value).text();
								i.tagged.push($(value).data('id'));
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
			if(i.opts.debug === true){}       		
		}
    }
    
    var onUpdate = function(i){
    	if(typeof i.opts.onUpdate == 'function'){
    		var t = $.trim(i.tagger.text());
			i.opts.onUpdate({
				count:t.length == 0 || t.length < 0 ? 0 : t.length,
				text:i.range.toString(),
				code:$(i.element).val(),
				tags:i.tagged,
				link:i.link
			});
		}
    }
    
    var deleteTag = function(i){
    	var tag = $(i.focusNode).parents('.tag');
    	for (var key in i.tagged) {
    	    if (i.tagged[key] == tag.data('id')) {
    	    	i.tagged.splice(key, 1);
    	    	var s = document.createTextNode(' ');
			 	$(i.tagger).append(s);
    	    	tag.remove();
    	    	endSpacer(i);
    	    }
    	}  
    	i.tagger.trigger('click');
    	drawBBCode(i);	
    }
    
    var endSpacer = function(i){
    	try{
	    	i.range.setStart(i.anchorNode, i.anchorOffset);
	    	i.range.setEnd(i.anchorNode, i.anchorOffset);	    	
	    	var s = document.createTextNode(' ');
		 	$(i.tagger).append(s);
	    }
		catch(e){
			if(i.opts.debug === true){}       		
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
    	text = text.split('');
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
	    	var tags = text.split(' @');
	    	
	    	var ws = getClosestBefore(text, i.focusOffset);
	    	var we = getClosestAfter(text, i.focusOffset);
	    	
	    	if(we == ws) we = text.length;
	    	
	    	var neww = text.substring(ws, we);

	    	callback(neww == i.lastw); 
    	}
    }

    var isTag = function(i) {
    	if(i.focusNode != null){
	    	var text = i.focusNode.nodeValue;
	    	if(text == null) text = '';
	    	var tags = text.split(' @');

	    	var ws = getClosestBefore(text, i.focusOffset);
	    	var we = getClosestAfter(text, i.focusOffset);
 	
	    	if(we == ws) we = text.length;
	    	
	    	i.lastw = text.substring(ws, we);

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
	    	$(spc).addClass(i.opts.tagClass);
	    	spc.appendChild(document.createTextNode(txt));
	    	sp1.appendChild(spc);
	    	
	    	i.range.insertNode(sp1);
	
	    	i.range.selectNode(i.anchorNode);
	    	var ds = getClosestBefore(i.range.toString(), i.range.toString().length-i.lastw.length);
	    	var de = i.focusOffset;
	    	
	    	if(ds == 0 && i.range.toString().length - i.lastw.length > 0){	    		
	    		ds = i.range.toString().length - i.lastw.length;
	    	}
	    	
    		var w = i.range.toString().split(' ');
    		var p = 0;
    		$.each(w, function(index, value){
    			p = p + value.length + 1;
    			var t = value.split('');
    			if(t[0] == '@'){
    				ds = p - value.length  - 1 ;
    				return;
    			}
    		});

	    	i.range.setStart(i.anchorNode, ds);
	    	i.range.setEnd(i.anchorNode, de);
	    	i.range.deleteContents();
	    	
	    	i.range.selectNodeContents(i.anchorNode);
	    	
	    	i.range.setStartAfter(sp1);
	    	i.range.setEndAfter(sp1); 
	    	rangy.getSelection().removeAllRanges();
	    	rangy.getSelection().addRange(i.range);
	    	
	    	if(i.opts.allowDuplicates === false){
	    		i.tagged.push(val);
	    	}	    	
	    	i.tagger.trigger('focus');
    	}
    	i.lastq = '';
    }
    
    var hideSuggest = function(i){
    	i.suggs.hide();
    }
    
    var tpl = function(tpl, object){
    	for (var k in object) {
    		tpl = tpl.replace('{'+k+'}', object[k]);
        }
    	return tpl;
    }
    
    var suggest = function(i, callback){	
		var q = i.lastw.substring(1).split(' ');
		q = q[0].split('_').join(' ');
    	if(q !== '' && i.suggestionsDisabled == false && i.lastq != q){
	    	var data = {};    	
	    	data[i.opts.pageKey] = i.opts.pageStart;
	    	data[i.opts.pagePerKey] = i.opts.pagePer;
	    	data[i.opts.queryKey] = q;
	    	
	    	$.ajax({
	    		url: i.opts.url,
	    		type:'post',
	    		data: data
			}).done(function(data) {
				var ret = data.ret.data;
				if(ret.length == 0){
					hideSuggest(i);
					callback(true);
				}
				else{
					$(i.suggs).empty();
					var li ='';
					$.each(ret, function(index, v){
						if(i.tagged.indexOf(v.id) < 0){    							
							$(i.suggs).append($(tpl(i.opts.sugTpl, v)));
				    	}
					});
					
					if(typeof i.opts.scroller == 'function'){
						i.opts.scroller($(i.suggs));
					}
					
					i.suggs.find('a').bind('click', function(e){
				     	e.preventDefault();
				      	addTag(i, $(this).data('val'), $(this).text());
				      	hideSuggest(i);
				      	drawBBCode(i);
				       	return false;
				    });
					
					i.lastq = q;
					
					var pos = $(i.tagger).offset();
					var pad = $(i.tagger).css('padding-bottom');
					pos.top = pos.top + $(i.tagger).height() + (parseInt(pad)*2) +1;
					var w = $(i.tagger).width() + parseInt($(i.tagger).css('padding-left')) + parseInt($(i.tagger).css('padding-right'));
			    	i.suggs.css({top:pos.top,left:pos.left,width:w});
			    	i.suggs.show();
			    	callback(false);
				}
			});
    	}
    }

})(jQuery, document, window);