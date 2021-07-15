import { cursor, findToken, scaleIRinput } from "./misc.js";
import { IRtoken } from "./IRtoken.js";

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

    selectedToken;
    irToken;
    oldCommand = 0;
    rulerActive = 0;
    ruler;
    selectedTemplate;
    templateData;
    bar = {
        x0:undefined,
        x1:undefined,
        y0:undefined,
        y2:undefined,
        length:undefined,
        angle:undefined
    }
  
    init() {
        this.cursor = new cursor();
        canvas.stage.addChild(this.cursor);
        this.cursor.init();
        
        this.menu = new menu();
        canvas.stage.addChild(this.menu);
        this.menu.init();

        this.irToken = new IRtoken;
    }
  
    async draw() {
      super.draw();
    }

    analyze(data){
        const command = data.data[0].command;
        const point = data.data[0];
        const coords = {x:point.x, y:point.y};
        let scaledCoords = scaleIRinput(coords);

        if (command == 8) {         //no buttons pressed
            if (coords.x != undefined && coords.y != undefined) {
                if (this.oldCommand != 8) {
                    this.release(this.oldCommand,{
                        x: scaledCoords.x,
                        y: scaledCoords.y
                    });
                }
                this.updateCursor({
                    x: scaledCoords.x,
                    y: scaledCoords.y,
                    size: 5,
                    color: "0x00FF00",
                    rawCoords: coords
                });
            }
        }
        else if (command == 40) {      //pen left
            if (coords.x != undefined && coords.y != undefined) {
                if (this.oldCommand == 40) {
                    this.hold(command, {
                        x: scaledCoords.x,
                        y: scaledCoords.y,
                        rawCoords: coords
                    });
                }
                else {
                    this.click(command, {
                        x: scaledCoords.x,
                        y: scaledCoords.y,
                        rawCoords: coords
                    });
                }
            }
        }
        else if (command == 24) {      //pen right
            if (coords.x != undefined && coords.y != undefined) {
                if (this.oldCommand == 24) {
                    this.hold(command,{
                        x: scaledCoords.x,
                        y: scaledCoords.y,
                        rawX: coords.x,
                        rawY: coords.y
                    });
                }
                else {
                    this.click(command,{
                        x: scaledCoords.x,
                        y: scaledCoords.y,
                        rawCoords: coords
                    });
                }
            }
        }
        else if (command == 94) {      //pen front
            if (coords.x != undefined && coords.y != undefined) {
                if (this.oldCommand == 94) {
                    this.hold(command,{
                        x: scaledCoords.x,
                        y: scaledCoords.y
                    });
                }
                else {
                    this.click(command,{
                        x: scaledCoords.x,
                        y: scaledCoords.y,
                        rawCoords: coords
                    });
                }
            }
        }
        else if (command == 72) {      //pen rear
            if (coords.x != undefined && coords.y != undefined) {
                this.updateCursor({
                    x: scaledCoords.x,
                    y: scaledCoords.y,
                    size: 5,
                    color: "0x00FFFF"
                });

                const point2 = data.data[1];
                if (point2.x == undefined) return;
                const coords2 = {x:point2.x, y:point2.y};
                const scaledCoords2 = scaleIRinput(coords2);
                const dx = scaledCoords2.x - scaledCoords.x;
                const dy = scaledCoords2.y - scaledCoords.y;
                const length = Math.sqrt(dx*dx + dy*dy);
                const angle = Math.atan2(dy,dx)*180/Math.PI;

                if (this.oldCommand == 72) {
                    this.hold(command,{
                        x: scaledCoords.x,
                        y: scaledCoords.y,
                        x2: scaledCoords2.x,
                        y2: scaledCoords2.y,
                        length,
                        angle
                    });
                }
                else {
                    this.click(command,{
                        x: scaledCoords.x,
                        y: scaledCoords.y,
                        x2: scaledCoords2.x,
                        y2: scaledCoords2.y,
                        length,
                        angle,
                        rawCoords: coords
                    });
                }
            }
        }
        
        this.oldCommand = command;
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
            selected: this.menu.selected
        }
        if (this.menu.selected > 0) 
            cursorData.icon = this.menu.options[this.menu.selected-1];
        
        this.cursor.updateCursor(cursorData);
        
        if (this.menu.location.x != undefined) {
            if (this.menu.inMenu(data)) {
                this.menu.alpha = 0.75;
            }
            else {
                this.menu.alpha = 0.5;
                if (this.rulerActive == 1) {
                    this.ruler.update({x:data.x, y:data.y});
                }
            }
        }
    }

    drawMenu(data) {
        this.cursor.hide();
        this.menu.drawMenu(data);
    }

    async click(command,data) {
        this.cursor.updateCursor({
            x: data.x,
            y: data.y,
            size: 5,
            color: "0xFFFFFF"
        })

        if (command == 24 && this.menu.location.x != undefined && this.menu.inMenu(data)) {
            this.menu.getPoint(data);
        }
        else if (command == 94) { //draw menu
            if (this.menu.container.visible) this.menu.hide();
            else this.drawMenu(data);
        }
        else if (this.menu.selectedName == "pointer") { //pointer
            if (command == 24) {
                const x = data.rawCoords.x / 4096 * screen.width;
                const y = data.rawCoords.y / 4096 * screen.height;
    
                let element = document.elementFromPoint(x,y)
                if (element != null && element.id != 'board') {
                    element.click();
                   // element.onDragStart();
                }
                else {
                    this.checkDoorClick(data);
                }
            }
            
        }

        else if (this.menu.selectedName == "token") { //token
            if (command == 24) {

            }
            
        }

        else if (this.menu.selectedName == "token") { //pointer
            if (command == 24) {
                this.checkTokenClick(data);
            }
        }
        
        else if (this.menu.selectedName == "ruler") { //ruler
            if (command == 24) {
                if (this.rulerActive == 1) {
                    this.ruler.addWaypoint({x:data.x, y:data.y});
                }
                else {
                    this.rulerActive = 1;
                    this.ruler = new ruler();
                    this.ruler.init();
                    this.ruler.start({x:data.x, y:data.y})
                }
                
            }
            else if (command == 40) {
                if (this.rulerActive == 1) {
                    this.rulerActive = 2;
                }
                else if (this.rulerActive == 2) {
                    this.ruler.clear();
                    this.rulerActive = 0;
                }
            }
            
        }
        else if (this.menu.selectedName == "draw") { //draw
            
        }
        else if (this.menu.selectedName == "target") { //target
            
        }
        else if (this.menu.selectedName == "template") { //template
            if (command == 24 || command == 40 || command == 72) {
                
                let templates = canvas.templates.placeables;
                let nearestDistance = 10000;
                for (let template of templates) {
                    const dist = Math.abs(template.x-data.x) + Math.abs(template.y-data.y)
                    if (dist < 500 && dist < nearestDistance) {
                        this.selectedTemplate = template;
                        nearestDistance = dist;
                    }
                }
            }

            if (command == 40) {
                this.templateData = data;
            }
            else if (command == 72) {
                this.bar = {
                    x0:data.x,
                    x1:data.x2,
                    y0:data.y,
                    y2:data.y2,
                    length:data.length,
                    angle:data.angle
                }
            }
        }
    }
    
    hold(command,data) {
        if (this.rulerActive == 1) {
            this.ruler.update({x:data.x, y:data.y});
        }
        if (command == 24 && this.menu.drag) {
            this.menu.moveMenu(data);
            return;
        }
        if (this.menu.selectedName == "pointer") { //pointer
            

        }
        else if (this.menu.selectedName == "token") { //token
            if (command == 24) {
                let forceNew = false;
                const coords = {x:data.x, y:data.y};
                const rawCoords = {x:data.rawX, y: data.rawY};
                this.irToken.update(rawCoords,coords,forceNew)
            } 
        }
        else if (this.menu.selectedName == "template") { //template
            if (this.selectedTemplate == undefined) return;
            if (command == 24) {
                this.selectedTemplate.data.x = data.x;
                this.selectedTemplate.data.y = data.y;
                this.selectedTemplate.refresh();
                this.selectedTemplate.highlightGrid();
            }
            else if (command == 40) {
                const dx = data.x - this.selectedTemplate.data.x;
                const dy = data.y - this.selectedTemplate.data.y;
                const length = Math.sqrt(dx*dx + dy*dy)*canvas.dimensions.distance/canvas.dimensions.size;
                this.templateData = data;
                this.selectedTemplate.data.distance = length;
                const angle = 90-Math.atan2(dx,dy)*180/Math.PI;
                this.selectedTemplate.data.direction = angle;
                this.selectedTemplate.refresh();
                this.selectedTemplate.highlightGrid();
            }
            else if (command == 72) {
                const angleChange = data.angle - this.bar.angle;
                this.bar = {
                    x0:data.x,
                    x1:data.x2,
                    y0:data.y,
                    y2:data.y2,
                    length:data.length,
                    angle:data.angle
                }
                this.selectedTemplate.data.direction += angleChange;
                this.selectedTemplate.refresh();
                this.selectedTemplate.highlightGrid();
            }
        }
    }

    release(command,data) {
        this.menu.drag = false;
        if (this.menu.selectedName == "pointer" && command == 24) {    //pointer
 
        }
        else if (this.menu.selectedName == "token") { //token
            if (command == 24) {
                this.irToken.dropIRtoken();
            } 
        }
        else if (this.menu.selectedName == "target" && command == 24) {    //target
            const token = findToken(data);
            if (token == undefined) return;
            token.setTarget(!token.isTargeted,{releaseOthers:false});
        }
        else if (this.menu.selectedName == "template") { //template
            if (this.selectedTemplate == undefined) return;
            if (command == 24) {
                this.selectedTemplate.update({x:data.x,y:data.y})
            }
            else if (command == 40) {
                this.selectedTemplate.update({distance:this.selectedTemplate.data.distance,direction:this.selectedTemplate.data.direction})
            }
            else if (command == 72) {
                this.selectedTemplate.update({direction:this.selectedTemplate.data.direction})
            }
        }
    }

    checkDoorClick(data) {
        const doors = canvas.walls.doors;
        for (let door of doors) {
            const position = door.doorControl.position;
            const hitArea = door.doorControl.hitArea;

            if (Math.abs(data.x - position.x - hitArea.width/2) <= hitArea.width/2 && Math.abs(data.y - position.y - hitArea.height/2) <= hitArea.height/2) {
                door.doorControl._onMouseDown({ stopPropagation: event => {return;} });
            }
        }
    }

    checkTokenClick(data) {
        const token = findToken(data);
        if (token == undefined) {
           
        }
        else {
            if (token._controlled) token.release();
            else {
                token.control({releaseOthers:false});
                this.selectedToken = token;
            }
        }
    }

    
    /*
     * Hide the cursor
     */
    hide() {
      
    }
  
    /*
     * Show the cursor
     */
    show() {
      
    }

    hideMenu(){
        
    }

    showMenu() {
      
    }
  
    /*
     * Remove the cursor
     */
    remove() {
     
    }
}

