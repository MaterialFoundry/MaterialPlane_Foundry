import { sendWS } from "./websocket.js";
import { moduleName, calibrationProgress } from "../MaterialPlane.js";

let countdownCount = 5;
let countdown;
let overlay = undefined;

export class calibrationProgressScreen extends FormApplication {
    constructor(data, options) {
        super(data, options);
        this.calibrationRunning = false;
        this.pointCount = 0;
        this.calibrationMode = 'single';
    }

    /**
     * Default Options for this FormApplication
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "MaterialPlane_CalProgMenu",
            title: `Material Plane: Calibration`,
            template: "./modules/MaterialPlane/templates/calibrationProgressScreen.html",
            classes: ["sheet"],
            width: 400,
            height: "auto"
        });
    }

    _updateObjects(event, formData){
        
    }

    /**
     * Provide data to the template
     */
    getData() {
        return {
            iteration: [0,1,2,3]
        }
    }

    /**
     * Update on form submit
     * @param {*} event 
     * @param {*} formData 
     */
    async _updateObject(event, formData) {
        
    }

    activateListeners(html) {
        super.activateListeners(html);

        const calNextBtn = html.find("button[name='calNext']");

        calNextBtn.on("click", event => {
            const msg = "CAL NEXT";
            sendWS(msg);
        });
       
    }

    setCalibrationRunning(running) {
        this.calibrationRunning = running;
    }

    start(calMode) {
        this.calibrationMode = calMode;
        this.calibrationRunning = true;
        this.pointCount = 0;
        countdownCount = 5;
        this.render(true);
        
        if (this.calibrationMode != 'multi' && overlay == undefined && game.settings.get(moduleName,'TargetName') == game.user.name) {
            overlay = new calibrationOverlay();
            canvas.stage.addChild(overlay);
            overlay.init();
        }
        let calStart = "";
        if (this.calibrationMode == 'single') calStart = "Starting single-point calibration";
        else if (this.calibrationMode == 'offset') calStart = "Starting offset calibration";
        else if (this.calibrationMode == 'multi') calStart = "Starting multi-point calibration";

        let calInstructions = "";
        if (this.calibrationMode == 'single' || this.calibrationMode == 'offset') calInstructions = "To calibrate, move to one of the corners of you TV and wait a few seconds (beta hardware) or hold the button on the base for a few seconds and then wait (DIY hardware). The center of the base must align with the corner of the TV.";
        else if (this.calibrationMode == 'multi') calInstructions = "To calibrate, make sure all 4 IR points are visible and their coordinates are shown. Then press 'Calibrate'.";

        setTimeout(function(){
            document.getElementById('calStart').innerHTML = calStart;
            document.getElementById('calInstructions').innerHTML = calInstructions;
            if (calMode == 'multi') {
                document.getElementById('calNextBtn').innerHTML='Calibrate';
                document.getElementById('calNextBtn').disabled=true;
            }
            else document.getElementById("noMovement").style="";
            document.getElementById('MaterialPlane_CalProgMenu').style.height='auto';
        },10);
    }

    setMultiPoint(data) {
        if (this.calibrationMode != 'multi') return;
        let points = 0;
        for (let i=0; i<4; i++) {
            if (data[i]?.x != undefined && data[i]?.y != undefined) {
                points++;
                if (data[i].x != 0 && data[i].y != 0) {
                    document.getElementById("mpCalPoint_x"+i).innerHTML=data[i].x;
                    document.getElementById("mpCalPoint_y"+i).innerHTML=data[i].y;
                }
                document.getElementById("iterationPoint"+i).style.color='black';
                document.getElementById("mpCalPoint_x"+i).style.color='black';
                document.getElementById("mpCalPoint_y"+i).style.color='black';
            }
            else {
                document.getElementById("mpCalPoint_x"+i).innerHTML=0;
                document.getElementById("mpCalPoint_y"+i).innerHTML=0;
                document.getElementById("iterationPoint"+i).style.color='grey';
                document.getElementById("mpCalPoint_x"+i).style.color='grey';
                document.getElementById("mpCalPoint_y"+i).style.color='grey';
            }
        }
        if (points == 4) {
            document.getElementById('calNextBtn').disabled=false;
        }
        else {
            document.getElementById('calNextBtn').disabled=true;
        }
    }

    setPoint(point) {
        if (this.calibrationMode == 'multi') return;
        this.pointCount = point;
        if (point > 0) {
            point--;
            document.getElementById("iterationPoint"+point).style.color='black';
            document.getElementById("mpCalPoint_x"+point).style.color='black';
            document.getElementById("mpCalPoint_y"+point).style.color='black';
        }
    }

    updatePoint(data) {
        if (this.calibrationMode == 'multi') return;
        document.getElementById("noMovement").style="display:none";
        document.getElementById("waiting").style="";
        countdownCount = 5;
        const txt = `<b>Locking in point in 5 seconds.</b>`;
        document.getElementById("waiting").innerHTML=txt;
        clearInterval(countdown);
        countdown = setInterval(this.timer,1000);
        if (data.point > 0) return;
        if (data.x != undefined && data.y != undefined && data.x != 0 && data.y != 0) {
            document.getElementById("mpCalPoint_x"+this.pointCount).innerHTML=data.x;
            document.getElementById("mpCalPoint_y"+this.pointCount).innerHTML=data.y;
        }
    }
    
