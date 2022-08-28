import { moduleName,configDialog,calibrationProgress } from "../MaterialPlane.js";
import { IRtoken } from "./IRtoken/IRtoken.js";
import { cursor, scaleIRinput } from "./Misc/misc.js";
import { Pen } from "./Pen/pen.js";

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

export function setLastBaseAddress(address) {
    lastBaseAddress = address;
}

/**
 * Analyzes the data received from the IR tracker.
 * If coordinates are received, scale the coordinates to the in-game coordinate system, find the token closest to those coordinates, and either take control of a new token or update the position of the image of that token
 * If no coordinates are received, move token to last recieved position
 */
export async function analyzeIR(data) {

    const targetUser = game.settings.get(moduleName,'TargetName');

    if (configDialog?.configOpen) configDialog.drawIrCoordinates(data.data);
//console.log('data',data)
    if (data.data.length == 0) {
        if (game.user.name != targetUser) return;
        for (let token of IRtokens) token.dropIRtoken(); 
        foundBases = 0;
        return;
    }
   
    foundBases = data.points;
    if (data.data[0].command > 2 && data.data[0].command != 129 && configDialog?.configOpen == false && calibrationProgress?.calibrationRunning == false) {
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
            /*
            else if (configDialog?.configOpen) {
                console.log('dialogOpen')
                //configDialog.updateIrPoint(point);
                continue;
            }
            */
            if (game.user.name != targetUser) return;
            
            let forceNew = false;
            const coords = {x:point.x, y:point.y};
            let scaledCoords = scaleIRinput(coords);

            if (foundBases == 1) {
                lastBaseAddress = point.id;
                const payload = {
                    msgType: "lastBaseAddress",
                    lastBaseAddress
                }
                game.socket.emit(`module.MaterialPlane`, payload);
                if (document.getElementById("MaterialPlane_Config") != null) {
                    document.getElementById("mpLastBaseAddress").value=point.id;
                    for (let i=0; i<999; i++) {
                        let base = document.getElementById("baseId-"+i);
                        if (base == null) break;
                        if (point.id == base.value) base.style.color="green";
                        else base.style.color="";
                    }
                }
                if (point.id != 0 && !(configDialog?.configOpen && configDialog?.blockInteraction)) {
                    if (point.id != lastBaseAddress || IRtokens[point.point].token == undefined) {
                        const token = getTokenByID(point.id);
                        if (token != undefined) IRtokens[point.point].token = token;
                        forceNew = true;
                    }
                }
            }
            if (configDialog?.configOpen  && configDialog?.blockInteraction) return;
            
            if (point.command < 2) {   //move token
                if (await IRtokens[point.point].update(coords,scaledCoords,forceNew) == false) {
                    if (coords.x != undefined && coords.y != undefined) {
                        cursors[point.point].updateCursor({
                            x: scaledCoords.x,
                            y: scaledCoords.y,
                            size: 5,
                            color: "0xFF0000"
                        });
                        cursors[point.point].show();
                    }
                }
                else {
                    cursors[point.point].hide();
                }
            }
            else if (point.command == 129) {    //drop token
                await IRtokens[point.point].update(coords,scaledCoords,forceNew)
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