class ruler extends CanvasLayer {
    constructor() {
        super();
        this.init();
    }

    async draw() {
        super.draw();
      }

    init() {
        this.ruler = new Ruler(game.user);
        this.container = new PIXI.Container();
        this.addChild(this.container);
        this._zIndex=1100;
        this.zIndex=1100;
        this.container.zIndex=1100;
        this.container._zIndex=1100;
    }

    addWaypoint(data){
        this.ruler.waypoints.push({x:data.x, y:data.y});
        this.ruler.labels.addChild(new PreciseText("", CONFIG.canvasTextStyle));
    }

    clear() {

    }

    start(data) {
        this.ruler.waypoints.push({x:data.x, y:data.y});
        this.ruler.labels.addChild(new PreciseText("", CONFIG.canvasTextStyle));
        
        var drawing = new PIXI.Graphics();
        drawing.lineStyle(1, 0xffffff, 1);
        drawing.beginFill(0xffffff);
        drawing.drawCircle(0,0,50);
        this.container.addChild(drawing);
        this.container.setTransform(data.x+200, data.y+200);
        this.container.visible = true;
        this.draw();
    }

    update(data) {
        this.ruler.measure(data,true);
    }
}

class menu extends CanvasLayer {
    constructor() {
      super();
      this.init();
    }

