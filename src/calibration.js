import { sendWS } from "./Communication/websocket.js";
import { moduleName, calibrationProgress } from "../MaterialPlane.js";
import { hideElement, showElement, setSelectElement } from "./Misc/misc.js";

let countdownCount = 5;
let countdown;

export let calOverlay = undefined;

export class calibrationProgressScreen extends FormApplication {
    config = {};
    calibrationRunning = false;
    pointCount = 0;
    calibrationMode = 'single';

    constructor(data, options) {
        super(data, options);
    }

    /**
     * Default Options for this FormApplication
     */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
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

    configureElements(config, socket=false) {
        this.config = config;

        hideElement("mpCalMethodExplanation");
        hideElement("mpCalSinglepointSelector");
        hideElement("mpCalSinglepointDescription");
        hideElement('mpCalOffsetSelector');
        hideElement('mpCalOffsetDescription');
        hideElement('mpCalStartButton');
        hideElement('mpCalLocationDescription');
        hideElement('mpCalLocationSelector');
        hideElement('mpCalOffsetDescription');

        if (socket) {
            setSelectElement("mpCalMethodSel", config.methodSel);
            setSelectElement("mpCalOffsetSel", config.customMode);
            setSelectElement("mpCalSinglepointSel", config.pointMode);
            setSelectElement("mpCalLocationSel", config.location);
        }
        
        if (config.methodSel === '') {
            showElement("mpCalMethodExplanation");
            if (game.settings.get(moduleName,'ActiveUser') === game.userId) calOverlay.init('');
        }
        else if (config.methodSel === 'Normal') {
            showElement("mpCalSinglepointSelector");
            showElement("mpCalSinglepointDescription");

            if (config.pointMode === '') {
                showElement('mpCalSinglepointDescription');
                if (game.settings.get(moduleName,'ActiveUser') === game.userId) calOverlay.init('');
            }
            else if (config.pointMode) {
                hideElement('mpCalSinglepointDescription');
                showElement('mpCalLocationDescription');
                showElement('mpCalLocationSelector');
                if (game.settings.get(moduleName,'ActiveUser') === game.userId) calOverlay.init('both');
            }
    
            if (config.location === '') {
                showElement('mpCalLocationDescription');
            }
            else if (config.location) {
                showElement('mpCalStartButton');
            }
    
            if (config.pointMode != '') {
                if (config.location === 'On-Screen') {
                    if (game.settings.get(moduleName,'ActiveUser') === game.userId) calOverlay.init('onScreen');
                }
                else if (config.location === 'Corner') {
                    if (game.settings.get(moduleName,'ActiveUser') === game.userId) calOverlay.init('corners');
                }
            }
        }
        else if (config.methodSel == 'Custom') {
            showElement('mpCalOffsetSelector');
            showElement('mpCalOffsetDescription');

            if (config.customMode === '') {
                showElement('mpCalOffsetDescription');
            }
            else if (config.customMode === 'Custom') {
                showElement('mpCalStartButton');
                hideElement('mpCalOffsetDescription');
            }
            else if (config.customMode === 'Calibrate') {
                hideElement('mpCalOffsetDescription');
                showElement('mpCalSinglepointSelector');
                showElement('mpCalSinglepointDescription');

                if (config.pointMode === '') {
                    showElement('mpCalSinglepointDescription');
                }
                else if (config.pointMode) {
                    hideElement('mpCalSinglepointDescription');
                    showElement('mpCalLocationDescription');
                    showElement('mpCalLocationSelector');
                    if (game.settings.get(moduleName,'ActiveUser') === game.userId) calOverlay.init('both');
                }
        
                if (config.location === '') {
                    showElement('mpCalLocationDescription');
                }
                else if (config.location) {
                    showElement('mpCalStartButton');
                }
        
                if (config.pointMode != '') {
                    if (config.location === 'On-Screen') {
                        if (game.settings.get(moduleName,'ActiveUser') === game.userId) calOverlay.init('onScreen');
                    }
                    else if (config.location === 'Corner') {
                        if (game.settings.get(moduleName,'ActiveUser') === game.userId) calOverlay.init('corners');
                    }
                }
            }
        }
 
        this.setHeight();

        if (!socket) game.socket.emit(`module.MaterialPlane`, {
            msgType: "calConfig",
            config
        });
    }

    