    timer(){
        countdownCount = countdownCount-1;
        
        if (countdownCount > 0) {
            const txt = `<b>Locking in point in ` + countdownCount + ` seconds.</b>`;
            document.getElementById("waiting").innerHTML=txt;
        }
        else {
            clearInterval(countdown);
            countdownCount = 5;
            document.getElementById("noMovement").style="";
            document.getElementById("waiting").style="display:none";
            document.getElementById('MaterialPlane_CalProgMenu').style.height='auto';
            const msg = "CAL NEXT";
            let user = game.users.contents.filter(u => u.active == true && u.isGM == true)[0];
            
            if (game.userId == user.id) sendWS(msg);
            else if (user == undefined && game.settings.get(moduleName,'TargetName') == game.user.name) sendWS(msg);
        }
    }

    done() {
        setTimeout(function(){calibrationProgress.close();},5000);
        this.calibrationRunning = false;
        document.getElementById("calDone").style="";
        document.getElementById("calNextBtn").style="display:none";
        document.getElementById("calCloseBtn").style="";
        document.getElementById("noMovement").style="display:none";
        document.getElementById("waiting").style="display:none";
        document.getElementById('MaterialPlane_CalProgMenu').style.height='auto';
    }

    cancel() {
        if (document.getElementById('MaterialPlane_CalProgMenu') == null) return;
        setTimeout(function(){calibrationProgress.close();},5000);
        this.calibrationRunning = false;
        document.getElementById("calCancel").style="";
        document.getElementById("calNextBtn").style="display:none";
        document.getElementById("calCloseBtn").style="";
        document.getElementById("noMovement").style="display:none";
        document.getElementById("waiting").style="display:none";
    }
}

export function removeOverlay(){
    if (game.settings.get(moduleName,'TargetName') != game.user.name) return;
    if (overlay == undefined) return;
    canvas.stage.removeChild(overlay);
    overlay.remove();
    overlay = undefined;
}

/*
 * tokenMarker draws a rectangle at the target position for the token
 */
export class calibrationOverlay extends ControlsLayer {
    constructor() {
        super();
        this.init();
    }
  
    init() {
        this.container = new PIXI.Container();
        this.addChild(this.container);

        var drawing = new PIXI.Graphics();
        drawing.beginFill("0x0");
        drawing.drawRect(0,0,canvas.scene.dimensions.width,canvas.scene.dimensions.height);
        drawing.endFill();
        drawing.alpha = 0.5;
        this.container.addChild(drawing);
        this.container.setTransform(0, 0);

        const horVisible = window.innerWidth/canvas.scene._viewPosition.scale;
        const vertVisible = window.innerHeight/canvas.scene._viewPosition.scale;

        let x = canvas.scene._viewPosition.x - horVisible/2;
        let y = canvas.scene._viewPosition.y - vertVisible/2;

        let arrows = new PIXI.Graphics();
        arrows.lineStyle(5, "0xff0000", 1);
        arrows.beginFill("0xff0000");

        arrows.drawCircle(x,y,20);
        arrows.moveTo(x+25,y+25);
        arrows.lineTo(x+100,y+100);
        arrows.moveTo(x+25,y+25);
        arrows.lineTo(x+75,y+25);
        arrows.moveTo(x+25,y+25);
        arrows.lineTo(x+25,y+75);

        x = canvas.scene._viewPosition.x + horVisible/2;
        arrows.drawCircle(x,y,20);
        arrows.moveTo(x-25,y+25);
        arrows.lineTo(x-100,y+100);
        arrows.moveTo(x-25,y+25);
        arrows.lineTo(x-75,y+25);
        arrows.moveTo(x-25,y+25);
        arrows.lineTo(x-25,y+75);

        x = canvas.scene._viewPosition.x - horVisible/2;
        y = canvas.scene._viewPosition.y + vertVisible/2;
        arrows.drawCircle(x,y,20);
        arrows.moveTo(x+25,y-25);
        arrows.lineTo(x+100,y-100);
        arrows.moveTo(x+25,y-25);
        arrows.lineTo(x+75,y-25);
        arrows.moveTo(x+25,y-25);
        arrows.lineTo(x+25,y-75);

        x = canvas.scene._viewPosition.x + horVisible/2;
        arrows.drawCircle(x,y,20);
        arrows.moveTo(x-25,y-25);
        arrows.lineTo(x-100,y-100);
        arrows.moveTo(x-25,y-25);
        arrows.lineTo(x-75,y-25);
        arrows.moveTo(x-25,y-25);
        arrows.lineTo(x-25,y-75);
        this.container.addChild(arrows);

        this.container.visible = true;
        this._zIndex = 500;
        this.zIndex = 500;

        $('#MaterialPlane_CalMenu').hide();
        $('#logo').hide();
        $('#sidebar').hide();
        $('#navigation').hide();
        $('#controls').hide();
        $('#players').hide();
        $('#hotbar').hide();
    }
  
    async draw() {
      super.draw();
    }
    
    /*
     * Hide the marker
     */
    hide() {
      this.container.visible = false;
    }
  
    /*
     * Show the marker
     */
    show() {
      this.container.visible = true;
    }
  
    /*
     * Remove the marker
     */
    remove() {
        this.container.removeChildren();
        $('#MaterialPlane_CalMenu').show();
        $('#logo').show();
        $('#sidebar').show();
        $('#navigation').show();
        $('#controls').show();
        $('#players').show();
        $('#hotbar').show();
    }
  }