    options = [
        {
            name: "pointer",
            icon: "modules/MaterialPlane/img/mouse-pointer-solid.png",
            anchor: {x:0, y:0}
        },
        {
            name: "token",
            icon: "modules/MaterialPlane/img/user-solid.png",
            anchor: {x:0.5, y:0.5}
        },
        {
            name: "ruler",
            icon: "modules/MaterialPlane/img/ruler-solid.png",
            anchor: {x:0.5, y:0.5}
        },
        {
            name: "target",
            icon: "modules/MaterialPlane/img/bullseye-solid.png",
            anchor: {x:0.5, y:0.5}
        },
        {
            name: "draw",
            icon: "modules/MaterialPlane/img/pencil-alt-solid.png",
            anchor: {x:0, y:1}
        },
        {
            name: "template",
            icon: "modules/MaterialPlane/img/ruler-combined-solid.png",
            anchor: {x:0, y:1}
        }
    ];

    drag = false;

    selected = 1;
    selectedName = this.options[0].name;

    location = {
        x: undefined,
        y: undefined,
        radius: undefined
    };

    setAlpha(alpha) {
        this.container.alpha = alpha;
    }
  
    init() {
        this.container = new PIXI.Container();
        this.container.alpha = 0.75;
        this.addChild(this.container);
        this._zIndex=999;
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
        if (a < b) return true;
        else return false;
    }

