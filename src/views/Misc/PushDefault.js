/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var RenderController = require('famous/views/RenderController');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ContainerSurface = require('famous/surfaces/ContainerSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');

    var ToggleButton = require('famous/widgets/ToggleButton');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var EventHandler = require('famous/core/EventHandler');

    // Models
    var PushSettingModel = require('models/push_setting');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();

        this.model.populated().then(function(){

            // Add surfaces to content (buttons)
            that.addSurfaces();

            // Sequence
            that.contentScrollView.sequenceFrom(that.contentScrollView.Views);

            // Show
            that.ContentController.show(that.contentScrollView);

        });
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){
        var that = this;

        // Load the PushSetting model
        this.model = new PushSettingModel.PushSetting();
        this.model.on('sync', this.update_data.bind(this));
        this.model.fetch({prefill: true});

    };

    PageView.prototype.createHeader = function(){
        var that = this;

        // create the header bar
        this.header = new StandardHeader({
            content: 'Push Notifications',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // backContent: false,
            moreContent: false
        }); 
        this.header.navBar.title.on('click', function(){
            App.history.back();
        });
        this.header.on('back', function(){
            App.history.back();//.history.go(-1);
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];

        // link endpoints of layout to widgets

        // // Add surfaces to content (buttons)
        // this.addSurfaces();

        // // Sequence
        // this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Content bg
        // - for handling clicks
        this.contentBg = new Surface({
            size: [undefined, undefined],
            properties: {
                zIndex: "-1"
            }
        });
        this.contentBg.on('click', function(){
            App.history.back();//.history.go(-1);
        });

        // Content
        this.layout.content.StateModifier = new StateModifier({
            // origin: [0, 1],
            // size: [undefined, undefined]
        });
        this.layout.content.SizeModifier = new StateModifier({
            size: [undefined, undefined]
        });

        // Loading RenderController
        this.ContentController = new RenderController();

        this.loadingSurface = new Surface({
            content: "Loading Push Settings",
            size: [undefined, 100],
            classes: ['loading-surface-default']
        });
        this.ContentController.show(this.loadingSurface);

        // Now add content
        this.layout.content.add(this.contentBg);
        this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(this.ContentController);
        // this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(container);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        var listOptions = [
        
            {
                type: 'header',
                text: 'General'
            },
            {
                title: 'New Message',
                desc: 'Every time you receive a message',
                scheme_key: 'new_message'
            },
            {
                title: 'New Friend',
                desc: 'Every time a friend accepts a request',
                scheme_key: 'new_friend'
            },


        ];

        this.model_views = [];

        listOptions.forEach(function(Info){

            // Just a spacer/header/separator?
            if(Info.type && Info.type == 'header'){
                var separator = new Surface({
                    content: Info.text,
                    size: [undefined, 32],
                    classes: ['push-list-separator-default']
                });
                separator.pipe(that.contentScrollView);
                that.contentScrollView.Views.push(separator);
                return;
            }

            // Normal list item
            var pushOpt = new View();

            that.model_views.push({
                scheme_key: Info.scheme_key,
                view: pushOpt
            });

            pushOpt.Layout = new FlexibleLayout({
                ratios: [1, true]
            });
            // pushOpt.Layout.Views = [];

            pushOpt.Left = new Surface({
                content: '<div>' + Info.title + '</div><div>' + Info.desc + '</div>',
                size: [undefined, true],
                classes: ['push-list-text-default']
            });
            pushOpt.Left.pipe(that.contentScrollView);

            pushOpt.Toggle = new ToggleButton({
                size: [40, 40],
                content: '',
                classes: ['text-center'],
                onClasses: ['circle-toggle', 'toggle-on'],
                offClasses: ['circle-toggle', 'toggle-off'],

                // NOT for setting the default toggle state of the button
                toggleMode: ToggleButton.TOGGLE
            });
            pushOpt.Toggle.pipe(that.contentScrollView);

            // Handle toggle button click
            pushOpt.Toggle.on('select', function(m){
                console.log('select, saving');
                if(that.model.get('scheme.' + Info.scheme_key) !== true){
                    var data = {};
                    data['scheme.' + Info.scheme_key] = true;
                    that.model.save(data,{patch: true});
                }
            });
            pushOpt.Toggle.on('deselect', function(){
                console.log('deselect, saving');
                if(that.model.get('scheme.' + Info.scheme_key) !== false){
                    var data = {};
                    data['scheme.' + Info.scheme_key] = false;
                    that.model.save(data,{patch: true});
                }
            });

            pushOpt.getSize = function(){
                return [undefined, pushOpt.Left._size ? pushOpt.Left._size[1]:undefined];
            };

            pushOpt.Layout.sequenceFrom([
                pushOpt.Left,
                pushOpt.Toggle
            ]);

            pushOpt.add(pushOpt.Layout);

            // Toggle to the correct state 
            // - above doesn't work?
            var val = that.model.get('scheme.' + Info.scheme_key);
            if(val){
                pushOpt.Toggle.select() 
            } else {
                pushOpt.Toggle.deselect() 
            }

            // // If model changes, update the display
            // Model.on('change', function(ModelInstance){
            //     console.log('MODEL HAS CHANGED32!');
            //     thisModelsSurfaces.Details.setContent(labelContent());

            //     // Toggle to the correct state 
            //     // - above doesn't work?
            //     Model.get('pushalert') ? thisModelsSurfaces.ToggleButton.select() : thisModelsSurfaces.ToggleButton.deselect();

            // });


            // var surface = new Surface({
            //     content: '<div>'+setting.title+'</div><div>'+setting.desc+'</div>',
            //     size: [undefined, 50],
            //     classes: ["settings-list-item"],
            //     properties: {
            //         lineHeight: '20px',
            //         padding: '5px',
            //         borderBottom: '1px solid #ddd',
            //         backgroundColor: "white"
            //     }
            // });
            // surface.Setting = setting;
            // surface.pipe(that.contentScrollView);
            // surface.on('click', function(){
            //     // alert('clicked!');
            //     // alert(this.Setting.href);
            //     App.history.navigate(this.Setting.href, this.Setting.hrefOptions);
            // });
            that.contentScrollView.Views.push(pushOpt);
        });

        // that.contentScrollView.sequenceFrom(that.contentScrollView.Views);

    };

    PageView.prototype.update_data = function(){
        var that = this;

        // Update toggle buttons
        if(this.model_views){
            this.model_views.forEach(function(data){
                
                var val = that.model.get('scheme.' + data.scheme_key);
                if(val){
                    data.view.Toggle.select() 
                } else {
                    data.view.Toggle.deselect() 
                }

            });
        }

    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Hide/move elements
                        window.setTimeout(function(){
                            
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide content down
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // window.setTimeout(that.refreshData.bind(that), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // Bring map content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);

                        break;
                }
                break;
        }
        
        return transitionOptions;
    };



    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
            // inTransition: true,
            // outTransition: true,
            // look: {
            //     size: [undefined, 50]
            // }
        },
        footer: {
            size: [undefined, 0]
        },
        content: {
            size: [undefined, undefined],
            inTransition: true,
            outTransition: true,
            overlap: true
        }
    };

    module.exports = PageView;

});
