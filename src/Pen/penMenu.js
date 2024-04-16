import { moduleName } from "../../MaterialPlane.js";
import { activateControl } from "../Misc/misc.js";
import { scaleIRinput } from "../IRtoken/tokenHelpers.js";

export class penMenu extends CanvasLayer {
    constructor() {
      super();
      this.init();
    }

    options = [
        {
            name: "pointer",
            icon: "modules/MaterialPlane/img/mouse-pointer-solid.png",
            label: "Canvas",
            buttons: [
                { button: "A", label: "Pan Canvas" },
                { button: "B", label: "Zoom Canvas" },
                { button: "C", label: "Pen Menu" },
                { button: "D", label: "Click Canvas" }
            ]
        },
        {
            name: "token",
            icon: "modules/MaterialPlane/img/user-solid.png",
            label: "Token",
            buttons: [
                { button: "A", label: "Deselect Token" },
                { button: "B", label: "Rotate Token" },
                { button: "C", label: "Pen Menu" },
                { button: "D", label: "Move Token" }
            ]
        },
        {
            name: "ruler",
            icon: "modules/MaterialPlane/img/ruler-solid.png",
            label: "Ruler",
            buttons: [
                { button: "A", label: "Undo Last Point" },
                { button: "B", label: "Clear All Points" },
                { button: "C", label: "Pen Menu" },
                { button: "D", label: "New Point" }
            ]
        },
        {
            name: "target",
            icon: "modules/MaterialPlane/img/bullseye-solid.png",
            label: "Target",
            buttons: [
                { button: "A", label: "Untarget All Tokens" },
                { button: "C", label: "Pen Menu" },
                { button: "D", label: "Target Token" }
            ]
        },
        {
            name: "draw",
            icon: "modules/MaterialPlane/img/pencil-alt-solid.png",
            label: "Drawings",
            buttons: [
                { button: "A", label: "Move Drawing" },
                { button: "B", label: "Rotate Drawing" },
                { button: "C", label: "Pen Menu" },
                { button: "D", label: "Draw Shape" }
            ]
        },
        {
            name: "template",
            icon: "modules/MaterialPlane/img/ruler-combined-solid.png",
            label: "Templates",
            buttons: [
                { button: "A", label: "Move Template" },
                { button: "B", label: "Rotate Template" },
                { button: "C", label: "Pen Menu" },
                { button: "D", label: "Draw Template" }
            ]
        },
        {
            name: "macro",
            label: "Macros",
            icon: "modules/MaterialPlane/img/macro.png"
        },
        {
            name: "info",
            icon: "modules/MaterialPlane/img/circle-info-solid.png"
        }
    ];

    deleteOptions = {
        label: "Delete",
        buttons: [
            { button: "C", label: "Pen Menu" },
            { button: "D", label: "Delete" }
        ]
    }

    templateOptions = [
        {
            name: "select",
            icon: "modules/MaterialPlane/img/expand-solid.png"
        },
        {
            name: "circle",
            icon: "modules/MaterialPlane/img/circle-regular.png"
        },
        {
            name: "cone",
            icon: "modules/MaterialPlane/img/angle-left-solid.png"
        },
        {
            name: "rect",
            icon: "modules/MaterialPlane/img/square-regular.png"
        },
        {
            name: "ray",
            icon: "modules/MaterialPlane/img/arrows-alt-v-solid.png"
        },
        {
            name: "clear",
            icon: "modules/MaterialPlane/img/trash-solid.png"
        }
    ]

    drawingOptions = [
        {
            name: "select",
            icon: "modules/MaterialPlane/img/expand-solid.png"
        },
        {
            name: "rect",
            icon: "modules/MaterialPlane/img/square-solid.png"
        },
        {
            name: "ellipse",
            icon: "modules/MaterialPlane/img/circle-solid.png"
        },
        {
            name: "polygon",
            icon: "modules/MaterialPlane/img/draw-polygon-solid.png"
        },
        {
            name: "freehand",
            icon: "modules/MaterialPlane/img/signature-solid.png"
        },
        {
            name: "clear",
            icon: "modules/MaterialPlane/img/trash-solid.png"
        }
    ]

