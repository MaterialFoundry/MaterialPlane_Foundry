import { sendWS } from "./websocket.js";
import { moduleName, calibrationProgress } from "../MaterialPlane.js";

let countdownCount = 5;
let countdown;
let overlay;

export class calibrationForm extends FormApplication {
    constructor(data, options) {
        super(data, options);
        this.data = data;

       this.mirrorX = false;
       this.mirrorY = true;
       this.rotation = false;
       this.sensitivity = 0;
       this.calibrationEn = false;
       this.offsetEn = false;
       this.compX = 0;
       this.compY = 0;
       this.average = 0;

       this.X0 = 0;
       this.Y0 = 0;
       this.I0 = 0;
       this.X1 = 0;
       this.Y1 = 0;
       this.I1 = 0;
       this.X2 = 0;
       this.Y2 = 0;
       this.I2 = 0;
       this.X3 = 0;
       this.Y3 = 0;
       this.I3 = 0;

       this.coordinates = [];
       
       this.menuOpen = false;
       this.settings = [];
    }


    setSettings(settings){
        this.settings = settings;
        if (this.menuOpen && document.getElementById("framePeriod") != null) {
            document.getElementById("framePeriod").value=settings.ir.framePeriod*10;
            document.getElementById("framePeriodNumber").value=settings.ir.framePeriod;
            document.getElementById("exposure").value=settings.ir.exposure*100;
            document.getElementById("exposureNumber").value=settings.ir.exposure;
            document.getElementById("gain").value=settings.ir.gain*10;
            document.getElementById("gainNumber").value=settings.ir.gain;

            document.getElementById("brightness").value=settings.ir.brightness;
            document.getElementById("brightnessNumber").value=settings.ir.brightness;
            document.getElementById("noise").value=settings.ir.noise;
            document.getElementById("noiseNumber").value=settings.ir.noise;
            document.getElementById("average").value=settings.ir.averageCount;
            document.getElementById("averageNumber").value=settings.ir.averageCount;
            document.getElementById("minArea").value=settings.ir.minArea;
            document.getElementById("minAreaNumber").value=settings.ir.minArea;
            document.getElementById("maxArea").value=settings.ir.maxArea;
            document.getElementById("maxAreaNumber").value=settings.ir.maxArea;

            document.getElementById("mirX").checked=settings.cal.mirrorX;
            document.getElementById("mirY").checked=settings.cal.mirrorY;
            document.getElementById("rot").checked=settings.cal.rotation;
            document.getElementById("calEn").checked=settings.cal.calibrationEnable;
            document.getElementById("offsetEn").checked=settings.cal.offsetEnable;
        }
    }

    setMenuOpen(open) {
        this.menuOpen = open;
    }

    updatePoint(data) {
        if (data.point > 4) return;

        if (data.command == 2) {
            data.x = 0;
            data.y = 0;
            data.avgBrightness = 0;
            data.maxBrightness = 0;
            data.area = 0;
            data.radius = 0;
            data.id = 0;
        }
        document.getElementById("cal_x"+data.point).innerHTML=data.x;
        document.getElementById("cal_y"+data.point).innerHTML=data.y;
        document.getElementById("cal_ab"+data.point).innerHTML=data.avgBrightness;
        document.getElementById("cal_mb"+data.point).innerHTML=data.maxBrightness;
        document.getElementById("cal_a"+data.point).innerHTML=data.area;

        let color = "black";
        if (data.x < 0 || data.x > 4096 || data.y < 0 || data.y > 4096) color = "red";
        if (data.maxBrightness == 0) color = "grey";

        document.getElementById("iteration"+data.point).style.color=color;
        document.getElementById("cal_x"+data.point).style.color=color;
        document.getElementById("cal_y"+data.point).style.color=color;
        document.getElementById("cal_ab"+data.point).style.color=color;
        document.getElementById("cal_mb"+data.point).style.color=color;
        document.getElementById("cal_a"+data.point).style.color=color;

        this.coordinates[data.point] = {
            x: data.x,
            y: data.y,
            avgBrightness: data.avgBrightness,
            maxBrightness: data.maxBrightness,
            area: data.area,
            radius: data.radius,
            id: data.id
        }
    }

