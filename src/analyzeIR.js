import { moduleName,configDialog,calibrationProgress } from "../MaterialPlane.js";
import { IRtoken } from "./IRtoken/IRtoken.js";
import { debug } from "./Misc/misc.js";
import { Pen } from "./Pen/pen.js";
import {scaleCanvasToIR, scaleIRinput} from "./IRtoken/tokenHelpers.js";
import { Cursor } from "./Misc/cursor.js";

export let lastBaseAddress = 0;
export let IRtokens = [];
let cursors = [];
export let pen;
let oldCommand = 0;
let batteryNotificationTimer = 0;

export function getTokenByID(id){
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
 * @param {Object} data - the IR data received.  Format of the Object:
 *   command {number}: Command from IR source (really only relevant for the pointer). Will be 1 for bases
 *   battery {number}: Battery level of the given source
 *   detectedPoints {number}: How many IR points are provided.  Not sure if this is ever greater than 1 -
 *      I suppose it could be the case if the polling is slow (backlog of data)
 *   id {number}: The based id
 *   status {string}: Type of message - seems to always be "IR data"
 *   irPoints {Object[]}: Array of IR point data, also an object:
 *     x,y {number}: coordinate of data - this is raw from the sensor, and needs to be transformed
 *                  to canvas coordinates.  Special value of -9999, -9999 is used to denote that
 *                  an IR source has disappeared, but in the case, id is also zero.
 *     area {number}: Size of IR source.  Appears unused in this function
 *     avgBrigthness, maxBrightness {number}: Brightness information for this source.  Appears unused in
 *          this function
 *     number:  What IR source is being tracked?  This indexes into
 *        IRTokens[], which is used to track movement of particular token.  If only moving 1 token,
 *        this always seems to be zero.
 */
export async function analyzeIR(data) {
    const activeUser = game.settings.get(moduleName,'ActiveUser');
    if (configDialog?.configOpen) configDialog.drawIrCoordinates(data);
    //console.log('analyzeIR data');
    //console.dir(data, {depth: null});

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

/**
 * This fakes the reception of IR data, calling analyzeIRdata()
 * @param {number} baseid: ID of the base to mimic.  Most likely should match one
 *    of the ids assigned to actors within the MaterialFoundry configuration
 * @param {number} command: The IR command that has been sent.  Seems to be 1 for base
 *    movement, 0 for base has stopped transmitting.
 * @param {number} x, y:  The canvas positions of where this signal should appear to be
 *   fakeIRdata will convert this back to sensor coordinates before calling analyzeIRdata() -
 *   using canvas positions is just simpler since mostly like for testing, the goal is to
 *   move a token a set number of spaces in some direction.  Special -9999, -9999 is passed
 *   unscaled, as that is used for dropping the base.
 *
 * Note that fakeIRdata() does not fill in all the data that is normally returned -
 * rather, it just fills in what is used by analyzeIRdata(), so things like
 * brightness and area of the point data is not filled in.
 *
 * Example of use:
 * First, find the module and api:
 * mf = game.modules.get('MaterialPlane');
 * Next, find the token with the id you want - 1234 in this case
 * mytoken = mf.api.getTokenByID(1234)
 * Set the gridsize - makes following command shorter:
 * gridsize = canvas.dimensions.size;
 * Now, move the token 2 spaces to the right with fake IR data.  Half a gridsize is added so that
 * the generated coordinates will be in the middle of a square.  Use negative values to move left/up.
 * mf.api.fakeIRdata(1234, 1, mytoken.x + 2 * gridsize + gridsize / 2, mytoken.y + gridsize / 2)
 * To drop the token:
 * mf.api.fakeIRdata(1234, 0, -9999, -9999)
 */
export function fakeIRdata(baseid, command, x, y) {
    let payload={battery: 100, command: command, status: 'IR data', id: baseid, detectedPoints: 1}
    if (x == -9999 && y== -9999) {
        payload['irPoints'] = [{number: 0, x: -9999, y: -9999}];
    }
    else {
        let pos = scaleCanvasToIR({x: x, y:y});
        payload['irPoints'] = [{number: 0, x: pos.x, y: pos.y}];
    }
    analyzeIR(payload);
}

/**
 * This is a helper to provide a way to test the ruler without needing to do the rest of the
 * IR logic.
 *
 * @param {number} irtoken: Index into irtoken to use. This can be useful if it is desired to
 *                  test multiple tokens at the same time.
 * @param {object} token: the token to draw the ruler for.
 * @param {number} x: Canvas x position to draw ruler to
 * @param {number} y: Canvas y position to draw ruler to.
 *
 * Note that this updates the IRtokens array, since the ruler needs that.  This is fine for testing,
 * but calling this function when moving actual IR bases around will likely result in odd behavior.
 * Might be nice to allow an index into IRtokens to test multiple rulers at t
 *
 * Example of use:
 * First, find the module and api:
 * mf = game.modules.get('MaterialPlane');
 * Next, find the token with the id you want - 1234 in this case
 * mytoken = mf.api.getTokenByID(1234)
 * Set the gridsize - makes following command shorter:
 * gridsize = canvas.dimensions.size;
 * Now draw the ruler from token to 2 spaces to the right. Not needed to add half a grid space
 * as the ruler calculations seem to take that into account.
 * Use negative values to move left/up.
 * mf.api.RulerTest(0, mytoken, mytoken.x + 2 * gridsize, y: mytoken.y)
 */
export function rulerTest(irtoken, token, x, y)
{
    IRtokens[irtoken].ruler.start(token, {x: token.x, y: token.y});
    IRtokens[irtoken].ruler.move({x:x, y:y});
}

/**
 * This calls the end() function for the ruler
 * @constructor
 */
export function rulerTestEnd(irtoken) {
    IRtokens[irtoken].ruler.end();
}