    activateListeners(html) {
        super.activateListeners(html);

        html.find("select[id='mpCalMethodSel']").on("change", event => {
            if (game.settings.get(moduleName,'ActiveUser') == game.userId) calOverlay.init('');
            this.config.methodSel = event.target.value;
            this.configureElements(this.config);
        });

        html.find("select[id='mpCalOffsetSel']").on("change", event => {
            if (game.settings.get(moduleName,'ActiveUser') == game.userId) calOverlay.init('');
            this.config.customMode = event.target.value;
            this.configureElements(this.config);
        });

        html.find("select[id='mpCalLocationSel']").on("change", event => {
            if (game.settings.get(moduleName,'ActiveUser') == game.userId) calOverlay.init('both');
            this.config.location = event.target.value;
            this.configureElements(this.config);
             
        });

        html.find("select[id='mpCalSinglepointSel']").on("change", event => {
            this.config.pointMode = event.target.value;
            this.configureElements(this.config);
        });

        html.find("button[name='mpStartCalibration']").on("click", event => {
            const modeSel = document.getElementById('mpCalMethodSel').value;
            const singlePointSel = document.getElementById('mpCalSinglepointSel').value;
            const locationSel = document.getElementById('mpCalLocationSel').value;
            const offsetModeSel = document.getElementById('mpCalOffsetSel').value;

            let mode;
            if (modeSel == 'Custom' && offsetModeSel == 'Calibrate') mode = 'Offset';
            else mode = singlePointSel;

            let calibrationBounds = {
                xMin: 0.1,
                xMax: 0.9,
                yMin: Math.round(10000/6)/10000,
                yMax: Math.round(50000/6)/10000
            }

            let msg = {
                event:"calibration", 
                state:"start", 
                mode
            }

            if (locationSel == 'On-Screen')
                msg.calibrationBounds = calibrationBounds;

            sendWS(msg); 
        });


        html.find("button[name='calNext']").on("click", event => {
            sendWS({event:"calibration", state:"next"});
        });
       
    }

    setHeight() {
        document.getElementById("MaterialPlane_CalProgMenu").style.height = 'auto';
    }

    setCalibrationRunning(running) {
        this.calibrationRunning = running;
    }

    init() {
        if (game.settings.get(moduleName,'ActiveUser') != game.userId && !game.user.isGM) return;
        this.config = {};
        this.calibrationMode = 'init';
        this.calibrationRunning = true;
        this.render(true);

        if (game.settings.get(moduleName,'ActiveUser') == game.userId) {
            if (calOverlay == undefined) {
                calOverlay = new calibrationOverlay();
                canvas.stage.addChild(calOverlay);
            }
            calOverlay.init('');
        }
        
        setTimeout(()=> {
            document.getElementById('mpCalConfig').style.display = '';
            document.getElementById('mpCalProcedure').style.display = 'none';
        },10);
    }

    start(calMode, onScreen) {
        if (game.settings.get(moduleName,'ActiveUser') != game.userId && !game.user.isGM) return;

        this.calibrationMode = calMode;
        this.calibrationRunning = true;
        this.pointCount = 0;
        countdownCount = 5;
        
        if (calOverlay == undefined) {
            calOverlay = new calibrationOverlay();
            canvas.stage.addChild(calOverlay);
        }
        if (game.settings.get(moduleName,'ActiveUser') == game.userId) {
            if (onScreen) calOverlay.init('onScreen');
            else calOverlay.init('corners');
        }

        document.getElementById('mpCalConfig').style.display = 'none';
        document.getElementById('mpCalProcedure').style.display = '';

        let calStart = "";
        if (this.calibrationMode == 'SinglePoint') calStart = "Starting single-point calibration.";
        else if (this.calibrationMode == 'Offset') calStart = "Starting custom point calibration.";
        else if (this.calibrationMode == 'MultiPoint') calStart = "Starting multi-point calibration.";

        let calInstructions = "";
        if (onScreen) {
            if (this.calibrationMode == 'SinglePoint' || this.calibrationMode == 'Offset') calInstructions = "To calibrate, zoom in or out so the red boxes are the same size as a base. Then move a base to one of the boxes and wait a few seconds (beta hardware) or hold the button on the base for a few seconds and then wait (DIY hardware).";
            else if (this.calibrationMode == 'MultiPoint') calInstructions = "To calibrate, zoom in or out so the red boxes are the same size as a base. Then move the bases to the boxes and press 'Calibrate'.";
        }
        else {
            if (this.calibrationMode == 'SinglePoint' || this.calibrationMode == 'Offset') calInstructions = 
            `To calibrate, move a base to one of the corners of your display, as indicated by the green arrows, and wait a few seconds (beta hardware) or hold the button on the base for a few seconds and then wait (DIY hardware). 
            The center of the base must align with the corner of the TV, as shown in the image.
            <center><img src="modules/MaterialPlane/img/calPos.png" width=80%></center>
            `;
            else if (this.calibrationMode == 'MultiPoint') calInstructions = `
            To calibrate, make sure all 4 IR points (bases or LEDs) are visible and their coordinates are shown. Then press 'Calibrate'.
            The center of the base must align with the corner of the TV, as shown in the image.
            <center><img src="modules/MaterialPlane/img/calPos.png" width=80%></center>
            `;
        }
        
        setTimeout(function(){
            document.getElementById('calStart').innerHTML = calStart;
            document.getElementById('calInstructions').innerHTML = calInstructions;
            if (calMode == 'MultiPoint') {
                document.getElementById('calNextBtn').innerHTML='Calibrate';
                document.getElementById('calNextBtn').disabled=true;
                document.getElementById("noMovement").style.display="none";
            }
            else document.getElementById("noMovement").style="";
            document.getElementById('MaterialPlane_CalProgMenu').style.height='auto';
        },10);
    }