    drawCalCanvas() {
        var stage = document.getElementById('stage');
        if(stage.getContext) {
            var ctx = stage.getContext('2d');
        }
        ctx.fillStyle = '#FF0000';
        ctx.clearRect(0, 0, 400, 250);

        for (let point of this.coordinates) {
            if (point.x > 0 && point.y < 4096) {
                ctx.beginPath();
                ctx.arc(point.x/4096*400,point.y/4096*250,3,0,2*Math.PI,false);
                ctx.fill();
            }
        }
    }

    newCoordinates(point, x, y, intensity){
        if (point == 0) {this.X0 = x; this.Y0 = y; this.I0 = intensity;}
        else if (point == 1) {this.X1 = x; this.Y1 = y; this.I1 = intensity;}
        else if (point == 2) {this.X2 = x; this.Y2 = y; this.I2 = intensity;}
        else if (point == 3) {this.X3 = x; this.Y3 = y; this.I3 = intensity;}
        //this.render();
    }

    /**
     * Default Options for this FormApplication
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "MaterialPlane_CalMenu",
            title: "Material Plane: "+game.i18n.localize("MaterialPlane.CalSett.Title"),
            template: "./modules/MaterialPlane/templates/calibrationMenu.html",
            classes: ["sheet"],
            width: 600
        });
    }

    _updateObjects(event, formData){
       
    }

    /**
     * Provide data to the template
     */
    getData() {
        this.menuOpen = true;
        const msg = "GET SETTINGS";
        const diyHW = game.settings.get(moduleName,'hwVariant') == 0 ? '' : 'none'; 
        const prodHW = game.settings.get(moduleName,'hwVariant') == 0 ? 'none' : ''; 
        sendWS(msg);
        return {
            settings:this.settings,
            framePeriod: 15,
            iteration: [0,1,2,3],
            diyHW,
            prodHW
        }
    }

    /**
     * Update on form submit
     * @param {*} event 
     * @param {*} formData 
     */
    async _updateObject(event, formData) {
        this.menuOpen = false;
    }