    getPoint(data) {
        
        const location = {
            x: data.x-this.location.x,
            y: data.y-this.location.y
        }
        
        const a = location.x*location.x + location.y*location.y;
        const b = (this.location.radius*0.5)*(this.location.radius*0.5);
        const nrOfIcons = this.options.length;
        const angleSteps = 2*Math.PI/nrOfIcons;

        let selected;
        if (a < b) selected = 0;    //icon
        else {

            let angle = Math.atan(location.x/-location.y);
            if (location.x > 0 && location.y > 0) angle = Math.PI/2+angle + Math.PI/2;
            else if (location.x < 0 && location.y > 0) angle += Math.PI;
            else if (location.x < 0 && location.y < 0) angle = Math.PI/2+angle + 3*Math.PI/2;

            selected = Math.floor(angle/angleSteps + angleSteps/2);
            if (selected == nrOfIcons) selected = 0;
            selected++;

        }
        
        if (selected == 0) {
            this.moveMenu(data);
            this.drag = true;
        }
        else if (this.selected != selected) {
            this.selected = selected;
            this.selectedName = this.options[selected-1].name;
            this.drawMenu({
                x: data.x - location.x,
                y: data.y - location.y
            });
            let control;
            
            if (this.selectedName == 'template') {
                control = ui.controls.controls.find(c => c.name == 'measure');
            }
            else if (this.selectedName == 'draw') {
                control = ui.controls.controls.find(c => c.name == 'drawings');
            }
            else {
                control = ui.controls.controls.find(c => c.name == 'token');
            }

            if (control != undefined) {

            }
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
        const x = data.x;
        const y = data.y;

        const size = canvas.dimensions.size*1.5;

        this.location = {
            x: x,
            y: y,
            radius: size/2
        }

        this.container.removeChildren(); 

        //Draw Icons
        const nrOfIcons = this.options.length;
        const angleSteps = 2*Math.PI/nrOfIcons;
        for (let i=0; i<nrOfIcons; i++) {
            let section = new PIXI.Graphics();
            if (this.selected == i+1) section.beginFill(0x666666);
            else section.beginFill(0x000000);
            
            section.lineStyle(2, 0xFFFFFF);

            section.arc(0,0,size/2,angleSteps*(i-2), angleSteps*(i-1));
            section.arc(0,0,0.5*size/2, angleSteps*(i-1),angleSteps*(i-2), true);
            section.lineTo(size/2*Math.cos(angleSteps*(i-2)),size/2*Math.sin(angleSteps*(i-2)));
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
            icon.position.x = 0.75*size/2*x;
            icon.position.y = 0.75*size/2*y;
           // icon.rotation = angleSteps*i;
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
      
    /*
    * Hide the cursor
    */
    hide() {
        this.container.visible = false;
    }

    /*
    * Show the cursor
    */
    show() {
        this.container.visible = true;
    }

    /*
    * Remove the cursor
    */
    remove() {
        this.container.removeChildren();
    }
}