    colors = [
        {
            name: "black",
            int: 0x000000,
            hex: "#000000"
        },
        {
            name: "white",
            int: 0xFFFFFF,
            hex: "#FFFFFF"
        },
        {
            name: "red",
            int: 0xFF0000,
            hex: "#FF0000"
        },
        {
            name: "yellow",
            int: 0xFFFF00,
            hex: "#FFFF00"
        },
        {
            name: "green",
            int: 0x00FF00,
            hex: "#00FF00"
        },
        {
            name: "greenBlue",
            int: 0x00FFFF,
            hex: "#00FFFF"
        },
        {
            name: "blue",
            int: 0x0000FF,
            hex: "#0000FF"
        },
        {
            name: "none",
            int: "none",
            hex: "#000000"
        } 
    ]

    drag = false;

    selected = 1;
    selectedName = this.options[0].name;

    selectedTemplate = 1;
    selectedTemplateName = this.templateOptions[0].name;

    selectedDrawingTool = 1;
    selectedDrawingToolName = this.drawingOptions[0].name;
    selectedLineColor = 0;
    selectedLineColorInt = 0x000000;
    selectedFillColor = 7;
    selectedFillColorInt = 'none';

    selectedMacro = 1;

    secondRingEnabled = false;

    location = {
        x: undefined,
        y: undefined,
        radius: undefined
    };

    pen;

    visible = false;
    open = false;
    infoVisible = false;
    infoMenu;

    menuSize;

    lastData;

    drawingPermissionTimeout = Date.now();
    templatePermissionTimeout = Date.now();

    setAlpha(alpha) {
        this.container.alpha = alpha;
    }
  
    init(pen) {
        this.container = new PIXI.Container();
        this.container.alpha = 0.75;
        this.addChild(this.container);
        this._zIndex=999;
        this.pen = pen;
        this.menuSize = game.settings.get(moduleName,'MenuSize');

        this.drawingTargetContainer = new PIXI.Container();
        canvas.app.stage.addChild(this.drawingTargetContainer);
      }
    
      async draw() {
        super.draw();
    }

    inMenu(data) {
        const location = {
            x: data.x-this.location.x,
            y: data.y-this.location.y
        }
        const a = location.x*location.x + location.y*location.y;
        const b = this.location.radius*this.location.radius;
        return (a < b);
    }

    getPoint(data) {
        const location = {
            x: data.x-this.location.x,
            y: data.y-this.location.y
        }
        
        let a,b,c;
        
        a = location.x*location.x + location.y*location.y;
        if (this.secondRingEnabled) {
            b = (this.location.radius/3)*(this.location.radius/3);
            c = (this.location.radius/1.5)*(this.location.radius/1.5);
        }
        else {
            b = (this.location.radius/2)*(this.location.radius/2);
            c = (this.location.radius)*(this.location.radius);
        }
        
        
        const nrOfIcons = this.options.length;
        const angleSteps = 2*Math.PI/nrOfIcons;

        let selected;
        let secondRing = false;
        if (a < b) selected = 0;            //icon
        else if (a < c) { //inner ring
            let angle = Math.atan(location.x/-location.y);
            if (location.x > 0 && location.y > 0) angle = Math.PI+angle;
            else if (location.x < 0 && location.y > 0) angle += Math.PI;
            else if (location.x < 0 && location.y < 0) angle = 2*Math.PI+angle;

            selected = Math.floor(angle/angleSteps + angleSteps/2);
            if (selected == nrOfIcons) selected = 0;
            selected++;
        }
        if (this.secondRingEnabled && a > b && a > c) {
            secondRing = true;
            if (this.selected == 5) { //drawing
                if (location.x > 0) {   //icons
                    const nrOfIcons = this.drawingOptions.length;
                    const angleSteps = Math.PI/nrOfIcons;
                    let angle = Math.atan(location.x/-location.y);
                    if (location.y > 0) angle = Math.PI+angle;
                    selected = Math.floor(angle/angleSteps);
                    if (selected == nrOfIcons) selected = 0;
                    selected++;
                }
                else {  //colors
                    const nrOfIcons = this.colors.length*2;
                    const angleSteps = Math.PI/nrOfIcons;
                    let angle = Math.atan(location.x/-location.y);
                    if (location.y < 0) angle += Math.PI;
                    selected = Math.floor(angle/angleSteps);
                    selected+=16;
                }
            }
            else if (this.selected == 6) { //template
                const nrOfIcons = this.templateOptions.length;
                const angleSteps = 2*Math.PI/nrOfIcons;
                let angle = Math.atan(location.x/-location.y);
                if (location.x > 0 && location.y > 0) angle = Math.PI+angle;
                else if (location.x < 0 && location.y > 0) angle += Math.PI;
                else if (location.x < 0 && location.y < 0) angle = 2*Math.PI+angle;

                selected = Math.floor(angle/angleSteps + angleSteps/2);
                if (selected == nrOfIcons) selected = 0;
                selected++;    
            }
            else if (this.selected == 7) { //macro
                const nrOfIcons = 8;
                const angleSteps = 2*Math.PI/nrOfIcons;
                let angle = Math.atan(location.x/-location.y);
                if (location.x > 0 && location.y > 0) angle = Math.PI+angle;
                else if (location.x < 0 && location.y > 0) angle += Math.PI;
                else if (location.x < 0 && location.y < 0) angle = 2*Math.PI+angle;

                selected = Math.floor(angle/angleSteps + angleSteps/2);
                if (selected == nrOfIcons) selected = 0;
                selected++;   
            }
        }

        if (selected == 5)
            this.pen.drawingTarget.show();
        else 
            this.pen.drawingTarget.hide();
        
        if (selected == 0) {
            this.moveMenu(data);
            this.drag = true;
        }
        else if (selected == 8 && a > b && a < c) {
            this.showInfoMenu();
        }
        else 
            this.setSelected(selected,secondRing,data)
    }

