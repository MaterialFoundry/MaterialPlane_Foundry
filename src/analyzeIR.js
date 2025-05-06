import { moduleName,configDialog,calibrationProgress } from "../MaterialPlane.js";
import { IRtoken } from "./IRtoken/IRtoken.js";
import { debug } from "./Misc/misc.js";
import { Pen } from "./Pen/pen.js";
import { scaleIRinput } from "./IRtoken/tokenHelpers.js";
import { Cursor } from "./Misc/cursor.js";

export let lastBaseAddress = 0;
export let IRtokens = [];
let cursors = [];
export let pen;
let oldCommand = 0;
let batteryNotificationTimer = 0;

function getTokenByID(id){
    const tokenIDs = game.settings.get(moduleName,'baseSetup');
    const baseData = tokenIDs.find(p => p.baseId == id);
    if (baseData == undefined) return undefined;
    if (baseData.linkActor) return canvas.tokens.placeables.find(p => p.actor.name == baseData.actorName);
    else if (baseData.sceneName == canvas.scene.name) return canvas.tokens.placeables.find(p => p.name == baseData.tokenName);
    return undefined;
}

let foundBases = 0;

export function initializeIRtokens(){
    for (let i=0; i<16; i++) IRtokens[i] = new IRtoken();
}

export function initializeCursors(){
    for (let i=0; i<16; i++) {
        cursors[i] = new Cursor();
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
    const activeUser = game.settings.get(moduleName,'ActiveUser');
    if (configDialog?.configOpen) configDialog.drawIrCoordinates(data);
    //console.log('data',data)

    foundBases = data.detectedPoints;

    if (foundBases == 0) {
        debug('baseData',`No base detected`)
        return;
    }

    if (data.battery < 30 && Date.now() - batteryNotificationTimer >= 60000) {
        batteryNotificationTimer = Date.now();
        if (data.command == 1) ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.BatteryLowBase"));
        else if (data.command == 2) ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.BatteryLowPen"));
        
    }
   
    if (data.command > 1 && data.command != 129 && (configDialog?.configOpen == false || !configDialog?.blockInteraction) && calibrationProgress?.calibrationRunning == false) {
        if (game.user.id != activeUser) return;
        pen.analyze(data);
        for (let i=0; i<16; i++) {
            cursors[i].hide();
        }
    }
    else {
        for (let i=0; i<foundBases; i++) {
            const point = data.irPoints[i];

            let command = data.command;
            
            if (calibrationProgress?.calibrationRunning) {
                calibrationProgress.updatePoint(point);
                continue;
            }
            
            let forceNew = false;
            const coords = {x:point.x, y:point.y};
            let scaledCoords = scaleIRinput(coords);

            debug('baseData',`Command: ${command}, nr of bases: ${foundBases}, base ID: ${data.id}`)
            
            if (foundBases == 1) {
                if (data.id != 0) {
                    lastBaseAddress = data.id;
                    const payload = {
                        msgType: "lastBaseAddress",
                        lastBaseAddress
                    }
                    game.socket.emit(`module.MaterialPlane`, payload);
                    if (document.getElementById("MaterialPlane_Config") != null) {
                        document.getElementById("mpLastBaseAddress").value=data.id;
                        debug('baseData',`Set last base ID: ${data.id}`)
                        let baseElmnts = Array.from(document.getElementsByName('mpBaseId'));
                        if (baseElmnts != undefined)  {
                            for (let elmnt of baseElmnts) {
                                if (data.id == elmnt.value) elmnt.style.color="green";
                                else elmnt.style.color="";
                            }
                        }
                        let penElmnts = Array.from(document.getElementsByName('mpPenId'));
                        if (penElmnts != undefined)  {
                            for (let elmnt of penElmnts) {
                                if (data.id == elmnt.value) elmnt.style.color="green";
                                else elmnt.style.color="";
                            }
                        }
                    }
                    if (game.user.id != activeUser) return;
                    if (data.id != 0 && !(configDialog?.configOpen && configDialog?.blockInteraction)) {
                        if (data.id != lastBaseAddress || IRtokens[point.number].token == undefined) {
                            const token = getTokenByID(data.id);
                            
                            if (token != undefined) {
                                IRtokens[point.number].token = token;
                                IRtokens[point.number].oldMovementAction = token?.document.movementAction;
                                if (token.can(game.user,"control"))
                                    await token.document.update({movementAction: 'displace'});
                                else
                                    game.socket.emit(`module.MaterialPlane`, {
                                        "msgType": "setTokenMovementAction",
                                        "senderId": game.user.id, 
                                        "receiverId": game.data.users.find(users => users.role == 4)._id, 
                                        "tokenId": token.id,
                                        "action": 'displace'
                                    });

                                debug('baseData',`Grabbed token ${token.name} with base ID: ${data.id}`)
                            }
                            else {
                                debug('baseData',`No configured token for base ID: ${data.id}`)
                            }
                            forceNew = true;
                        }
                    }
                }
                
                
            }

            if (game.user.id != activeUser) return;
            
            if (configDialog?.configOpen  && configDialog?.blockInteraction) return;

            if (point.x == -9999 && point.y == -9999) {
                //await IRtokens[point.number].update()
                IRtokens[point.number].dropIRtoken();
                cursors[point.number].hide();
            }
            else if (command < 2) {   //move token
                if (await IRtokens[point.number].update(coords,scaledCoords,forceNew) == false) {
                    if (coords.x != undefined && coords.y != undefined) {
                        cursors[point.number].updateCursor({
                            x: scaledCoords.x,
                            y: scaledCoords.y,
                            size: 5,
                            color: "0xFF0000"
                        });
                        cursors[point.number].show();
                    }
                }
                else {
                    cursors[point.number].hide();
                }
            }
            else if (command == 129) {    //drop token
                await IRtokens[point.number].update(coords,scaledCoords,forceNew)
                IRtokens[point.number].dropIRtoken();
                cursors[point.number].hide();
            }
            /*
            else if (command == 2) {      //pen pointer
                if (coords.x != undefined && coords.y != undefined) {
                    if (oldCommand != 2) {
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
            else if (command == 3) {      //pen A
                if (coords.x != undefined && coords.y != undefined) {
                    pen.click(command,{
                        x: scaledCoords.x,
                        y: scaledCoords.y,
                        rawCoords: coords
                    });
                }
            }
            else if (command == 6) {      //pen D
                if (coords.x != undefined && coords.y != undefined) {
                    if (oldCommand == 6) {
                        pen.hold(command,{
                            x: scaledCoords.x,
                            y: scaledCoords.y
                        });
                    }
                    else {
                        pen.click(command,{
                            x: scaledCoords.x,
                            y: scaledCoords.y,
                            rawCoords: coords
                        });
                    }
                }
            }
            else if (command == 5) {      //pen C
                if (coords.x != undefined && coords.y != undefined) {
                    if (oldCommand == 5) {
                        pen.hold(command,{
                            x: scaledCoords.x,
                            y: scaledCoords.y
                        });
                    }
                    else {
                        pen.click(command,{
                            x: scaledCoords.x,
                            y: scaledCoords.y,
                            rawCoords: coords
                        });
                    }
                }
            }
            else if (command == 4) {      //pen B
                if (coords.x != undefined && coords.y != undefined) {
                    pen.updateCursor({
                        x: scaledCoords.x,
                        y: scaledCoords.y,
                        size: 5,
                        color: "0x00FFFF"
                    });
                }
            }
            oldCommand = command;
            */
        }
    }
}