//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Global variables
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { registerSettings, onHwVariantChange } from "./src/Misc/settings.js";
import { mpConfig } from "./src/Misc/config.js";
import { sendWS, startWebsocket } from "./src/Communication/websocket.js";
import { calibrationProgressScreen, removeOverlay, calOverlay } from "./src/calibration.js";
import { registerLayer, configureDebug } from "./src/Misc/misc.js";
import { initializeIRtokens, initializeCursors, setLastBaseAddress, pen, fakeIRdata, getTokenByID, rulerTest, rulerTestEnd } from "./src/analyzeIR.js";
import { IRremote } from "./src/IRremote/IRremote.js";
import { analyzeTouch } from "./src/analyzeTouch.js";
import { compatibilityHandler } from "./src/Misc/compatibilityHandler.js";

export const moduleName = "MaterialPlane";
export let lastToken;
export let lastTokenSceneName;

let hideElements = false;
let enableModule = false;
let isActiveUser = false;

//export let calibrationDialog;
export let configDialog;
export let calibrationProgress;

export let hwVariant = 'Production';
export let hwFirmware;
export let hwWebserver;
export let msVersion;
export let latestReleases = {};

export let irRemote = new IRremote();

export let routingLibEnabled = false;

export const urls = [
    {
        target: 'Module',
        url: "https://api.github.com/repos/CDeenen/MaterialPlane_Foundry/releases"
    },{
        target: 'SensorFirmware',
        url: "https://api.github.com/repos/MaterialFoundry/MaterialPlane_Sensor/releases"
    },{
        target: 'SensorWebserver',
        url: "https://api.github.com/repos/MaterialFoundry/MaterialPlane_Sensor/releases"
    },{
        target: 'MaterialCompanion',
        url: "https://api.github.com/repos/MaterialFoundry/MaterialCompanion/releases"
    },{
        target: 'Base',
        url: "https://api.github.com/repos/MaterialFoundry/MaterialPlane_Base/releases"
    },{
        target: 'Pen',
        url: "https://api.github.com/repos/MaterialFoundry/MaterialPlane_Pen/releases"
    }
]