    blockInfoVisible = false;

    showInfoMenu() {
        if (this.blockInfoVisible) return;
        if (this.infoVisible) {
            this.infoVisible = false;
        }
        else {
            this.infoVisible = true;
        }
        this.drawMenu(this.location);

        this.blockInfoVisible = true;
        setTimeout(()=>this.blockInfoVisible = false,500)
    }

    drawInfoMenu(selected, selectedDrawing, selectedTemplate, size) {
        if (!this.infoVisible) return;

        let option = this.options.find(o => o.name == selected);
        if (selected == 'draw' && selectedDrawing != undefined) {
            if (this.drawingOptions[selectedDrawing] == undefined) {
                option = this.deleteOptions;
            }
            
        }
        if (selected == 'template' && selectedTemplate != undefined) {
            if (this.templateOptions[selectedTemplate] == undefined) {
                option = this.deleteOptions;
            }
        }
        
        const buttons = option.buttons;
        if (buttons == undefined) return;
        const buttonSize = {
            width: size*0.2,      //25
            height: size*0.15,    //15
            radius: size*0.05,     //5
            lineWidth: size*0.01,       //1
            verticalSpacing: size*0.05, //5
            horizontalSpacing: size*0.05,   //5
            xLeft: this.location.radius*1.1 + size*0.05 //this.location.radius*1.1 + 5
        }

        const height = (1+buttons.length)*(buttonSize.verticalSpacing + buttonSize.height) + 2*buttonSize.verticalSpacing;
    
        let infoMenu = new PIXI.Container();
        
        let background = new PIXI.LegacyGraphics();
        background.lineStyle(buttonSize.lineWidth, 0xFFFFFF);
        let maxWidth = 0;

        
        for (let i=0; i<buttons.length; i++) {
            const button = buttons[i];
            const y = -height/2 + buttonSize.verticalSpacing + (buttonSize.verticalSpacing+buttonSize.height)*(i+1);
            background.drawRoundedRect(buttonSize.xLeft, y-size*0.01, buttonSize.width, buttonSize.height, buttonSize.radius);
            var label = new PIXI.Text(`${button.button}    ${button.label}`, {fontFamily : 'Arial', fontSize: size*0.1, fill : '#FFFFFF', align : 'center'});
            label.position.set(this.location.radius*1.1 +buttonSize.width/2 + size*0.025, y);
            label._zIndex = 1;
            label.resolution = 5;
            if (label.width > maxWidth) maxWidth = label.width;
            background.addChild(label);
        }

        const width = maxWidth+4*buttonSize.horizontalSpacing;
        var label = new PIXI.Text(option.label, {fontFamily : 'Arial', fontSize: size*0.1, fill : '#FFFFFF', align : 'left'});
        label.position.set(buttonSize.xLeft, -height/2 + buttonSize.verticalSpacing);
        label._zIndex = 1;
        label.resolution = 5;
        //if (label.width > maxWidth) maxWidth = label.widt h;
        background.addChild(label);

        
        background.lineStyle(0, 0);
        background.beginFill(0x000000);
        background.drawRoundedRect(this.location.radius*1.1, -height/2, width, height,10);
        background.endFill();
        infoMenu.addChild(background);
        infoMenu.name = 'infoMenu';
        
        this.container.addChild(infoMenu);
    }