    setMultiPoint(data) {
        if (this.calibrationMode != 'MultiPoint') return;
        clearInterval(countdown);
        let points = 0;
        for (let i=0; i<4; i++) {
            if (data.points[i]?.x != undefined && data.points[i]?.y != undefined) {
                points++;
                if (data.points[i].x != -9999 && data.points[i].y != -9999) {
                    document.getElementById("mpCalPoint_x"+i).innerHTML=Math.round(data.points[i].x);
                    document.getElementById("mpCalPoint_y"+i).innerHTML=Math.round(data.points[i].y);
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

    setPoint(data) {
        if (data.mode == 'MultiPoint') {
            this.setMultiPoint(data);
        }
        else {
            if (data.point < 0 || data.point > 3) return;
            this.pointCount = data.point+1;

            document.getElementById("mpCalPoint_x"+data.point).value = data.x;
            document.getElementById("mpCalPoint_y"+data.point).value = data.y;
            document.getElementById("iterationPoint"+data.point).style.color='black';
            document.getElementById("mpCalPoint_x"+data.point).style.color='black';
            document.getElementById("mpCalPoint_y"+data.point).style.color='black';
        }
        
    }

    updatePoint(data) {
        if (this.calibrationMode == 'MultiPoint') return;
        document.getElementById("noMovement").style="display:none";
        document.getElementById("waiting").style="";
        countdownCount = 5;
        const txt = `<b>Locking in point in 5 seconds.</b>`;
        document.getElementById("waiting").innerHTML=txt;
        clearInterval(countdown);
        countdown = setInterval(this.timer,1000);
        if (data.point > 0) return;
        if (data.x != undefined && data.y != undefined && data.x != -9999 && data.y != -9999 && document.getElementById("mpCalPoint_x"+this.pointCount) != null) {
            document.getElementById("mpCalPoint_x"+this.pointCount).innerHTML=Math.round(data.x);
            document.getElementById("mpCalPoint_y"+this.pointCount).innerHTML=Math.round(data.y);
        }
    }
    
    timer(){
        countdownCount = countdownCount-1;
        
        if (countdownCount > 0 && document.getElementById("waiting") != null) {
            const txt = `<b>Locking in point in ` + countdownCount + ` seconds.</b>`;
            document.getElementById("waiting").innerHTML=txt;
        }
        else {
            clearInterval(countdown);
            countdownCount = 5;
            if (document.getElementById("noMovement") != null) {
                document.getElementById("noMovement").style="";
                document.getElementById("waiting").style="display:none";
            }
            
            if (document.getElementById('MaterialPlane_CalProgMenu')) {
                document.getElementById('MaterialPlane_CalProgMenu').style.height='auto';
            }
            
            let user = game.users.contents.filter(u => u.active == true && u.isGM == true)[0];
            if (game.userId == user.id) sendWS({event:"calibration", state:"next"});
            else if (user == undefined && game.settings.get(moduleName,'ActiveUser') == game.userId) sendWS({event:"calibration", state:"next"});
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
    if (game.settings.get(moduleName,'ActiveUser') != game.userId) return;
    if (calOverlay == undefined) return;
    window.removeEventListener("mouseout", calOverlay.mouseOutEventHandler);
    canvas.stage.removeChild(calOverlay);
    calOverlay.remove();
    calOverlay = undefined;
}

export class calibrationOverlay extends ControlsLayer {
    constructor() {
        super();
    }
  
    init(mode = '') {
        this.mode = mode;
        this.removeChild(this.container);
        this.container = new PIXI.Container();
        this.addChild(this.container);

        var background = new PIXI.Graphics();
        background.beginFill("0x000000");
        background.drawRect(0,0,canvas.scene.dimensions.width,canvas.scene.dimensions.height);
        background.endFill();
        background.alpha = 0.8;
        background.name = 'background';
        this.container.addChild(background);
        this.container.setTransform(0, 0);
        
        if (mode == 'onScreen' || mode == 'both') {
            const baseSize = canvas.scene.grid.size;

            for (let i=0; i<4; i++) {
                var calPos = new PIXI.Graphics();
                calPos.lineStyle({width:5, color:'0xff0000', alignment: 1})
                calPos.drawRect(-baseSize/2, -baseSize/2 , baseSize, baseSize);
                calPos.name = `calPos-${i}`;
                this.container.addChild(calPos);
            }
        }
        if (mode == 'corners' || mode == 'both') {

            for (let i=0; i<4; i++) {
                
                let arrow = new PIXI.Graphics();
                arrow.lineStyle(5, '0x00ff00', 1);
                arrow.beginFill('0x00ff00');

                arrow.drawCircle(0,0,20);

                let a,b;

                if (i == 0) {
                    a = 1;
                    b = 1;
                }
                else if (i == 1) {
                    a = 1;
                    b = -1;
                }
                else if (i == 2) {
                    a = -1;
                    b = 1;
                }
                else if (i == 3) {
                    a = -1;
                    b = -1;
                }

                arrow.moveTo(a*25,b*25);
                arrow.lineTo(a*100,b*100);
                arrow.moveTo(a*25,b*25);
                arrow.lineTo(a*75,b*25);
                arrow.moveTo(a*25,b*25);
                arrow.lineTo(a*25,b*75);

                arrow.name = `arrow-${i}`;
                this.container.addChild(arrow);
            }
        }
        
        this.update();

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

        window.addEventListener("resize", (evt) => {
            if (!calOverlay) return;
            calOverlay.update()
        });
    }

    update() {
        if (document.getElementById("mpCalError")) {
            //Check if window is fullscreen
            const isNotFullScreen = screen.width != window.innerWidth || screen.height != window.innerHeight;
                    
            //Check for browser zoom or display scaling
            const isScaled = window.devicePixelRatio != 1;

            if (isNotFullScreen || isScaled) 
                document.getElementById("mpCalError").style.display = "";
            else
                document.getElementById("mpCalError").style.display = "none";

            document.getElementById("MaterialPlane_CalProgMenu").style.height = "auto"
        }
        

        //Calculate the amount of pixels that are visible on the screen
        const horVisible = screen.width/canvas.scene._viewPosition.scale;
        const vertVisible = screen.height/canvas.scene._viewPosition.scale;

        const x = canvas.scene._viewPosition.x;
        let y = canvas.scene._viewPosition.y;

        if (this.mode == 'onScreen' || this.mode == 'both') {
            const xOffset = 2*horVisible/5;
            const yOffset = 2*vertVisible/6;

            for (let i=0; i<4; i++) {
                const calPos = this.container.getChildByName(`calPos-${i}`);
                if (calPos == null) continue;
                
                if (i == 0) {
                    calPos.position.x = x - xOffset;
                    calPos.position.y = y - yOffset;
                }
                else if (i == 1) {
                    calPos.position.x = x - xOffset;
                    calPos.position.y = y + yOffset;
                }
                else if (i == 2) {
                    calPos.position.x = x + xOffset;
                    calPos.position.y = y - yOffset;
                }
                else if (i == 3) {
                    calPos.position.x = x + xOffset;
                    calPos.position.y = y + yOffset;
                }
            }

        }
        if (this.mode == 'corners' || this.mode == 'both') {
            const xOffset = horVisible/2;
            const yOffset = vertVisible/2;

            for (let i=0; i<4; i++) {
                const arrow = this.container.getChildByName(`arrow-${i}`);
                if (arrow == null) continue;
                
                if (i == 0) {
                    arrow.position.x = x - xOffset;
                    arrow.position.y = y - yOffset;
                }
                else if (i == 1) {
                    arrow.position.x = x - xOffset;
                    arrow.position.y = y + yOffset;
                }
                else if (i == 2) {
                    arrow.position.x = x + xOffset;
                    arrow.position.y = y - yOffset;
                }
                else if (i == 3) {
                    arrow.position.x = x + xOffset;
                    arrow.position.y = y + yOffset;
                }
            }
        }
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
        window.removeEventListener("resize", calOverlay.update())
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