    activateListeners(html) {
        super.activateListeners(html);

        const framePeriodSlider = html.find("input[id='framePeriod']");
        const framePeriodNumber = html.find("input[id='framePeriodNumber']");
        const exposureSlider = html.find("input[id='exposure']");
        const exposureNumber = html.find("input[id='exposureNumber']");
        const gainSlider = html.find("input[id='gain']");
        const gainNumber = html.find("input[id='gainNumber']");

        const minBrightnessSlider = html.find("input[id='brightness']");
        const minBrightnessNumber = html.find("input[id='brightnessNumber']");
        const noiseSlider = html.find("input[id='noise']");
        const noiseNumber = html.find("input[id='noiseNumber']");
        const averageSlider = html.find("input[id='average']");
        const averageNumber = html.find("input[id='averageNumber']");
        const minAreaSlider = html.find("input[id='minArea']");
        const minAreaNumber = html.find("input[id='minAreaNumber']");
        const maxAreaSlider = html.find("input[id='maxArea']");
        const maxAreaNumber = html.find("input[id='maxAreaNumber']");

        const mirrorX = html.find("input[id='mirX']");
        const mirrorY = html.find("input[id='mirY']");
        const rotation = html.find("input[id='rot']");

        const calBtn = html.find("button[name='calBtn']");
        const calibrationEnable = html.find("input[id='calEn']");
        const offsetEnable = html.find("input[id='offsetEn']");

        framePeriodSlider.on("change", event => {
            const msg = "SET IR FRAMEPERIOD " + event.target.value/10;
            sendWS(msg);
        })
        framePeriodNumber.on("change", event => {
            const msg = "SET IR FRAMEPERIOD " + event.target.value;
            sendWS(msg);
        })
        exposureSlider.on("change", event => {
            const msg = "SET IR EXPOSURE " + event.target.value/100;
            sendWS(msg);
        })
        exposureNumber.on("change", event => {
            const msg = "SET IR EXPOSURE " + event.target.value;
            sendWS(msg);
        })
        gainSlider.on("change", event => {
            const msg = "SET IR GAIN " + event.target.value/10;
            sendWS(msg);
        })
        gainNumber.on("change", event => {
            const msg = "SET IR GAIN " + event.target.value;
            sendWS(msg);
        })

        minBrightnessSlider.on("change", event => {
            const msg = "SET IR BRIGHTNESS " + event.target.value;
            sendWS(msg);
        })

        minBrightnessNumber.on("change", event => {
            const msg = "SET IR BRIGHTNESS " + event.target.value;
            sendWS(msg);
        })

        noiseSlider.on("change", event => {
            const msg = "SET IR NOISE " + event.target.value;
            sendWS(msg);
        })

        noiseNumber.on("change", event => {
            const msg = "SET IR NOISE " + event.target.value;
            sendWS(msg);
        })

        averageSlider.on("change", event => {
            const msg = "SET IR AVERAGE " + event.target.value;
            sendWS(msg);
        })

        averageNumber.on("change", event => {
            const msg = "SET IR AVERAGE " + event.target.value;
            sendWS(msg);
        })

        minAreaSlider.on("change", event => {
            const msg = "SET IR MINAREA " + event.target.value;
            sendWS(msg);
        })

        minAreaNumber.on("change", event => {
            const msg = "SET IR MINAREA " + event.target.value;
            sendWS(msg);
        })

        maxAreaSlider.on("change", event => {
            const msg = "SET IR MAXAREA " + event.target.value;
            sendWS(msg);
        })

        maxAreaNumber.on("change", event => {
            const msg = "SET IR MAXAREA " + event.target.value;
            sendWS(msg);
        })

        mirrorX.on("change", event => {
            let msg = "SET CAL MIRRORX ";
            msg += event.target.checked? "1" : "0";
            sendWS(msg);
        });

        mirrorY.on("change", event => {
            let msg = "SET CAL MIRRORY ";
            msg += event.target.checked? "1" : "0";
            sendWS(msg);
        });

        rotation.on("change", event => {
            let msg = "SET CAL ROTATION ";
            msg += event.target.checked? "1" : "0";
            sendWS(msg);
        });

        calibrationEnable.on("change", event => {
            let msg = "SET CAL CALIBRATION ";
            msg += event.target.checked? "1" : "0";
            sendWS(msg);
        });

        offsetEnable.on("change", event => {
            let msg = "SET CAL OFFSET ";
            msg += event.target.checked? "1" : "0";
            sendWS(msg);
        });

        calBtn.on("click", event => {
            let msg = "PERFORM CALIBRATION ";
            if (html.find("select[name='calMethod']")[0].value == "SinglePoint")
                msg += "SINGLE";
            else if (html.find("select[name='calMethod']")[0].value == "MultiPoint")
                msg += "MULTI";
            else if (html.find("select[name='calMethod']")[0].value == "Offset")
                msg = "OFFSET";
            sendWS(msg);
        });
    }
}

export class calibrationProgressScreen extends FormApplication {
    constructor(data, options) {
        super(data, options);
        this.calibrationRunning = false;
        this.pointCount = 0;
    }

    /**
     * Default Options for this FormApplication
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "MaterialPlane_CalProgMenu",
            title: "Material Plane: Calibration",
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

    start() {
        this.calibrationRunning = true;
        this.pointCount = 0;
        countdownCount = 5;
        this.render(true);
        if (overlay == undefined && game.settings.get(moduleName,'TargetName') == game.user.name) {
            overlay = new calibrationOverlay();
            canvas.stage.addChild(overlay);
            overlay.init();
        }
        
    }

    setPoint(point) {
        this.pointCount = point;
        if (point > 0) {
            point--;
            document.getElementById("iterationPoint"+point).style.color='black';
            document.getElementById("calPoint_x"+point).style.color='black';
            document.getElementById("calPoint_y"+point).style.color='black';
        }
    }

    updatePoint(data) {
        document.getElementById("noMovement").style="display:none";
        document.getElementById("waiting").style="";
        countdownCount = 5;
        const txt = `<b>Locking in point in 5 seconds.</b>`;
        document.getElementById("waiting").innerHTML=txt;
        clearInterval(countdown);
        countdown = setInterval(this.timer,1000);
        if (data.point > 0) return;
        if (data.x > 0 && data.y > 0) {
            document.getElementById("calPoint_x"+this.pointCount).innerHTML=data.x;
            document.getElementById("calPoint_y"+this.pointCount).innerHTML=data.y;
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
            const msg = "CAL NEXT";
            sendWS(msg);
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
        
    }

    cancel() {
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