    setSelected(selected,secondRing,data={x:this.location.x, y:this.location.y}) {
        const location = {
            x: data.x-this.location.x,
            y: data.y-this.location.y
        }

        if (selected == 5 && !game.user.can("DRAWING_CREATE")) {
            if (Date.now() - this.drawingPermissionTimeout >= 5000) {
                this.drawingPermissionTimeout = Date.now();
                ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.NoDrawingPermission"));
            }
            return;
        }
        else if (selected == 6 && !game.user.can("TEMPLATE_CREATE")) {
            if (Date.now() - this.templatePermissionTimeout >= 5000) {
                this.templatePermissionTimeout = Date.now();
                ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.NoTemplatePermission"));
            }
            return;
        }
  
        if (secondRing == false && this.selected != selected) {
            if (this.pen.ruler != undefined) {
                this.pen.ruler.clear();
                this.pen.ruler = undefined;
            }
            this.selected = selected;
            this.selectedName = this.options[selected-1].name;
            this.drawMenu({
                x: data.x - location.x,
                y: data.y - location.y
            });
            let control;
            
            if (this.selectedName == 'template') {
                activateControl('measure');
                this.selectedTemplate = 1;
                this.selectedTemplateName = this.templateOptions[0].name;
                /*
                ui.controls.activeControl = 'measure';
                ui.controls.render();
                canvas.layers.find(layer => layer.name == "TemplateLayer").activate();
                
                */
            }
            else if (this.selectedName == 'draw') {
                activateControl('drawings');
            }
            else {
                activateControl('token');
            }

            if (control != undefined) {

            }
        }
        else if (secondRing && this.selectedName == 'macro' && this.selectedMacro != selected) {
            this.selectedMacro = selected;
            this.drawMenu({
                x: data.x - location.x,
                y: data.y - location.y
            });
        }
        else if (secondRing && this.selectedName == 'template' && this.selectedTemplate != selected) {
            this.selectedTemplate = selected;
            this.selectedTemplateName = this.templateOptions[selected-1].name;

            this.drawMenu({
                x: data.x - location.x,
                y: data.y - location.y
            });
        }
        else if (secondRing && this.selectedName == 'draw') {
            if (selected < 16) {
                this.selectedDrawingTool = selected;
                this.selectedDrawingToolName = this.drawingOptions[selected-1].name;
            }
            else if (selected < 24) {   //line color
                this.selectedLineColor = selected-16
                this.selectedLineColorInt = this.colors[this.selectedLineColor].int;
                if (this.pen.lastDrawing != undefined && this.selectedDrawingTool == 1) {
                    const strokeAlpha = this.colors[this.selectedLineColor].hex != 'none' ? 1 : 0;
                    const strokeColor = this.colors[this.selectedLineColor].hex != 'none' ? this.colors[this.selectedLineColor].hex : this.pen.lastDrawing.data.strokeColor;
                    this.pen.lastDrawing.update({strokeAlpha,strokeColor})
                }
            }
            else {   //fill color
                this.selectedFillColor = selected-24
                this.selectedFillColorInt = this.colors[this.selectedFillColor].int;
                if (this.pen.lastDrawing != undefined && this.selectedDrawingTool == 1) {
                    const fillType = this.colors[this.selectedFillColor].hex != 'none' ? 1 : 0;
                    const fillColor = this.colors[this.selectedFillColor].hex != 'none' ? this.colors[this.selectedFillColor].hex : "#000000";
                    this.pen.lastDrawing.update({fillType,fillColor})
                }
            }
            this.drawMenu({
                x: data.x - location.x,
                y: data.y - location.y
            });
        }
    }

