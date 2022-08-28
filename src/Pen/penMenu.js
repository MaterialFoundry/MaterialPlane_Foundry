import { moduleName } from "../../MaterialPlane.js";

export class penMenu extends CanvasLayer {
    constructor() {
      super();
      this.init();
    }

    options = [
        {
            name: "pointer",
            icon: "modules/MaterialPlane/img/mouse-pointer-solid.png"
        },
        {
            name: "token",
            icon: "modules/MaterialPlane/img/user-solid.png"
        },
        {
            name: "ruler",
            icon: "modules/MaterialPlane/img/ruler-solid.png"
        },
        {
            name: "target",
            icon: "modules/MaterialPlane/img/bullseye-solid.png"
        },
        {
            name: "draw",
            icon: "modules/MaterialPlane/img/pencil-alt-solid.png"
        },
        {
            name: "template",
            icon: "modules/MaterialPlane/img/ruler-combined-solid.png"
        }
    ];

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

    secondRingEnabled = false;

    location = {
        x: undefined,
        y: undefined,
        radius: undefined
    };

    pen;

    visible = false;
    open = false;

    setAlpha(alpha) {
        this.container.alpha = alpha;
    }
  
    init(pen) {
        this.container = new PIXI.Container();
        this.container.alpha = 0.75;
        this.addChild(this.container);
        this._zIndex=999;
        this.pen = pen;
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
        }
        
        if (selected == 0) {
            this.moveMenu(data);
            this.drag = true;
        }
        else 
            this.setSelected(selected,secondRing,data)
    }

    setSelected(selected,secondRing,data={x:this.location.x, y:this.location.y}) {
        const location = {
            x: data.x-this.location.x,
            y: data.y-this.location.y
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
                ui.controls.activeControl = 'measure';
                ui.controls.render();
                canvas.layers.find(layer => layer.name == "TemplateLayer").activate();
                this.selectedTemplate = 1;
                this.selectedTemplateName = this.templateOptions[0].name;
            }
            else if (this.selectedName == 'draw') {
                ui.controls.activeControl = 'drawings';
                ui.controls.render();
                canvas.layers.find(layer => layer.name == "DrawingsLayer").activate();
            }
            else {
                ui.controls.activeControl = 'token';
                ui.controls.render();
                canvas.layers.find(layer => layer.name == "TokenLayer").activate();
            }

            if (control != undefined) {

            }
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

    moveMenu(data) {
        const x = data.x;
        const y = data.y;
        this.container.setTransform(x, y);
        this.location.x = x;
        this.location.y = y;
        this.show();
    }
    
      /*
       * Update the cursor position, size and color
       */
    drawMenu(data) {
        this.open = true;
        const x = data.x;
        const y = data.y;

        const size = canvas.dimensions.size*game.settings.get(moduleName,'MenuSize');

        this.location = {
            x: x,
            y: y,
            radius: (this.selected == 5 || this.selected == 6) ? size/1.35 : size/2
        }

        this.container.removeChildren(); 

        if (this.selected == 6) {
            this.secondRingEnabled = true;
            //Draw Template
            const nrOfTemplateIcons = this.templateOptions.length;
            const templateAngleSteps = 2*Math.PI/nrOfTemplateIcons;
            const angleOffset = -0.5*Math.PI-templateAngleSteps/2;
            for (let i=0; i<nrOfTemplateIcons; i++) {
                let section = new PIXI.LegacyGraphics();
                if (this.selectedTemplate == i+1) section.beginFill(0x666666);
                else section.beginFill(0x000000);
                
                section.lineStyle(2, 0xFFFFFF);
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
        else if (this.selected == 5) {
            this.secondRingEnabled = true;
            //Drawing
            const nrOfDrawingIcons = this.drawingOptions.length;
            const drawingAngleSteps = Math.PI/nrOfDrawingIcons;
            let angleOffset = -0.5*Math.PI;
            for (let i=0; i<nrOfDrawingIcons; i++) {
                let section = new PIXI.LegacyGraphics();
                if (this.selectedDrawingTool == i+1) section.beginFill(0x666666);
                else section.beginFill(0x000000);
                
                section.lineStyle(2, 0xFFFFFF);
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

                section.lineStyle(2, 0xFFFFFF);
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
                    circle.lineStyle(2, 0x000000, 1);
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
                    circle.lineStyle(2, 0x000000, 1);
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
            if (this.selected == i+1) section.beginFill(0x666666);
            else section.beginFill(0x000000);
            
            section.lineStyle(2, 0xFFFFFF);
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
            icon.width = size*0.1;
            icon.height = size*0.1;
            icon.position.x = 0.375*size*x;
            icon.position.y = 0.375*size*y;
            icon.rotation = angleSteps*i;
            this.container.addChild(icon);  
        }

        //Draw circle around logo
        var circle = new PIXI.Graphics();
        circle.lineStyle(2, "0xFFFFFF", 1);
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
    }

    /*
    * Show the cursor
    */
    show() {
        this.container.visible = true;
        this.visible = true;
        this.open = true;
    }

    /*
    * Remove the cursor
    */
    remove() {
        this.container.removeChildren();
    }
}