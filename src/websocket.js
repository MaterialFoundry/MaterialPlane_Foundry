import { moduleName,calibrationDialog,calibrationProgress,hwVariant,setHwVariant } from "../MaterialPlane.js";
import { IRtoken } from "./IRtoken.js";
import { cursor, scaleIRinput } from "./misc.js";
import { Pen} from "./pen.js";

//Websocket variables
let ip = "192.168.1.189";       //Ip address of the websocket server
let port = "3000";                //Port of the websocket server
var ws;                         //Websocket variable
let wsOpen = false;             //Bool for checking if websocket has ever been opened => changes the warning message if there's no connection
let wsInterval;                 //Interval timer to detect disconnections

export let lastBaseAddress = 0;
export let IRtokens = [];
let cursors = [];
let pen;
let oldCommand = 0;

function getTokenByID(id){
    const tokenIDs = game.settings.get(moduleName,'baseSetup');
    const baseData = tokenIDs.find(p => p.baseId == id);
    if (baseData == undefined) return undefined;
    if (baseData.linkActor) return canvas.tokens.children[0].children.find(p => p.actor.name == baseData.actorName);
    else if (baseData.sceneName == canvas.scene.name)return canvas.tokens.children[0].children.find(p => p.name == baseData.tokenName);
    return undefined;
}

let foundBases = 0;

export function initializeIRtokens(){
    for (let i=0; i<16; i++) IRtokens[i] = new IRtoken();
}

export function initializeCursors(){
    for (let i=0; i<16; i++) {
        cursors[i] = new cursor();
        canvas.stage.addChild(cursors[i]);
        cursors[i].init();
    }
    pen = new Pen();
    pen.init();
}

let batteryStorage = [];

/**
 * Analyzes the message received from the IR tracker.
 * If coordinates are received, scale the coordinates to the in-game coordinate system, find the token closest to those coordinates, and either take control of a new token or update the position of the image of that token
 * If no coordinates are received, move token to last recieved position
 * 
 * @param {*} msg Message received from the IR tracker
 */