Handlebars.registerHelper('mpIfCond', function(v1, v2, options) {
    if(v1 === v2) {
      return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('mpIfNCond', function(v1, v2, options) {
    if(v1 === v2) {
        return options.inverse(this);
    }
    return options.fn(this);
});

//CONFIG.debug.hooks = true;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Functions
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function setHwVariant(v) {
    if (hwVariant != v) {
        onHwVariantChange(v);
    }
    hwVariant = v;
}

export function setHwFirmware(v) {
    if(hwFirmware != v && document.getElementById('MaterialPlane_Config') != null) 
        document.getElementById('mpConfigLocalFwVersion').innerHTML = v;
    hwFirmware = v;
}

export function setHwWebserver(v) {
    if(hwWebserver != v && document.getElementById('MaterialPlane_Config') != null) 
        document.getElementById('mpConfigLocalSWsVersion').innerHTML = v;
    hwWebserver = v;
}

export function setMsVersion(v) {
    if(msVersion != v && document.getElementById('MaterialPlane_Config') != null)
        document.getElementById('mpConfigLocalMsVersion').innerHTML = v;
    msVersion = v;
}

/**
 * Check keys for 'Ctrl' press, to show or hide elements
 */

function checkKeys() {
    let fired = false;
    window.addEventListener("keydown", async (e) => { 
      if (fired){
        fired = false;
        if (hideElements){
            $('#logo').hide();
            $('#sidebar').hide();
            $('#navigation').hide();
            $('#controls').hide();
            $('#players').hide();
            $('#hotbar').hide();
        }
      }
      else if (e.key == "Control") {
        fired = true;
        if (hideElements){
            $('#logo').show();
            $('#sidebar').show();
            $('#navigation').show();
            $('#controls').show();
            $('#players').show();
            $('#hotbar').show();
        }
        
      }
    });
}



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Hooks
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Ready hook
 * Attempt to open the websocket
 */
Hooks.on('ready', async ()=>{
   // configDialog.setConfigOpen(true);
   // configDialog.render(true);

    if (game.version.split('.')[0] < 12 && game.settings.get(moduleName,'device') == 'touch') {
        let d = new Dialog({
            title: "Material Plane: Incompatibility",
            content: "<p>The touch functionality of Material Plane is incompatible with Foundry V11.<br>You should upgrade to Foundry v12 if you want to use the touch functionality. If you ignore this message, expect weird behavior.</p>",
            buttons: {
             one: {
              icon: '<i class="fas fa-check"></i>',
              label: "Ok"
             }
            },
            default: "one",
           });
           d.render(true);
    }

    if (game.settings.get(moduleName, 'ActiveUser') == "" && game.user.isGM) {
        game.settings.set(moduleName, 'ActiveUser',game.userId)
    }

    isActiveUser = game.user.id == game.settings.get(moduleName,'ActiveUser');
    enableModule = isActiveUser;
    hideElements = game.settings.get(moduleName,'HideElements') && game.user.isGM == false && enableModule;
    if (game.settings.get(moduleName,'device') == 'sensor' && game.settings.get(moduleName,'ConnectionMode') != "noConnect" && window.location.protocol == "https:" && game.settings.get(moduleName,'ConnectionMode') != 'materialCompanion'){
        ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.SSL"));
        enableModule = false;
        return;
    }
    if ((enableModule || game.user.isGM) && game.settings.get(moduleName,'ConnectionMode') != "noConnect"){
        if (game.settings.get(moduleName,'device') == 'sensor') {
            startWebsocket();
        }
        else if (enableModule) {
            document.addEventListener('touchstart',function(e) {analyzeTouch('start',e);});
            document.addEventListener('touchmove',function(e) {analyzeTouch('move',e);});
            document.addEventListener('touchend',function(e) {analyzeTouch('end',e);});
            document.addEventListener('touchcancel',function(e) {analyzeTouch('end',e);});

            //disable ping on long press
            canvas.pingOld = canvas.ping;
            canvas.ping = function(origin) {};
        }

        if (hideElements){
            $('#logo').hide();
            $('#sidebar').hide();
            $('#navigation').hide();
            $('#controls').hide();
            $('#players').hide();
            $('#hotbar').hide();
            checkKeys();
        }
    }

    game.socket.on(`module.MaterialPlane`, (payload) =>{
        //console.log(payload);
        
        if (game.user.id == payload.receiverId) {
            if (payload.msgType == "moveToken"){
                let token = canvas.tokens.get(payload.tokenId);
                if (token != undefined) token.document.update({x: payload.newCoords.x, y: payload.newCoords.y, animate: false});
            }
            if (payload.msgType == "setTokenMovementAction"){
                let token = canvas.tokens.get(payload.tokenId);
                if (token != undefined) token.document.update({movementAction: payload.action});
            }
        }
        else if (payload.msgType == 'refresh') {
            window.location.reload(); 
        }
        else if (payload.msgType == 'calConfig') {
            calibrationProgress.configureElements(payload.config, true)
        }
        if (game.user.isGM) {
            if (payload.msgType == "controlToken") {
                lastToken = game.canvas.tokens.get(payload.tokenId);
                lastTokenSceneName = payload.lastTokenSceneName;
                if (document.getElementById("MaterialPlane_Config") != null) {
                    document.getElementById("mpLastTokenName").value=lastToken.name;
                    document.getElementById("mpLastTokenActorName").value=lastToken.actor.name;
                    document.getElementById("mpLastTokenSceneName").value=lastTokenSceneName;
                }
            }
            else if (payload.msgType == "lastBaseAddress") {
                const lastBaseAddress = payload.lastBaseAddress;
                setLastBaseAddress(lastBaseAddress);
                if (document.getElementById("MaterialPlane_Config") != null) {
                    document.getElementById("mpLastBaseAddress").value=lastBaseAddress;
                    for (let i=0; i<99; i++) {
                        let base = document.getElementById("baseId-"+i);
                        if (base != null) {
                            if (lastBaseAddress == base.value) base.style.color="green";
                            else base.style.color="";
                        }
                    }
                }
            }
            else if (payload.msgType == 'setSettings') {
                game.settings.set(moduleName, payload.settingId, payload.value)
            }
        }    
    });

    if (!enableModule && !game.user.isGM) return;

    checkForUpdate('Module');
    checkForUpdate('SensorFirmware');
    checkForUpdate('SensorWebserver');
    checkForUpdate('MaterialCompanion');
    checkForUpdate('Base');
    checkForUpdate('Pen');
    
    if (game.user.isGM) game.settings.set(moduleName,'menuOpen',false);

    let rulerSettings = await game.settings.get(moduleName,'tokenRuler');
    if (rulerSettings.mode == undefined) rulerSettings.mode = 'disabled';
    if (rulerSettings.stop == undefined) rulerSettings.stop = 'tokenDrop';
    if (rulerSettings.distance == undefined) rulerSettings.distance = 2;
    game.settings.set(moduleName,'tokenRuler',rulerSettings);

    const routingLib = game.modules.get('routinglib');
    if (routingLib && routingLib.active) routingLibEnabled = true;

    initializeIRtokens();
    initializeCursors();

    Hooks.on('activateDrawingsLayer', layer => {
        const drawings = layer.placeables;
    
        for (let drawing of drawings) {
            pen.drawingTarget.addTarget(drawing);
        }
    })
    
    Hooks.on('refreshDrawing', drawing => {
        pen.drawingTarget.updateTarget(drawing);
    });
    
    Hooks.on('drawDrawing', drawing => {
        pen.drawingTarget.addTarget(drawing);
    })
    
    Hooks.on('deleteDrawing', drawing => {
        pen.drawingTarget.removeTarget(drawing);
    })
});

Hooks.on('closempConfig',() => {
    configDialog.setConfigOpen(false);
});

Hooks.on('closecalibrationProgressScreen',() => {
    removeOverlay();
    calibrationProgress.setCalibrationRunning(false)
    sendWS({event:"calibration", state:"cancel"});
});

/**
 * Init hook
 * Initialize settings
 */
Hooks.once('init', function(){
    compatibilityHandler.init();
    compatibilityHandler.createConfigButton(enableModule);
    registerSettings();
    registerLayer();
    configDialog = new mpConfig();
    calibrationProgress = new calibrationProgressScreen();

    /*
     * Attach functions to this modules api interface so
     * that they can be called from the browsers java console.
     * This allows testing/development without actually needing to
     * move tokens around.
     *
     * Use of these apis (from java console).  See actual function
     * declarations for what options the different functions take.
     * mf = game.modules.get('MaterialPlane');
     * mf.api.fakeIRdata(....);
     *
     */
    const myModule = game.modules.get('MaterialPlane');

    if (myModule) {
        myModule.api = {
            fakeIRdata: fakeIRdata,
            getTokenByID: getTokenByID,
            rulerTest: rulerTest,
            rulerTestEnd: rulerTestEnd
        };
    }
});

/**
 * Hide elements on various hooks
 */
Hooks.on('renderSceneNavigation', (app,html) => {
    if (hideElements) {
        html.hide();
    }
});

Hooks.on('renderSceneControls', (app, html) => {
    if (hideElements) {
        html.hide();
    }
});

Hooks.on('renderSidebarTab', (app, html) => {
    if (hideElements) {
        html.hide();
    }
});

Hooks.on('renderCombatTracker', (app, html) => {
    if (hideElements) {
        html.hide();
    }
});

Hooks.on('renderPlayerList', (app, html) => {
    if (hideElements) {
        html.hide();
    }
});

Hooks.on('controlToken', (token,controlled) => {
    if (!controlled) return;
    enableModule = game.user.id == game.settings.get(moduleName,'ActiveUser');
    if (!enableModule && !game.user.isGM) return;

    lastToken = token;
    lastTokenSceneName = canvas.scene.name;

    const payload = {
        msgType: "controlToken",
        tokenId: lastToken.id,
        lastTokenSceneName
    }
    game.socket.emit(`module.MaterialPlane`, payload);

    if (document.getElementById("MaterialPlane_Config") != null) {
        document.getElementById("mpLastTokenName").value=token.name;
        document.getElementById("mpLastTokenActorName").value=token.actor.name;
        document.getElementById("mpLastTokenSceneName").value=canvas.scene.name;
    }
})

Hooks.on('MPdebug', (data) => {
    configureDebug(data);
})

Hooks.on('renderPlayerList', (a,b, playerlist) => {
    const pl = playerlist.users.find(p => p._id == game.settings.get(moduleName,'ActiveUser'));
    if (pl == undefined) return;
    const html = `<span style="font-size:0.6rem; border:2px solid; border-radius:25%; padding: 0px 3px 0px 3px">MP</span>`;
    document.querySelectorAll(`[data-tooltip="${pl.displayName}"]`)[0].innerHTML+=html;
});

//let scaleOld;
let viewPositionOld;

Hooks.on('canvasPan', (canvas, viewPosition) => {
    if (pen == undefined) return;
    if (viewPositionOld == undefined) {
        viewPositionOld = viewPosition;
        return;
    }

    if (viewPosition.scale-viewPositionOld.scale == 0) {
        pen.menu.moveMenu({x:viewPosition.x-viewPositionOld.x, y:viewPosition.y-viewPositionOld.y}, true)
    }
    else {
        pen.menu.drawMenu(undefined);
    }
    viewPositionOld = viewPosition;

    if (calOverlay != undefined) calOverlay.update();
});

export async function checkForUpdate(reqType) {
    const url = urls.find(u => u.target == reqType).url;

    $.getJSON(url).done(function(releases) {
        releases = releases.filter(r => r.prerelease == false);
        if (reqType == 'SensorFirmware') releases = releases.filter(r => r.tag_name.includes('irmware'));
        else if (reqType == 'SensorWebserver') releases = releases.filter(r => r.tag_name.includes('ebserver'));
        const arr = releases[0].tag_name.split('v');
        const version = arr[arr.length-1]

        if (reqType == 'Module') {
            latestReleases.module = version;
        }
        if (reqType == 'SensorFirmware') {
            latestReleases.sensorFirmware = version;
        }
        if (reqType == 'SensorWebserver') {
            latestReleases.sensorWebserver = version;
        }
        if (reqType == 'Base') {
            latestReleases.baseFirmware = version;
        }
        if (reqType == 'Pen') {
            latestReleases.penFirmware = version;
        }
        else if (reqType == 'MaterialCompanion') {
            latestReleases.materialCompanion = version;
        }
    });

    
}
