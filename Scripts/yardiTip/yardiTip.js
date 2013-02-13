﻿/*
*
*   yardiTip
*   author: ronglin
*   create date: 2010.10.11
*
*/

/*
* $('#sample').yardiTip({
*     trigger: 'click',
*     width: 'auto', // a pixel number or 'auto'.
*     title: 'sample title', // some text or a function return the text.
*     content: 'sample content' // some text or a function return the text.
* });
*/

(function ($) {

    /*
    * helpers
    */
    var isNumber = function (v) {
        return typeof v === 'number' && isFinite(v);
    };

    var maxZIndex = function () {
        var zmax;
        $('.ui-dialog').each(function () { //$('*')
            var cur = parseInt($(this).css('z-index'));
            zmax = cur > (zmax || 0) ? cur : zmax;
        });
        return zmax;
    };

    var isAncestor = function (p, c) {
        var ret = false;
        if (p && c) {
            if (p.contains) {
                return p.contains(c);
            } else if (p.compareDocumentPosition) {
                return !!(p.compareDocumentPosition(c) & 16);
            } else {
                while (c = c.parentNode) {
                    ret = c == p || ret;
                }
            }
        }
        return ret;
    };

    var getElementPosition = function (element) {
        var result = { x: 0, y: 0, width: 0, height: 0 };
        if (element.offsetParent) {
            result.x = element.offsetLeft;
            result.y = element.offsetTop;
            var parent = element.offsetParent;
            while (parent) {
                result.x += parent.offsetLeft;
                result.y += parent.offsetTop;
                var parentTagName = parent.tagName.toLowerCase();
                if (parentTagName != "table" &&
                    parentTagName != "body" &&
                    parentTagName != "html" &&
                    parentTagName != "div" &&
                    parent.clientTop &&
                    parent.clientLeft) {
                    result.x += parent.clientLeft;
                    result.y += parent.clientTop;
                }
                parent = parent.offsetParent;
            }
        }
        else if (element.left && element.top) {
            result.x = element.left;
            result.y = element.top;
        }
        else {
            if (element.x) {
                result.x = element.x;
            }
            if (element.y) {
                result.y = element.y;
            }
        }
        if (element.offsetWidth && element.offsetHeight) {
            result.width = element.offsetWidth;
            result.height = element.offsetHeight;
        }
        else if (element.style && element.style.pixelWidth && element.style.pixelHeight) {
            result.width = element.style.pixelWidth;
            result.height = element.style.pixelHeight;
        }
        return result;
    };

    /*
    * component class
    */
    $.yardiTip = function (options, refObj) {
        this.refObj = refObj;
        this.settings = $.extend({}, $.yardiTip.defaults, options);
        this.settings.lazyFunc = [];
        if (this.settings.lazyInitialize === false) { this.initialize(); }
    };

    $.extend($.yardiTip, {

        /*
        * default configuration
        * change it as needed.
        */
        defaults: {
            debug: false,
            width: 'auto',
            showed: false,
            showArrow: true,
            resizeTimeout: false,
            lazyInitialize: true,
            arrowWidth: 20,
            arrowHeight: 16,
            offsetX: -20, // number value or 'center'
            offsetY: 0,
            renderTo: '.yardi-tip-cache',
            onShow: null,
            onHide: null
        },

        prototype: {

            el: null,

            settings: null,

            refObj: null, arrowObj: null, titleObj: null,

            // private
            initialize: function () {
                // tip elements
                if (this.settings.inited === true) { return; }
                this.settings.inited = true;
                var html = this.buildHtml();
                this.el = $(html).appendTo(this.settings.renderTo);
                if (this.settings.width == 'auto') {
                    this.el.css('min-width', 50);
                } else {
                    this.el.width(this.settings.width);
                }
                this.arrowObj = $('.arrow', this.el);
                this.titleObj = $('.title', this.el);
                if (!this.settings.showArrow) {
                    this.arrowObj.remove();
                    this.arrowObj = null;
                }

                // lazy func
                var funcs = this.settings.lazyFunc;
                delete this.settings['lazyFunc'];
                for (var i = 0; i < funcs.length; i++)
                    funcs[i].call(this);

                // event handlers
                var self = this, timeoutId;
                this.settings._hide = function (ev) {
                    if (!isAncestor(self.el.get(0), ev.target)) {
                        self.hide();
                    }
                };
                this.settings._reisze = self.settings.resizeTimeout ? function () {
                    window.clearTimeout(timeoutId);
                    timeoutId = window.setTimeout(function () {
                        self.fixPos();
                    }, 50);
                } : function () {
                    self.fixPos();
                };
            },

            // private
            buildHtml: function () {
                var html = [];
                html.push('<div class="yardi-tip">');
                html.push('<div class="arrow"></div>')
                html.push('<div class="title"></div>');
                html.push('<div class="content">');
                html.push('<div class="contentwrap"></div>');
                html.push('</div>');
                html.push('</div>');
                return html.join('');
            },

            // private
            getPos: function (refInfo) {
                var winHeight = $(window).height(), winWidth = $(window).width();
                var scrollTop = $(window).scrollTop(), scrollLeft = $(window).scrollLeft();
                var selHeight = this.el.outerHeight(), selWidth = this.el.outerWidth();
                if (this.settings.offsetX == 'center') { this.settings.offsetX = -(selWidth / 2) + this.settings.arrowWidth / 2; }
                if (this.settings.offsetY == 'middle') { this.settings.offsetY = -(selHeight / 2) + this.settings.arrowHeight / 2 }
                var left = 0, top = 0, arrowLeft = null;
                if (refInfo.y + refInfo.height - scrollTop + selHeight + this.settings.offsetY > winHeight) {
                    top = refInfo.y - selHeight - this.settings.offsetY;
                    this.arrowTop(false);
                } else {
                    top = refInfo.y + refInfo.height + this.settings.offsetY;
                    this.arrowTop(true);
                }
                if (refInfo.x + scrollLeft + selWidth + this.settings.offsetX > winWidth) {
                    left = refInfo.x + refInfo.width - selWidth - this.settings.offsetX;
                    if (refInfo.width < selWidth) {
                        arrowLeft = selWidth - refInfo.width / 2 - this.settings.arrowWidth / 2 + this.settings.offsetX;
                    }
                } else {
                    left = refInfo.x + this.settings.offsetX;
                    if (refInfo.width < selWidth) {
                        arrowLeft = refInfo.width / 2 - this.settings.arrowWidth / 2 - this.settings.offsetX;
                    }
                }
                return {
                    left: left,
                    top: top,
                    arrowLeft: arrowLeft
                };
            },

            // public
            arrowTop: function (upTop) {
                if (!this.settings.showArrow) { return; }
                upTop = (upTop !== false);
                if (upTop) {
                    this.arrowObj.insertBefore(this.titleObj);
                    this.arrowObj.removeClass('down');
                } else {
                    this.arrowObj.insertAfter($('.content', this.el));
                    this.arrowObj.addClass('down');
                }
            },

            // public
            arrowLeft: function (offset) {
                if (this.settings.inited !== true) { return; }
                if (!this.settings.showArrow) { return; }
                var max = this.el.width() - this.settings.arrowWidth;
                if (isNumber(offset)) {
                    offset = Math.max(offset, 0);
                    offset = Math.min(offset, max);
                } else {
                    offset = max / 2;
                }
                this.arrowObj.css('background-position', offset + 'px');
            },

            // public
            fixPos: function () {
                if (this.settings.inited !== true) { return; }
                // get reference infomation
                var refInfo = getElementPosition(this.refObj.get(0));
                // position
                var pos = this.getPos(refInfo);
                this.arrowLeft(pos.arrowLeft);
                delete pos['arrowLeft'];
                this.el.css(pos);
            },

            // public
            show: function (ref) {
                if (this.settings.showed === true) { return; }
                if (ref) { this.refObj = ref; }
                this.initialize();
                // set position
                this.fixPos();
                // show
                var zmax = maxZIndex();
                if (zmax) { this.el.css('z-index', zmax + 1); }
                this.el.show();
                // register
                $(document).bind('mouseup', this.settings._hide);
                $(window).bind('resize', this.settings._reisze);
                this.settings.showed = true;
                // event
                if (this.settings.onShow) { this.settings.onShow.call(this); }
            },

            // public
            hide: function () {
                if (this.settings.inited !== true) { return; }
                // hide
                this.el.hide();
                // unregister
                $(document).unbind('mouseup', this.settings._hide);
                $(window).unbind('resize', this.settings._reisze);
                this.settings.showed = false;
                // event
                if (this.settings.onHide) { this.settings.onHide.call(this); }
            },

            // public
            setTitle: function (title) {
                if (this.settings.inited !== true) {
                    this.settings.lazyFunc.push(function (tle) {
                        return function () { this.setTitle(tle); };
                    } (title));
                    return;
                }
                this.titleObj.html(title);
                this.titleObj.css('background-color', title ? '#F0E9A5' : '#FFFFFF'); // set yellow color
                if (this.settings.showArrow) { this.arrowObj[title ? 'addClass' : 'removeClass']('yellow'); } // set yellow arrow
            },

            // public
            setContent: function (content) {
                if (this.settings.inited !== true) {
                    this.settings.lazyFunc.push(function (cnt) {
                        return function () { this.setContent(cnt); };
                    } (content));
                    return;
                }
                $('.contentwrap', this.el).html(content);
            }
        }
    });

    /*
    * jquery entrance
    */
    $.extend($.fn, {
        yardiTip: function (options) {

            // closure
            options = options || {};
            var timeout = 500;
            var current = null;

            // check has elements
            if (!this.length) {
                options.debug && window.console && console.warn('nothing selected');
                return this;
            }

            // element cache container
            if (!options.renderTo && $('.yardi-tip-cache').length == 0)
                options.renderTo = $('<div class="yardi-tip-cache"></div>').appendTo('body');

            // loop
            this.each(function () {

                // get cache
                var tip = $.data(this, 'yardiTip');
                if (tip) { return tip; }

                // get messages
                var title, content, t = options.title, c = options.content;
                if (t != null) {
                    title = (typeof (t) === 'function') ? t.call(this) : t;
                } else {
                    title = $(this).attr('title');
                    $(this).removeAttr('title');
                }
                if (c != null) {
                    content = (typeof (c) === 'function') ? c.call(this) : c;
                } else {
                    content = $(this).next().html();
                }

                // new instance
                tip = new $.yardiTip(options, $(this));
                if (title && content) {
                    tip.setTitle(title);
                    tip.setContent(content);
                } else if (title || content) {
                    tip.setContent(title || content);
                }

                // set cache
                $.data(this, 'yardiTip', tip);

                // bind events
                var showtip = function () {
                    if (current && current != tip) {
                        current.hide();
                        current = null;
                    }
                    tip.show();
                    current = tip;
                };
                var trigger = (options.trigger || 'click').toLowerCase();
                if (trigger == 'hover') {
                    $(this).hover(function () {
                        clearTimeout($(this).data('tid'));
                        showtip.call(this);
                    }, function () {
                        $(this).data('tid', setTimeout(function () {
                            tip.hide();
                        }, timeout));
                    });
                } else {
                    $(this).bind(trigger, showtip);
                }

                // ret
                return tip;
            });

            // ret
            return this;
        }
    });

})(jQuery);