async function analyzeWSmessage(msg,passthrough = false){
    //console.log('raw',msg);
    let data = JSON.parse(msg);
    //console.log('data',data)
    if (data.status == "ping") {
        batteryStorage.push((data.battery.voltage - 3)*100);

        if (document.getElementById("batteryLabel") == null) {
            let battery = Math.ceil((data.battery.voltage - 3)*100);
            if (battery > 100) battery = 100;
            if (battery < 0) battery = 0;
            let icon;
            if (battery >= 80) icon = 'fas fa-battery-full';
            else if (battery >= 60 && battery < 80) icon = 'fas fa-battery-three-quarters';
            else if (battery >= 40 && battery < 60) icon = 'fas fa-battery-half';
            else if (battery >= 20 && battery < 40) icon = 'fas fa-battery-quarter';
            else if (battery < 20) icon = 'fas fa-battery-empty';

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
            if (batteryStorage.length >= 10) {
                let batt = 0;
                for (let i=0; i<batteryStorage.length; i++) batt += batteryStorage[i];
                let battery = Math.ceil(batt / batteryStorage.length);
                if (battery > 100) battery = 100;
                if (battery < 0) battery = 0;
                batteryStorage = [];

                let icon;
                if (battery >= 80) icon = 'fas fa-battery-full';
                else if (battery >= 60 && battery < 80) icon = 'fas fa-battery-three-quarters';
                else if (battery >= 40 && battery < 60) icon = 'fas fa-battery-half';
                else if (battery >= 20 && battery < 40) icon = 'fas fa-battery-quarter';
                else if (battery < 20) icon = 'fas fa-battery-empty';
                
                document.getElementById("batteryLabel").innerHTML = `${battery}%`;
                document.getElementById("batteryIcon").className = icon; 
            }
        }

        if (data.source == 'calibration' && document.getElementById('MaterialPlane_CalProgMenu') == null) {
            sendWS("CAL CANCEL");
        }
        return;
    }
    //console.log('data',data)
    const targetUser = game.settings.get(moduleName,'TargetName');
    if (data.status == 'IR data') {
        if (calibrationProgress?.calibrationRunning) {
            //return;
        }
        else if (calibrationDialog?.menuOpen) {
            calibrationDialog.drawCalCanvas();
            //return;
        }
        
        if (data.data.length == 0) {
            if (game.user.name != targetUser) return;
            for (let token of IRtokens) token.dropIRtoken(); 
            foundBases = 0;
            return;
        }
       
        foundBases = data.points;
        if (data.data[0].command > 2 && data.data[0].command != 129 && calibrationDialog?.menuOpen == false && calibrationProgress?.calibrationRunning == false) {
            if (game.user.name != targetUser) return;
            pen.analyze(data);
        }
        else {
            for (let i=0; i<data.data.length; i++) {
                const point = data.data[i];
                
                if (calibrationProgress?.calibrationRunning) {
                    calibrationProgress.updatePoint(point);
                    continue;
                }
                else if (calibrationDialog?.menuOpen) {
                    calibrationDialog.updatePoint(point);
                    continue;
                }
                if (game.user.name != targetUser) return;
                
                let forceNew = false;
                const coords = {x:point.x, y:point.y};
                let scaledCoords = scaleIRinput(coords);
    
                if (foundBases == 1) {
                    if (point.id != 0) {
                        if (point.id != lastBaseAddress || IRtokens[point.point].token == undefined) {
                            const token = getTokenByID(point.id);
                            if (token != undefined) IRtokens[point.point].token = token;
                            forceNew = true;
                        }
                    }
                    lastBaseAddress = point.id;
                    if (document.getElementById("MP_lastBaseAddress") != null) {
                        document.getElementById("MP_lastBaseAddress").value=point.id;
                        for (let i=0; i<99; i++) {
                            let base = document.getElementById("baseId-"+i);
                            if (base != null) {
                                if (point.id == base.value) base.style.color="green";
                                else base.style.color="";
                            }
                            
                        }
                    }
                }
                
                if (point.command < 2) {   //move token
                    if (await IRtokens[point.point].update(coords,scaledCoords,forceNew) == false) {
                        if (coords.x != undefined && coords.y != undefined) {
                            cursors[point.point].updateCursor({
                                x: scaledCoords.x,
                                y: scaledCoords.y,
                                size: 5,
                                color: "0xFF0000"
                            });
                        }
                    }
                    else {
                        cursors[point.point].hide();
                    }
                }
                else if (point.command == 129) {    //drop token
                    IRtokens[point.point].dropIRtoken();
                    cursors[point.point].hide();
                }
                else if (point.command == 8) {      //pen pointer
                    if (coords.x != undefined && coords.y != undefined) {
                        if (oldCommand != 8) {
                            pen.release(oldCommand,{
                                x: scaledCoords.x,
                                y: scaledCoords.y
                            });
                        }
                        pen.updateCursor({
                            x: scaledCoords.x,
                            y: scaledCoords.y,
                            size: 5,
                            color: "0x00FF00",
                            rawCoords: coords
                        });
                    }
                }
                else if (point.command == 40) {      //pen left
                    if (coords.x != undefined && coords.y != undefined) {
                        pen.click(point.command,{
                            x: scaledCoords.x,
                            y: scaledCoords.y,
                            rawCoords: coords
                        });
                    }
                }
                else if (point.command == 24) {      //pen right
                    if (coords.x != undefined && coords.y != undefined) {
                        if (oldCommand == 24) {
                            pen.hold(point.command,{
                                x: scaledCoords.x,
                                y: scaledCoords.y
                            });
                        }
                        else {
                            pen.click(point.command,{
                                x: scaledCoords.x,
                                y: scaledCoords.y,
                                rawCoords: coords
                            });
                        }
                    }
                }
                else if (point.command == 94) {      //pen front
                    if (coords.x != undefined && coords.y != undefined) {
                        if (oldCommand == 94) {
                            pen.hold(point.command,{
                                x: scaledCoords.x,
                                y: scaledCoords.y
                            });
                        }
                        else {
                            pen.click(point.command,{
                                x: scaledCoords.x,
                                y: scaledCoords.y,
                                rawCoords: coords
                            });
                        }
                    }
                }
                else if (point.command == 72) {      //pen rear
                    if (coords.x != undefined && coords.y != undefined) {
                        pen.updateCursor({
                            x: scaledCoords.x,
                            y: scaledCoords.y,
                            size: 5,
                            color: "0x00FFFF"
                        });
                    }
                }
                oldCommand = point.command;
            }
        }
        
    }
    else if (data.status == 'connected') {
        const settings = {
            cal: data.cal,
            ir: data.ir
        }
        calibrationDialog.setSettings(settings);
        setHwVariant(data.hardware);
    }
    else if (data.status == 'calibration') {
        if (data.state == 'starting') calibrationProgress.start();
        else if (data.state == 'done') calibrationProgress.done();
        else if (data.state == 'cancelled') calibrationProgress.cancel();
        else calibrationProgress.setPoint(data.state);
    }
};

/**
 * Start a new websocket
 * Start a 1s interval, connection fails, retry
 * If connection is made, set interval to 1.5s to check for disconnects
 * If message is received, reset the interval, and send the message to analyzeWSmessage()
 */
export async function startWebsocket() {
    console.log("starting WS")
    ip = game.settings.get(moduleName,'IP');
    ws = new WebSocket('ws://'+ip+':'+port);
    clearInterval(wsInterval);

    ws.onmessage = function(msg){
        analyzeWSmessage(msg.data);
        clearInterval(wsInterval);
        wsInterval = setInterval(resetWS, 5000);
    }

    ws.onopen = function() {
        console.log("Material Plane: Websocket connected",ws)
        ui.notifications.info("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.Connected")+ip+':'+port);
        wsOpen = true;
        clearInterval(wsInterval);
        wsInterval = setInterval(resetWS, 5000);
    }
  
    clearInterval(wsInterval);
    wsInterval = setInterval(resetWS, 1000);
}

/**
 * Try to reset the websocket if a connection is lost
 */
function resetWS(){
    if (wsOpen) {
        wsOpen = false;
        console.log("Material Plane: Disconnected from server");
        ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.Disconnected"));
        startWebsocket();
    }
    else if (ws.readyState == 3){
        console.log("Material Plane: Connection to server failed");
        ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.ConnectFail"));
        startWebsocket();
    }
}


export function sendWS(txt){
    if (wsOpen) ws.send(txt);
}