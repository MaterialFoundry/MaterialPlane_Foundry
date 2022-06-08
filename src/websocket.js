import { moduleName,configDialog,calibrationProgress,hwVariant,setHwVariant, setHwFirmware, setHwWebserver, irRemote, setMsVersion } from "../MaterialPlane.js";
import { analyzeIR } from "./analyzeIR.js";
import { debug } from "./Misc/misc.js";

//Websocket variables
let ip = "materialserver.local:3000";       //Ip address of the websocket server
var ws;                         //Websocket variable
let wsOpen = false;             //Bool for checking if websocket has ever been opened => changes the warning message if there's no connection
let wsInterval;                 //Interval timer to detect disconnections

/**
 * Analyzes the message received from the IR tracker.-
 * 
 * @param {*} msg Message received from the IR tracker
 */
async function analyzeWSmessage(msg,passthrough = false){
    //console.log('raw',msg);
    debug('wsRaw',msg);
    let data;
    try {
        data = JSON.parse(msg);
        debug('ws',data);
        //console.log('data',data);
    }
    catch (error) {
        console.warn('could not parse JSON',error);
        //console.log(msg);
        return;
    }
    
    if (data.status == "ping") {
        //Display battery status
        //console.log('battery',data.battery.voltage,data.battery.percentage)
        let battery = data.battery.percentage;
        if (battery > 100) battery = 100;
        if (battery < 0) battery = 0;
        let icon;
        if (battery >= 80) icon = 'fas fa-battery-full';
        else if (battery >= 60 && battery < 80) icon = 'fas fa-battery-three-quarters';
        else if (battery >= 40 && battery < 60) icon = 'fas fa-battery-half';
        else if (battery >= 20 && battery < 40) icon = 'fas fa-battery-quarter';
        else if (battery < 20) icon = 'fas fa-battery-empty';

        if (document.getElementById("batteryLabel") == null) {
            const playersElement = document.getElementsByClassName("players-mode")[0];
            let batteryIcon = document.createElement("i");
            batteryIcon.id = "batteryIcon";
            batteryIcon.className = icon;
            batteryIcon.style.fontSize = "0.75em";
            let batteryLabel = document.createElement("bat");
            batteryLabel.id = "batteryLabel";
            batteryLabel.innerHTML = `${battery}%`;
            batteryLabel.style.fontSize = "1em";

            playersElement.after(batteryLabel);
            playersElement.after(batteryIcon);
        }
        else {
            document.getElementById("batteryLabel").innerHTML = `${battery}%`;
            document.getElementById("batteryIcon").className = icon; 
        }

        if (data.source == 'calibration' && document.getElementById('MaterialPlane_CalProgMenu') == null) {
            sendWS("CAL CANCEL");
        }
        return;
    }
    else if (data.status == "Auto Exposure Done") {
        ui.notifications.info("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.AutoExposureDone"));
    }
    else if (data.status == 'IR data') {
        if (calibrationProgress?.calibrationRunning) {calibrationProgress.setMultiPoint(data.data)}
        //else if (configDialog?.configOpen) { configDialog.drawCalCanvas(); }
        analyzeIR(data);
        return;
    }
    else if (data.status == 'update') {
        const settings = {
            cal: data.cal,
            ir: data.ir
        }
        configDialog.setIrSettings(settings);
        setHwVariant(data.hardware);
        setHwFirmware(data.firmware);
        setHwWebserver(data.webserver);
    }
    else if (data.status == 'calibration') {
        if (data.state == 'starting') calibrationProgress.start(data.mode);
        else if (data.state == 'done') calibrationProgress.done();
        else if (data.state == 'cancelled') calibrationProgress.cancel();
        else calibrationProgress.setPoint(data.state);
    }
    else if (data.status == 'sensorConnected') {
        ui.notifications.info(`Material Plane: ${game.i18n.localize("MaterialPlane.Notifications.ConnectedMSS")}: ${game.settings.get(moduleName,'IP')}`);
    }
    else if (data.status == 'serialConnected') {
        ui.notifications.info(`Material Plane: ${game.i18n.localize("MaterialPlane.Notifications.ConnectedMSS")}: ${data.port}`);
    }
    else if (data.status == 'IRcode') {
        irRemote.newCode(data.data);
    }
    else if (data.status == 'MSConnected') {
        setMsVersion(data.MSversion);
    }
    
};

/**
 * Start a new websocket
 * Start a 1s interval, connection fails, retry
 * If connection is made, set interval to 1.5s to check for disconnects
 * If message is received, reset the interval, and send the message to analyzeWSmessage()
 */
export async function startWebsocket() {
    
    ip = game.settings.get(moduleName,'EnMaterialServer') ? game.settings.get(moduleName,'MaterialServerIP') : game.settings.get(moduleName,'IP');
    console.log(`Material Plane: Starting websocket on 'ws://${ip}'`);
    ws = new WebSocket('ws://'+ip);
    clearInterval(wsInterval);

    ws.onmessage = function(msg){
        analyzeWSmessage(msg.data);
        clearInterval(wsInterval);
        wsInterval = setInterval(resetWS, 5000);
    }

    ws.onopen = function() {
        console.log("Material Plane: Websocket connected",ws)
        if (game.settings.get(moduleName,'EnMaterialServer')) ui.notifications.info(`Material Plane: ${game.i18n.localize("MaterialPlane.Notifications.ConnectedMS")}: ${ip}`);
        else ui.notifications.info(`Material Plane: ${game.i18n.localize("MaterialPlane.Notifications.Connected")}: ${ip}`);
        wsOpen = true;
        if (game.settings.get(moduleName,'EnMaterialServer')) {
            const msg = {
                target: "server",
                module: "MP",
                ip: game.settings.get(moduleName,'IP')
            }
            ws.send(JSON.stringify(msg));
        }
        
        clearInterval(wsInterval);
        wsInterval = setInterval(resetWS, 5000);
    }
  
    clearInterval(wsInterval);
    wsInterval = setInterval(resetWS, 10000);
}

/**
 * Try to reset the websocket if a connection is lost
 */
function resetWS(){
    if (wsOpen) {
        wsOpen = false;
        console.warn("Material Plane: Disconnected from server");
        ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.Disconnected"));
        startWebsocket();
    }
    else if (ws.readyState == 3){
        console.warn("Material Plane: Connection to server failed");
        ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.ConnectFail"));
        startWebsocket();
    }
}


export function sendWS(txt){
    if (wsOpen) {
        if (game.settings.get(moduleName,'EnMaterialServer')) {
            const msg = {
                target: "MPSensor",
                data: txt
            }
            ws.send(JSON.stringify(msg));
        }
        else
            ws.send(txt);
    }
    
}