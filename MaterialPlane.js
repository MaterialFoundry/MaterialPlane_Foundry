//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Global variables
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { registerSettings, mpConfig, onHwVariantChange } from "./src/Misc/settings.js";
import { sendWS,startWebsocket } from "./src/websocket.js";
import { calibrationProgressScreen, removeOverlay } from "./src/calibration.js";
import { registerLayer, configureDebug, compareVersions, compatibleCore } from "./src/Misc/misc.js";
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
export let latestReleases = {};

export let irRemote = new IRremote();

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
    return;
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
Hooks.on('ready', ()=>{
    if (game.version.split('.')[0] >= 11 && game.settings.get(moduleName,'device') == 'touch') {
        console.warn("")
        let d = new Dialog({
            title: "Material Plane: Incompatibility",
            content: "<p>The touch functionality of Material Plane is incompatible with Foundry V11.<br>You should downgrade to Foundry V10 if you want to use the touch functionality. If you ignore this message, expect weird behavior.</p>",
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
        game.settings.set(moduleName, 'ActiveUser',game.users.activeGM.id)
    }

    enableModule = game.user.id == game.settings.get(moduleName,'ActiveUser');
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
            document.addEventListener('touchstart',function(e) {e.preventDefault(); analyzeTouch('start',e);});
            document.addEventListener('touchmove',function(e) {e.preventDefault(); analyzeTouch('move',e);});
            document.addEventListener('touchend',function(e) {e.preventDefault(); analyzeTouch('end',e);});
            document.addEventListener('touchcancel',function(e) {e.preventDefault(); analyzeTouch('end',e);});
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

    if (!enableModule && !game.user.isGM) return;

    checkForUpdate('Module');
    checkForUpdate('SensorFirmware');
    checkForUpdate('SensorWebserver');
    checkForUpdate('MaterialCompanion');
    checkForUpdate('Base');
    checkForUpdate('Pen');

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
    enableModule = game.user.id == game.settings.get(moduleName,'ActiveUser');
    if (!enableModule && !game.user.isGM) return;

    if (app.options.id == 'settings') {
        const popOut = app.popOut ? "_PopOut" : "";
        const label = $(
            `<div id="MP-section">
            <h2>Material Plane</h2>

            <button id="MaterialPlane_ConfigBtn${popOut}" title="Material Plane Configuration">
                <i></i> ${game.i18n.localize("MaterialPlane.Config.Title")}
            </button>
            </div>
            `
        );
        const setupButton = html.find("div[id='settings-game']");
        setupButton.after(label);
        
        document.getElementById(`MaterialPlane_ConfigBtn${popOut}`).addEventListener("click",event => {
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
    
    sendWS({event:"calibration", state:"cancel"});
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

    return;

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
                    latestReleases.module = version;
                }
                else if (reqType == 'MS') {
                    version = JSON.parse(request.responseText).version;
                    latestReleases.ms = version;
                }
                else if (reqType == 'SWs') {
                    const start = request.responseText.search('"', request.responseText.search('const webserverVersion = "v')) + 2;
                    let v = "";
                    for (let i=start; i<start+10; i++) {
                        if (request.responseText[i] == '"') break;
                        else v += request.responseText[i];
                    }
                    latestReleases.sensorWs = v;
                    version = v;
                }
                else {
                  const start = request.responseText.search('"', request.responseText.search('#define FIRMWARE_VERSION')) + 1;
                  let v = "";
                  for (let i=start; i<start+10; i++) {
                    if (request.responseText[i] == '"') break;
                    else v += request.responseText[i];
                  }
                  
                  if (reqType == 'hwFw') latestReleases.sensorFW = v;
                  else if (reqType == 'base') latestReleases.baseFW = v;
                  else if (reqType == 'pen') latestReleases.penFW = v;
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
