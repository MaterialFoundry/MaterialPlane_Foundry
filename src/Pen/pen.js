import { penMenu } from "./penMenu.js";
import { scaleIRinput } from "../IRtoken/tokenHelpers.js";
import { Cursor } from "../Misc/cursor.js";
import { pointerFunction } from "./Functions/penPointer.js"
import { tokenFunction, initializeTokenFunction } from "./Functions/penToken.js";
import { rulerFunction } from "./Functions/penRuler.js";
import { targetFunction } from "./Functions/penTarget.js";
import { drawFunction } from "./Functions/penDraw.js";
import { templateFunction } from "./Functions/penTemplate.js";
import { macroFunction } from "./Functions/penMacro.js";
import { MaterialPlaneLayer } from "../Misc/misc.js";

/*
 * 
 */
export class Pen extends CanvasLayer {
    constructor() {
      super();
      this.cursor;
      this.menu;
      this.init();
    }

    oldCommand = 0;
    holdTime;
    lastClick = 0;
    bar = {
        x0:undefined,
        x1:undefined,
        y0:undefined,
        y2:undefined,
        length:undefined,
        angle:undefined
    }
    cursorTimeout;
    open = false;
    visible = false;
    drawingTarget;
    
    init() {
        this.cursor = new Cursor();
        canvas.stage.addChild(this.cursor);
        this.cursor.init();
        
        this.menu = new penMenu();
        canvas.stage.addChild(this.menu);
        this.menu.init(this);
        this.menu.container.visible = false;
        initializeTokenFunction();

        this.drawingTarget = new PenDrawingTarget();
    }

    setCursorTimeout(){
        if (this.cursorTimeout != undefined) 
            clearTimeout(this.cursorTimeout);
        this.cursor.show();
        let parent = this;
        this.cursorTimeout = setTimeout(function(){
            if (parent.cursor.visible) parent.cursor.hide();
            if (parent.menu.visible) parent.menu.hide();
            parent.cursorTimeout = undefined;
        },1000);
        
    }
  
    async draw() {
      super.draw();
    }

    async analyze(data){
        if (this.menu.open && !this.menu.visible) this.menu.show();
        let command = data.command;
        if (command == 2) command = 'penIdle';
        else if (command == 3) command = 'penA';
        else if (command == 6) command = 'penD';
        else if (command == 4) command = 'penB';
        else if (command == 5) command = 'penC';
        else if (command == 7) command = 'penFront';
        else if (command == 8) command = 'penRear';

        const point = data.irPoints[0];
        const coords = {x:point.x, y:point.y};
        let scaledCoords = scaleIRinput(coords);
        let status = 'click';

        if (command == 'penIdle') {         //no buttons pressed
            this.menu.drag = false;
            if (coords.x != undefined && coords.y != undefined) {
                if (this.menu.selectedName == "ruler")
                    rulerFunction(command, {x: scaledCoords.x, y: scaledCoords.y}, status);
                else if (this.menu.selectedName == "draw")
                    drawFunction(command, {x: scaledCoords.x, y: scaledCoords.y}, status);

                this.updateCursor({
                    x: scaledCoords.x,
                    y: scaledCoords.y,
                    size: 5,
                    color: "0x00FF00",
                    rawCoords: coords
                });

                if (this.oldCommand != 'penIdle')   {
                    status = 'release';
                    this.holdTime = undefined;
                }
                else                                
                    return;
            }
        }
        
        status = (status != 'release' && this.oldCommand == command) ? 'hold' : status;

        let coordinates = {
            x: scaledCoords.x,
            y: scaledCoords.y,
            rawCoords: coords,
            x2: undefined,
            y2: undefined,
            length: undefined,
            angle: undefined
        };

        if (status == 'hold') {
            if (this.holdTime == undefined) this.holdTime = Date.now();

            if (command == 'penC' && this.menu.drag) {
                this.menu.moveMenu(coordinates);
                return;
            }
        }
        else {
            this.cursor.updateCursor({
                x: coordinates.x,
                y: coordinates.y,
                size: 5,
                color: "0xFFFFFF"
            })
            this.setCursorTimeout();

            if ((command == 'penC' || command == 'penD') && this.menu.location.x != undefined && this.menu.inMenu(coordinates)) {
                this.menu.getPoint(coordinates);
                return;
            }
        }

        //Button debouncing
        if (status != 'hold') {
            if (Date.now() - this.lastClick < 250) return;
            this.lastClick = Date.now();
        }

        if (status == 'release') {
            command = this.oldCommand;
            this.oldCommand = 'penIdle';
        }
        else
            this.oldCommand = command;

        if (command == 'penC' && status == 'click') { //draw or hide menu
            if (this.menu.visible) this.menu.hide();
            else this.drawMenu(coordinates);
            return;
        }
        else if (command == 'penB') {
            const point2 = data.irPoints[1];
            if (status == 'release' && (point2 == undefined || point2.x == undefined)) {
                coordinates.x2 = this.bar.x1;
                coordinates.y2 = this.bar.x1;
                coordinates.length = this.bar.length;
                coordinates.angle = this.bar.angle;
            }
            else if (point2 == undefined || point2.x == undefined) return;
            else {
                const coords2 = {x:point2.x, y:point2.y};
                const scaledCoords2 = scaleIRinput(coords2);
                const dx = scaledCoords2.x - scaledCoords.x;
                const dy = scaledCoords2.y - scaledCoords.y;
                const length = Math.sqrt(dx*dx + dy*dy);
                const angle = Math.atan2(dy,dx)*180/Math.PI;
                coordinates.x2 = scaledCoords2.x;
                coordinates.y2 = scaledCoords2.y;
                coordinates.length = length;
                coordinates.angle = angle;
            }
        }

        if (this.menu.selectedName == "pointer")        pointerFunction(command, coordinates, status);
        else if (this.menu.selectedName == "token")     tokenFunction(command, coordinates, status);
        else if (this.menu.selectedName == "ruler")     rulerFunction(command, coordinates, status);
        else if (this.menu.selectedName == "target")    targetFunction(command, coordinates, status); 
        else if (this.menu.selectedName == "draw")      drawFunction(command, coordinates, status, this.menu);  
        else if (this.menu.selectedName == "template")  templateFunction(command, coordinates, status, this.menu);  
        else if (this.menu.selectedName == "macro")     macroFunction(command, coordinates, status, data, this.menu);
    }