    moveMenu(data, offset = false) {
        let x, y;
        if (offset) {
            x = this.location.x += data.x;
            y = this.location.y += data.y;
        }
        else {
            x = data.x;
            y = data.y;
            this.lastData = data;
        }
        
        this.container.setTransform(x, y);
        this.location.x = x;
        this.location.y = y;
        this.show();
    }

      /*
       * Update the cursor position, size and color
       */
    drawMenu(data) {
        if (data == undefined) {
            if (this.lastData == undefined) return;
            data = this.lastData;
            const scaled = scaleIRinput(data.rawCoords);
            data.x = scaled.x;
            data.y = scaled.y;
        }
        else if (data.rawCoords != undefined) {
            this.lastData = data;
        }
        
        this.open = true;
        const x = data.x;
        const y = data.y;

        const size = 150.0*(game.settings.get(moduleName,'MenuSize'))/canvas.scene._viewPosition.scale;

        this.location = {
            x: x,
            y: y,
            radius: (this.selected == 5 || this.selected == 6 || this.selected == 7) ? size/1.35 : size/2
        }

        this.container.removeChildren(); 
 
        if (this.selected == 7) { //macros
            this.secondRingEnabled = true;
            const nrOfMacroOptions = 8;
            const macroAngleSteps = 2*Math.PI/nrOfMacroOptions;
            const angleOffset = -0.5*Math.PI-macroAngleSteps/2;
            for (let i=0; i<nrOfMacroOptions; i++) {
                let section = new PIXI.LegacyGraphics();
                if (this.selectedMacro == i+1) section.beginFill(0x666666);
                else section.beginFill(0x000000);
                
                section.lineStyle(0.01*size, 0xFFFFFF);
                section.arc(0,0,size/1.35,angleOffset+macroAngleSteps*(i), angleOffset+macroAngleSteps*(i+1));
                section.arc(0,0,size/2, angleOffset+macroAngleSteps*(i+1),angleOffset+macroAngleSteps*(i), true);
                section.lineTo(size/1.35*Math.cos(angleOffset+macroAngleSteps*(i)),size/1.35*Math.sin(angleOffset+macroAngleSteps*(i)));
                section.name="section";
                section.sectionName=this.options[i].name;
                this.container.addChild(section);

                var label = new PIXI.Text(`M${i+1}`, {fontFamily : 'Arial', fontSize: size*0.1, fill : '#FFFFFF', align : 'center'});
                const x = Math.sin(macroAngleSteps*i);
                const y = -Math.cos(macroAngleSteps*i);
                label.anchor.set(0.5);
                label.position.x = 0.61*size*x;
                label.position.y = 0.61*size*y;
                label.rotation = macroAngleSteps*i;
                label.resolution = 5;
                this.container.addChild(label); 
            }
        }
        else if (this.selected == 6) {
            this.secondRingEnabled = true;
            //Draw Template
            const nrOfTemplateIcons = this.templateOptions.length;
            const templateAngleSteps = 2*Math.PI/nrOfTemplateIcons;
            const angleOffset = -0.5*Math.PI-templateAngleSteps/2;
            for (let i=0; i<nrOfTemplateIcons; i++) {
                let section = new PIXI.LegacyGraphics();
                if (this.selectedTemplate == i+1) section.beginFill(0x666666);
                else section.beginFill(0x000000);
                
                section.lineStyle(0.01*size, 0xFFFFFF);
                section.arc(0,0,size/1.35,angleOffset+templateAngleSteps*(i), angleOffset+templateAngleSteps*(i+1));
                section.arc(0,0,size/2, angleOffset+templateAngleSteps*(i+1),angleOffset+templateAngleSteps*(i), true);
                section.lineTo(size/1.35*Math.cos(angleOffset+templateAngleSteps*(i)),size/1.35*Math.sin(angleOffset+templateAngleSteps*(i)));
                section.name="section";
                section.sectionName=this.options[i].name;
                this.container.addChild(section);

                const texture = PIXI.Texture.from(this.templateOptions[i].icon);
                const icon = new PIXI.Sprite(texture);
                const x = Math.sin(templateAngleSteps*i);
                const y = -Math.cos(templateAngleSteps*i);
                icon.anchor.set(0.5);
                icon.width = size*0.12;
                icon.height = size*0.12;
                icon.position.x = 0.61*size*x;
                icon.position.y = 0.61*size*y;
                icon.rotation = templateAngleSteps*i;
                this.container.addChild(icon);  
            }
        }
        //Drawing
        else if (this.selected == 5) {
            this.secondRingEnabled = true;
            
            const nrOfDrawingIcons = this.drawingOptions.length;
            const drawingAngleSteps = Math.PI/nrOfDrawingIcons;
            let angleOffset = -0.5*Math.PI;
            for (let i=0; i<nrOfDrawingIcons; i++) {
                let section = new PIXI.LegacyGraphics();
                if (this.selectedDrawingTool == i+1) section.beginFill(0x666666);
                else section.beginFill(0x000000);
                
                section.lineStyle(0.01*size, 0xFFFFFF);
                section.arc(0,0,size/1.35,angleOffset+drawingAngleSteps*(i), angleOffset+drawingAngleSteps*(i+1));
                section.arc(0,0,size/2, angleOffset+drawingAngleSteps*(i+1),angleOffset+drawingAngleSteps*(i), true);
                section.lineTo(size/1.35*Math.cos(angleOffset+drawingAngleSteps*(i)),size/1.35*Math.sin(angleOffset+drawingAngleSteps*(i)));
                section.name="section";
                section.sectionName=this.drawingOptions[i].name;
                this.container.addChild(section);

                const texture = PIXI.Texture.from(this.drawingOptions[i].icon);
                const icon = new PIXI.Sprite(texture);
                const x = Math.sin(drawingAngleSteps*(i+0.5));
                const y = -Math.cos(drawingAngleSteps*(i+0.5));
                icon.anchor.set(0.5);
                icon.width = size*0.12;
                icon.height = size*0.12;
                icon.position.x = 0.61*size*x;
                icon.position.y = 0.61*size*y;
                icon.rotation = drawingAngleSteps*(i+0.5);
                this.container.addChild(icon);   
            }

            //Colors
            const nrOfColors = this.colors.length*2;
            const colorAngleSteps = Math.PI/nrOfColors;
            angleOffset = 0.5*Math.PI;
            const iconSize = size*0.075;
            for (let i=0; i<nrOfColors; i++) {
                const sel = (i<this.colors.length) ? i : i-this.colors.length;
                
                let section = new PIXI.LegacyGraphics();
                if (this.colors[sel].int != 'none') section.beginFill(this.colors[sel].int);

                section.lineStyle(0.01*size, 0xFFFFFF);
                section.arc(0,0,size/1.35,angleOffset+colorAngleSteps*(i), angleOffset+colorAngleSteps*(i+1));
                section.arc(0,0,size/2, angleOffset+colorAngleSteps*(i+1),angleOffset+colorAngleSteps*(i), true);
                section.lineTo(size/1.35*Math.cos(angleOffset+colorAngleSteps*(i)),size/1.35*Math.sin(angleOffset+colorAngleSteps*(i)));
                section.name="section";
                section.sectionName=this.colors[sel].name;
                this.container.addChild(section);
                

                if (this.selectedLineColor == i) {
                    const x = Math.sin(Math.PI+colorAngleSteps*(i+0.5));
                    const y = -Math.cos(Math.PI+colorAngleSteps*(i+0.5));

                    //Draw circle
                    var circle = new PIXI.Graphics();
                    circle.lineStyle(0.01*size, 0x000000, 1);
                    circle.beginFill(0x222222);
                    circle.drawCircle(0.61*size*x,0.61*size*y,iconSize/1.35);
                    this.container.addChild(circle);

                    //Draw icon
                    const texture = PIXI.Texture.from("modules/MaterialPlane/img/paint-brush-solid.png");
                    const icon = new PIXI.Sprite(texture);
                    icon.anchor.set(0.5);
                    icon.width = iconSize;
                    icon.height = iconSize;
                    icon.position.x = 0.61*size*x;
                    icon.position.y = 0.61*size*y;
                    icon.rotation = Math.PI+colorAngleSteps*(i+0.5);
                    this.container.addChild(icon);   
                }

                else if (this.selectedFillColor == i-8) {
                    const x = Math.sin(Math.PI+colorAngleSteps*(i+0.5));
                    const y = -Math.cos(Math.PI+colorAngleSteps*(i+0.5));

                    //Draw circle
                    var circle = new PIXI.Graphics();
                    circle.lineStyle(0.01*size, 0x000000, 1);
                    circle.beginFill(0x222222);
                    circle.drawCircle(0.61*size*x,0.61*size*y,iconSize/1.35);
                    this.container.addChild(circle);

                    //Draw icon
                    const texture = PIXI.Texture.from("modules/MaterialPlane/img/fill-solid.png");
                    const icon = new PIXI.Sprite(texture);
                    icon.anchor.set(0.5);
                    icon.width = size*0.075;
                    icon.height = size*0.075;
                    icon.position.x = 0.61*size*x;
                    icon.position.y = 0.61*size*y;
                    icon.rotation = Math.PI+colorAngleSteps*(i+0.5);
                    this.container.addChild(icon);   
                }
            }
        }
        else {
            this.secondRingEnabled = false;
        }
        

        //Draw Icons
        const nrOfIcons = this.options.length;
        const angleSteps = 2*Math.PI/nrOfIcons;
        const angleOffset = -0.5*Math.PI-angleSteps/2;

        for (let i=0; i<nrOfIcons; i++) {
            let section = new PIXI.LegacyGraphics();
            if (this.options[i].name == 'info' && this.infoVisible) section.beginFill(0x333333);
            else if (this.selected == i+1) section.beginFill(0x666666);
            else section.beginFill(0x000000);
            
            section.lineStyle(0.01*size, 0xFFFFFF);
            let arcStartAngle = angleOffset+angleSteps*(i);
            let arcEndAngle = angleOffset+angleSteps*(i+1);
            section.arc(0,0,size/2,arcStartAngle, arcEndAngle);
            section.arc(0,0,0.5*size/2, arcEndAngle,arcStartAngle, true);
            section.lineTo(size/2*Math.cos(arcStartAngle),size/2*Math.sin(arcStartAngle));
            section.name="section";
            section.sectionName=this.options[i].name;
            this.container.addChild(section);

            const texture = PIXI.Texture.from(this.options[i].icon);
            const icon = new PIXI.Sprite(texture);
            const x = Math.sin(angleSteps*i);
            const y = -Math.cos(angleSteps*i);
            icon.anchor.set(0.5);
            if (this.options[i].name == 'macro') {
                icon.width = size*0.2;
                icon.height = size*0.2;
            }
            else {
                icon.width = size*0.1;
                icon.height = size*0.1;
            }
            
            icon.position.x = 0.375*size*x;
            icon.position.y = 0.375*size*y;
            icon.rotation = angleSteps*i;
            this.container.addChild(icon);  
        }

        //Draw circle around logo
        var circle = new PIXI.Graphics();
        circle.lineStyle(0.01*size, "0xFFFFFF", 1);
        circle.beginFill("0x000000");
        circle.drawCircle(0,0,(size*0.50)/2);
        circle.name="circle";
        this.container.addChild(circle);
        
        //Draw logo
        const texture = PIXI.Texture.from('modules/MaterialPlane/img/MaterialFoundry512x512.png');
        const logo = new PIXI.Sprite(texture);
        logo.anchor.set(0.5);
        logo.width = size*0.50;
        logo.height = size*0.50;
        logo.name="logo";
        this.container.addChild(logo); 
        
        this.drawInfoMenu(this.selectedName, this.selectedDrawingTool, this.selectedTemplate, size)
       
        this.container.setTransform(x, y);
        this.container.visible = true;
        
    }

    drawTemplateRing() {

    }

    /*
    * Hide the cursor
    */
    hide() {
        this.container.visible = false;
        this.visible = false;
        this.pen.drawingTarget.hide();
    }

    /*
    * Show the cursor
    */
    show() {
        if (this.menuSize != game.settings.get(moduleName,'MenuSize')) {
            this.drawMenu();
        }
        this.container.visible = true;
        this.visible = true;
        this.open = true;
        if (this.selected == 5) this.pen.drawingTarget.show();
    }

    /*
    * Remove the cursor
    */
    remove() {
        this.container.removeChildren();
    }
}

