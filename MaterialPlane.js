//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Global variables
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { registerSettings, mpConfig, onHwVariantChange } from "./src/Misc/settings.js";
import { sendWS,startWebsocket } from "./src/websocket.js";
import { calibrationProgressScreen, removeOverlay } from "./src/calibration.js";
import { registerLayer, configureDebug, compareVersions } from "./src/Misc/misc.js";
import { initializeIRtokens, initializeCursors, setLastBaseAddress } from "./src/analyzeIR.js";
import { IRremote } from "./src/IRremote/IRremote.js";
import { analyzeTouch } from "./src/analyzeTouch.js";

export const moduleName = "MaterialPlane";
export let lastToken;
export let lastTokenSceneName;

let hideElements = false;
let enableModule = false;

//export let calibrationDialog;
export let configDialog;
export let calibrationProgress;

export let hwVariant = 'Beta';
export let hwFirmware;
export let hwWebserver;
export let msVersion;
export let masterVersions = {};

export let irRemote = new IRremote();

Handlebars.registerHelper('ifCond', function(v1, v2, options) {
    if(v1 === v2) {
      return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('ifNCond', function(v1, v2, options) {
    if(v1 === v2) {
        return options.inverse(this);
    }
    return options.fn(this);
});

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
    hwFirmware = v;
    if(document.getElementById('MaterialPlane_Config') != null) 
        document.getElementById('mpConfigLocalFwVersion').innerHTML = v;
}

export function setHwWebserver(v) {
    hwWebserver = v;
    if(document.getElementById('MaterialPlane_Config') != null) 
        document.getElementById('mpConfigLocalSWsVersion').innerHTML = v;
}

export function setMsVersion(v) {
    msVersion = v;
    if(document.getElementById('MaterialPlane_Config') != null)
        document.getElementById('mpConfigLocalMsVersion').innerHTML = v;
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
Hooks.on('ready', ()=>{
    //configDialog.setConfigOpen(true);
    //configDialog.render(true);

    checkForUpdate('module');
    checkForUpdate('hwFw');
    checkForUpdate('SWs');
    checkForUpdate('MS');
    checkForUpdate('base');
    checkForUpdate('pen');

    enableModule = (game.user.name == game.settings.get(moduleName,'TargetName')) ? true : false;
    hideElements = game.settings.get(moduleName,'HideElements') && game.user.isGM == false;
    if (game.settings.get(moduleName,'device') == 'sensor' && game.settings.get(moduleName,'Enable') && window.location.protocol == "https:" && game.settings.get(moduleName,'EnMaterialServer') == false){
        ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.SSL"));
        enableModule = false;
        return;
    }
    if ((enableModule || game.user.isGM) && game.settings.get(moduleName,'Enable')){
        if (game.settings.get(moduleName,'device') == 'sensor')
            startWebsocket();
        else {
            document.addEventListener('touchstart',function(e) {analyzeTouch('start',e);});
            document.addEventListener('touchmove',function(e) {analyzeTouch('move',e);});
            document.addEventListener('touchend',function(e) {analyzeTouch('end',e);});
            document.addEventListener('touchcancel',function(e) {analyzeTouch('end',e);});
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
                if (token != undefined) token.document.update({x: payload.newCoords.x, y: payload.newCoords.y});
            }
        }
        else if (payload.msgType == 'refresh') {
            window.location.reload(); 
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
    
    if (game.user.isGM) game.settings.set(moduleName,'menuOpen',false);

    initializeIRtokens();
    initializeCursors();
});

Hooks.on("renderSidebarTab", (app, html) => {
    enableModule = (game.user.name == game.settings.get(moduleName,'TargetName')) ? true : false;
    if (enableModule == false && game.user.isGM == false) return;

    if (app.options.id == 'settings') {
        const label = $(
            `<div id="MP-section">
            <h2>Material Plane</h2>

            <button id="MaterialPlane_ConfigBtn" title="Material Plane Configuration">
                <i></i> ${game.i18n.localize("MaterialPlane.Config.Title")}
            </button>
            </div>
            `
        );
        const setupButton = html.find("div[id='settings-game']");
        setupButton.after(label);
        
        document.getElementById("MaterialPlane_ConfigBtn").addEventListener("click",event => {
            // let dialog = new mpConfig();
            configDialog.setConfigOpen(true);
            configDialog.render(true);
        });
        
    }
});


Hooks.on('closempConfig',() => {
    configDialog.setConfigOpen(false);
});

Hooks.on('closecalibrationProgressScreen',() => {
    removeOverlay();
    calibrationProgress.setCalibrationRunning(false)
    console.log('stopping calibration')
    let msg = "CAL CANCEL ";
    sendWS(msg);
});

/**
 * Init hook
 * Initialize settings
 */
Hooks.once('init', function(){
    registerSettings(); //in ./src/settings.js
    registerLayer();
    configDialog = new mpConfig();
    //calibrationDialog = new calibrationForm();
    calibrationProgress = new calibrationProgressScreen();    
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

Hooks.on('canvasReady', (canvas) => {
   // canvas.stage.addChild(circle);
    //circle.init();
})

Hooks.on('controlToken', (token,controlled) => {
    if (!controlled) return;

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

export function checkForUpdate(reqType) {
    let url, id;
    if (reqType == 'module') {id = 'Module'; url = 'https://raw.githubusercontent.com/CDeenen/MaterialPlane_Foundry/master/module.json';}
    else if (reqType == 'hwFw') {id = 'Fw'; url = 'https://raw.githubusercontent.com/CDeenen/MaterialPlane_Hardware/master/Sensor/configuration.h';}
    else if (reqType == 'SWs') {id = 'SWs'; url = 'https://raw.githubusercontent.com/CDeenen/MaterialPlane_Hardware/master/Sensor/data/main.js';}
    else if (reqType == 'base') {id = 'Base'; url = 'https://raw.githubusercontent.com/CDeenen/MaterialPlane_Hardware/master/Base/definitions.h';}
    else if (reqType == 'pen') {id = 'Pen'; url = 'https://raw.githubusercontent.com/CDeenen/MaterialPlane_Hardware/master/Pen/definitions.h';}
    else if (reqType == 'MS') {id = 'Ms'; url = 'https://raw.githubusercontent.com/CDeenen/MaterialServer/master/package.json';}


    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.send(null);
    request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status === 200) {
            var type = request.getResponseHeader('Content-Type');
            if (type.indexOf("text") !== 1) {
                let version;
                if (reqType == 'module') {
                    version = JSON.parse(request.responseText).version;
                    masterVersions.module = version;
                }
                else if (reqType == 'MS') {
                    version = JSON.parse(request.responseText).version;
                    masterVersions.ms = version;
                }
                else if (reqType == 'SWs') {
                    const start = request.responseText.search('"', request.responseText.search('const webserverVersion = "v')) + 2;
                    let v = "";
                    for (let i=start; i<start+10; i++) {
                        if (request.responseText[i] == '"') break;
                        else v += request.responseText[i];
                    }
                    masterVersions.sensorWs = v;
                    version = v;
                }
                else {
                  const start = request.responseText.search('"', request.responseText.search('#define FIRMWARE_VERSION')) + 1;
                  let v = "";
                  for (let i=start; i<start+10; i++) {
                    if (request.responseText[i] == '"') break;
                    else v += request.responseText[i];
                  }
                  if (reqType == 'hwFw') masterVersions.sensorFW = v;
                  else if (reqType == 'base') masterVersions.baseFW = v;
                  else if (reqType == 'pen') masterVersions.penFW = v;
                  version = v;
                }
                
                if (document.getElementById('MaterialPlane_Config') != null) {
                    document.getElementById(`mpConfigMaster${id}Version`).innerHTML = version;
                }    
                return;
            }
            
        }
    }
    request.onerror = function () {
        
    }
} 