    /*
     * Update the cursor position, size and color
     */
    updateCursor(data) {
        let cursorData = {
            x: data.x,
            y: data.y,
            size: 5,
            color: "0x00FF00",
            selected: this.menu.selected,
            selectedTemplate: this.menu.selectedTemplate,
            selectedDrawintTool: this.selectedDrawingTool
        }
        //Draw
        if (this.menu.selected == 5)
            cursorData.icon = this.menu.drawingOptions[this.menu.selectedDrawingTool-1];
        //Template
        else if (this.menu.selected == 6)
            cursorData.icon = this.menu.templateOptions[this.menu.selectedTemplate-1];
        else if (this.menu.selected > 0) 
            cursorData.icon = this.menu.options[this.menu.selected-1];
        
        this.cursor.updateCursor(cursorData);

        this.setCursorTimeout();
        
        if (this.menu.location.x != undefined) {
            if (this.menu.inMenu(data)) {
                this.menu.alpha = 0.85;
            }
        }
    }

    drawMenu(data) {
        this.cursor.hide();
        this.menu.drawMenu(data);
    }

    hide() {}
  
    /*
     * Show the cursor
     */
    show() {
        this.container.visible = true;
    }

    hideMenu(){}

    showMenu() {}
  
    remove() {}
}

class PenDrawingTarget extends MaterialPlaneLayer {

    targets = [];
    container;
    alpha = 0.75;
    visible = false;
    menuHidden = false;

    constructor() {
        super();
        this.init();
    }

    async draw() {
      super.draw();
    }

    init() {
        this.container = new PIXI.Container();
        this.addChild(this.container);
    }

    addTarget(drawing) {
        const targetExists = this.targets.find(t => t.drawingId == drawing.id);
        if (targetExists != undefined) return;

        const size = canvas.grid.size/4;

        let target = new PIXI.Container();
        this.targets.push(target);

        //Draw circle
        var circle = new PIXI.Graphics();
        circle.lineStyle(2, 0x000000, 1);
        circle.beginFill(0x444444);
        circle.drawCircle(0,0,size);
        target.addChild(circle);

        //Draw icon
        const texture = PIXI.Texture.from("modules/MaterialPlane/img/pencil-alt-solid.png");
        const icon = new PIXI.Sprite(texture);
        icon.anchor.set(0,0);
        icon.width = size;
        icon.height = size;
        icon.position.set(-size/2,-size/2);
        target.addChild(icon);

        target.drawingId = drawing.id;
        target.setTransform(drawing.x+drawing.document.shape.width/2, drawing.y+drawing.document.shape.height/2);
        target.alpha = this.alpha;

        this.container.addChild(target);
        if (!this.visible) this.container.visible = false;

        canvas.app.stage.addChild(this.container);
    }

    updateTarget(drawing) {
        const target = this.targets.find(t => t.drawingId == drawing.id);
        if (target == undefined) return;

        target.setTransform(drawing.x+drawing.document.shape.width/2, drawing.y+drawing.document.shape.height/2);
    }

    removeTarget(drawing) {
        const target = this.targets.find(t => t.drawingId == drawing.id);
        if (target == undefined) return;

        this.container.removeChild(target);
    }

    show() {
        this.container.visible = true;
        this.visible = true;
    }

    hide() {
        this.container.visible = false;
        this.visible = false;
    }
}