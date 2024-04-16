import { moduleName, hwVariant, hwFirmware, hwWebserver, msVersion, latestReleases, checkForUpdate, urls } from "../../MaterialPlane.js";
import { lastBaseAddress, pen } from "../analyzeIR.js";
import { sendWS } from "../Communication/websocket.js";

/**
 * Configuration application
 */
export class mpConfig extends FormApplication {
    constructor(data, options) {
        super(data, options);
        this.restart = false;
        this.baseSettings = [];
        this.irCodes = [];
        this.configOpen = false;
        this.sensorSettings = {};
        this.blockInteraction = true;
        this.rulerSettings = {};
    }

    /**
     * Default Options for this FormApplication
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "MaterialPlane_Config",
            title: game.i18n.localize("MaterialPlane.Config.Title"),
            template: "./modules/MaterialPlane/templates/config.html",
            width: 700,
            height: 'auto'
        });
    }

    setConfigOpen(open) {
        this.configOpen = open;
    }

    /**
     * Provide data to the template
     */
    getData() {
        this.baseSettings = game.settings.get(moduleName, 'baseSetup');
        this.irCodes = game.settings.get(moduleName,'remoteSetup');
        this.rulerSettings = game.settings.get(moduleName,'tokenRuler');

        let users = [];
        for (let u of game.users) {
            
            users.push({
                name: u.name,
                id: u.id,
                active: game.settings.get(moduleName, 'ActiveUser') == u.id ? "selected" : ""
            })
        }

        let data = {
            hwVariant,
            blockInteraction: this.blockInteraction,

            users,
            device: game.settings.get(moduleName,'device'),
            movementMethod: game.settings.get(moduleName,'movementMethod'),
            batteryNotifications: game.settings.get(moduleName, 'batteryNotifications'),
            deselect: game.settings.get(moduleName,'deselect'),
            movementMarker: game.settings.get(moduleName,'movementMarker'),
            nonOwnedMovement: game.settings.get(moduleName,'EnNonOwned'),
            collision: game.settings.get(moduleName,'collisionPrevention'),
            hideElements: game.settings.get(moduleName,'HideElements'),
            penMenu: game.settings.get(moduleName,'MenuSize'),
            cursorSize: game.settings.get(moduleName,'CursorSize'),
            baseOrientation: game.settings.get(moduleName,'baseOrientation'),

            connectionMode: game.settings.get(moduleName,'ConnectionMode'),
            sensorIP: game.settings.get(moduleName,'IP'),
            materialServerIP: game.settings.get(moduleName,'MaterialServerIP'),
            nrOfConnAttempts: game.settings.get(moduleName,'nrOfConnAttempts'),

            tapMode: game.settings.get(moduleName,'tapMode'),
            touchTimeout: game.settings.get(moduleName,'touchTimeout'),
            tapTimeout: game.settings.get(moduleName,'tapTimeout'),
            touchScaleX: game.settings.get(moduleName,'touchScaleX'),
            touchScaleY: game.settings.get(moduleName,'touchScaleY'),

            baseSetup: this.baseSettings,

            irCodes: this.irCodes,

            coordinates: [0,1,2,3],

            sensor: this.sensorSettings,

            minimumFwVersion: game.modules.get("MaterialPlane").flags.minimumSensorVersion,
            minimumWsVersion: game.modules.get("MaterialPlane").flags.minimumSensorWsVersion,
            minimumBaseVersion: game.modules.get("MaterialPlane").flags.minimumBaseVersion,
            minimumPenVersion: game.modules.get("MaterialPlane").flags.minimumPenVersion,
            minimumMsVersion: game.modules.get("MaterialPlane").flags.minimumMSversion,
            localModuleVersion: game.modules.get("MaterialPlane").version,
            localFwVersion: hwFirmware,
            localSWsVersion: hwWebserver,
            localMsVersion: msVersion,
            latestReleases,

            rulerMode: this.rulerSettings.mode,
            rulerStop: this.rulerSettings.stop,
            rulerDistance: this.rulerSettings.distance
        }
        return data;
    }

    onRendered(html) {
        this.buildPenTable();
        this.buildBaseTable();
        this.buildRcTable();

        if (hwVariant != 'Production') {
            const mpProductionElements = document.getElementsByClassName('mpProd');
            for (let elmnt of mpProductionElements) {
                elmnt.style.display = 'none';
            }
        }

        //Refresh browser window on close if required
        document.getElementById('MaterialPlane_Config').getElementsByClassName('header-button close')[0].addEventListener('click', async event => { 
            if (this.restart) {
                const payload = {
                    msgType: "refresh"
                }
                await game.socket.emit(`module.MaterialPlane`, payload);
                window.location.reload(); 
            }
        });
    }

    /**
     * Update on form submit
     * @param {*} event 
     * @param {*} formData 
     */
    async _updateObject(event, formData) {
        
    }

    activateListeners(html) {
        this.onRendered(html);
        super.activateListeners(html);
        const parent = this;

        // --- General settings ---
        html.find("select[id=mpActiveUser]").on('change', event =>              { this.setSettings('ActiveUser',event.target.value); this.restart = true; });
        html.find("select[id=mpDevice]").on('change', async event =>            { await this.setSettings('device',event.target.value); this.render(); this.restart = true; });
        html.find("select[id=mpMovementMethod]").on('change', event =>          { this.setSettings('movementMethod',event.target.value); });
        html.find("input[id=mpDeselect]").on('change', event =>                 { this.setSettings('deselect',event.target.checked); });
        html.find("input[id=mpMovementMarker]").on('change', event =>           { this.setSettings('movementMarker',event.target.checked); });
        html.find("input[id=mpNonOwned]").on('change', event =>                 { this.setSettings('EnNonOwned',event.target.checked); });
        html.find("input[id=mpCollision]").on('change', event =>                { this.setSettings('collisionPrevention',event.target.checked); });
        html.find("input[id=mpHideDisplay]").on('change', event =>              { this.setSettings('HideElements',event.target.checked); this.restart = true; });
        html.find("input[id=mpBatteryNotifications]").on('change', event =>     { this.setSettings('batteryNotifications',event.target.checked); });
        html.find("select[id=mpBaseOrientation]").on('change', async event =>   { this.setSettings('baseOrientation',event.target.value); });
        html.find("input[id=mpCursorSize]").on('change', event =>  { 
            const val = this.constrain(event.target.value, game.settings.settings.get("MaterialPlane.CursorSize").range);
            html.find("input[id=mpCursorSize]")[0].value = val;
            html.find("input[id=mpCursorSizeNumber]")[0].value = val;
            this.setSettings('CursorSize',val);
        });
        html.find("input[id=mpCursorSizeNumber]").on('change', event =>  { 
            const val = this.constrain(event.target.value, game.settings.settings.get("MaterialPlane.CursorSize").range);
            html.find("input[id=mpCursorSize]")[0].value = val;
            html.find("input[id=mpCursorSizeNumber]")[0].value = val;
            this.setSettings('CursorSize',val);
        });
        html.find("input[id=mpPenMenu]").on('change', event =>  { 
            const val = this.constrain(event.target.value, game.settings.settings.get("MaterialPlane.MenuSize").range);
            html.find("input[id=mpPenMenu]")[0].value = val;
            html.find("input[id=mpPenMenuNumber]")[0].value = val;
            this.setSettings('MenuSize',val);
        });
        html.find("input[id=mpPenMenuNumber]").on('change', event =>  { 
            const val = this.constrain(event.target.value, game.settings.settings.get("MaterialPlane.MenuSize").range);
            html.find("input[id=mpPenMenu]")[0].value = val;
            html.find("input[id=mpPenMenuNumber]")[0].value = val;
            this.setSettings('MenuSize',val);
        });
        html.find("input[id=mpBlockInteraction]").on('change', event => { parent.blockInteraction = event.target.checked; });

        // --- Connection settings ---
        html.find("select[id=mpConnectionMethod]").on('change', event =>{ 
            const target = event.target.value;
            if (target == 'direct') {
                document.getElementById("mpSensorIpWrapper").style.display = "";
                document.getElementById("mpMCIpWrapper").style.display = "none";
            }
            else if (target == 'materialCompanion') {
                document.getElementById("mpSensorIpWrapper").style.display = "none";
                document.getElementById("mpMCIpWrapper").style.display = "";
            }
            else {
                document.getElementById("mpSensorIpWrapper").style.display = "none";
                document.getElementById("mpMCIpWrapper").style.display = "none";
            }
            this.setSettings('ConnectionMode',target); this.restart = true; 
        });
        html.find("input[id=mpSensorIP]").on('change', event =>         { this.setSettings('IP',event.target.value); this.restart = true; });
        html.find("input[id=mpMaterialServerIP]").on('change', event => { this.setSettings('MaterialServerIP',event.target.value); this.restart = true; });
        html.find("input[id=mpConnAttempts]").on('change', event =>{ 
            const val = this.constrain(event.target.value, game.settings.settings.get("MaterialPlane.nrOfConnAttempts").range);
            document.getElementById("mpConnAttempts").value = val;
            document.getElementById("mpConnAttemptsNumber").value = val;
            this.setSettings('nrOfConnAttempts',val);
        });
        html.find("input[id=mpConnAttemptsNumber]").on('change', event =>{ 
            const val = this.constrain(event.target.value, game.settings.settings.get("MaterialPlane.nrOfConnAttempts").range);
            document.getElementById("mpConnAttempts").value = val;
            document.getElementById("mpConnAttemptsNumber").value = val;
            this.setSettings('nrOfConnAttempts',val);
        });

        // --- Touch settings ---
        html.find("select[id=mpTapMode]").on('change', event =>         { this.setSettings('tapMode',event.target.value); });
        html.find("input[id=mpTouchTimeout]").on('change', event => {
            const val = this.constrain(event.target.value, game.settings.settings.get("MaterialPlane.touchTimeout").range);
            html.find("input[id=mpTouchTimeout]")[0].value = val;
            html.find("input[id=mpTouchTimeoutNumber]")[0].value = val;
            this.setSettings('touchTimeout',val);
        });
        html.find("input[id=mpTouchTimeoutNumber]").on('change', event => {
            const val = this.constrain(event.target.value, game.settings.settings.get("MaterialPlane.touchTimeout").range);
            html.find("input[id=mpTouchTimeout]")[0].value = val;
            html.find("input[id=mpTouchTimeoutNumber]")[0].value = val;
            this.setSettings('touchTimeout',val);
        });
        html.find("input[id=mpTapTimeout]").on('change', event => {
            const val = this.constrain(event.target.value, game.settings.settings.get("MaterialPlane.tapTimeout").range);
            html.find("input[id=mpTapTimeout]")[0].value = val;
            html.find("input[id=mpTapTimeoutNumber]")[0].value = val;
            this.setSettings('tapTimeout',val);
        });
        html.find("input[id=mpTapTimeoutNumber]").on('change', event => {
            const val = this.constrain(event.target.value, game.settings.settings.get("MaterialPlane.tapTimeout").range);
            html.find("input[id=mpTapTimeout]")[0].value = val;
            html.find("input[id=mpTapTimeoutNumber]")[0].value = val;
            this.setSettings('tapTimeout',val);
        });
        html.find("input[id=mpTouchScaleX]").on('change', event => {
            html.find("input[id=mpTouchScaleXNumber]")[0].value = event.target.value;
            this.setSettings('touchScaleX', event.target.value);
        });
        html.find("input[id=mpTouchScaleXNumber]").on('change', event => {
            html.find("input[id=mpTouchScaleX]")[0].value = event.target.value;
            this.setSettings('touchScaleX', event.target.value);
        });
        html.find("input[id=mpTouchScaleY]").on('change', event => {
            html.find("input[id=mpTouchScaleYNumber]")[0].value = event.target.value;
            this.setSettings('touchScaleY', event.target.value);
        });
        html.find("input[id=mpTouchScaleYNumber]").on('change', event => {
            html.find("input[id=mpTouchScaleY]")[0].value = event.target.value;
            this.setSettings('touchScaleY', event.target.value);
        });

        // --- Base Setup settings, more in buildBaseTable() ---
        html.find("button[name='addBaseConfig']").on('click', async event => {
            this.baseSettings.push({
                baseId:'',
                tokenName:'',
                actorName:'',
                sceneName:'',
                linkActor:false
            })
            await this.setSettings('baseSetup',this.baseSettings);
            this.buildBaseTable();
        })

        html.find("button[name='addPenConfig']").on('click', async event => {
            let macros = await game.settings.get(moduleName,'penMacros');
            macros.push({
                penId: '',
                m: 1,
                button: 'A',
                mode: 'press',
                macro: "",
                args: ""
            })
            await this.setSettings('penMacros',macros);
            this.buildPenTable();
        })

        // --- Remote Control Setup settings, more in buildIrTable() ---
        html.find("button[name='addIrConfig']").on('click', async event => {
            this.irCodes.push({
                name:'',
                protocol:'',
                code:'',
                macro: undefined,
                argument: '',
                delay:250
            })
            await this.setSettings('remoteSetup',this.irCodes);
            this.buildRcTable();
        })

        html.find("select[id=mpRulerMode]").on('change', event =>  { 
            let rulerSettings = game.settings.get(moduleName,'tokenRuler');
            rulerSettings.mode = event.target.value;
            this.setSettings('tokenRuler',rulerSettings); 
            document.getElementById('mpRulerStopWrapper').style.display = rulerSettings.mode == 'disabled' ? 'none' : '';
            document.getElementById('mpRulerDistanceWrapper').style.display = rulerSettings.mode == 'pathfinding' ? '' : 'none';
        });

        html.find("select[id=mpRulerStop]").on('change', event =>  { 
            let rulerSettings = game.settings.get(moduleName,'tokenRuler');
            rulerSettings.stop = event.target.value;
            this.setSettings('tokenRuler',rulerSettings); 
        });

        html.find("input[id=mpRulerDistance]").on('change', event =>  { 
            const val = this.constrain(event.target.value, {min:0, max: 6});
            html.find("input[id=mpRulerDistance]")[0].value = val;
            html.find("input[id=mpRulerDistanceNumber]")[0].value = val;
            let rulerSettings = game.settings.get(moduleName,'tokenRuler');
            rulerSettings.distance = event.target.value;
            this.setSettings('tokenRuler',rulerSettings); 
        });
        html.find("input[id=mpRulerDistanceNumber]").on('change', event =>  { 
            const val = this.constrain(event.target.value, {min:0, max: 6});
            html.find("input[id=mpRulerDistance]")[0].value = val;
            html.find("input[id=mpRulerDistanceNumber]")[0].value = val;
            let rulerSettings = game.settings.get(moduleName,'tokenRuler');
            rulerSettings.distance = event.target.value;
            this.setSettings('tokenRuler',rulerSettings); 
        });

        // --- Sensor Settings ---
        html.find("button[id=mpAutoExposure]").on('click', event =>                 { sendWS({event:'autoExposure'}); })

        html.find("input[id='mpSensorUpdateRate']").on('change', event =>           { sendWS({ir:{updateRate:event.target.value}}); })
        html.find("input[id='mpSensorUpdateRateNumber']").on('change', event =>     { sendWS({ir:{updateRate:event.target.value}}); })

        html.find("input[id='mpSensorBrightness']").on('change', event =>           { sendWS({ir:{brightness:event.target.value}}); })
        html.find("input[id='mpSensorBrightnessNumber']").on('change', event =>     { sendWS({ir:{brightness:event.target.value}}); })
        
        html.find("input[id='mpSensorMinBrightness']").on('change', event =>        { sendWS({ir:{minBrightness:event.target.value}}); })
        html.find("input[id='mpSensorMinBrightnessNumber']").on('change', event =>  { sendWS({ir:{minBrightness:event.target.value}}); })

        html.find("input[id='mpSensorAverage']").on('change', event =>              { sendWS({ir:{average:event.target.value}}); })
        html.find("input[id='mpSensorAverageNumber']").on('change', event =>        { sendWS({ir:{average:event.target.value}}); })
        
        html.find("input[id='mpSensorMirrorX']").on('change', event =>              { sendWS({ir:{mirrorX:event.target.checked ? '1' : '0'}}); })
        html.find("input[id='mpSensorMirrorY']").on('change', event =>              { sendWS({ir:{mirrorY:event.target.checked ? '1' : '0'}}); })
        html.find("input[id='mpSensorRotate']").on('change', event =>               { sendWS({ir:{rotation:event.target.checked ? '1' : '0'}}); })

        html.find("input[id='mpSensorOffsetX']").on('change', event =>              { sendWS({ir:{offsetX:event.target.value}}); })
        html.find("input[id='mpSensorOffsetXNumber']").on('change', event =>        { sendWS({ir:{offsetX:event.target.value}}); })

        html.find("input[id='mpSensorOffsetY']").on('change', event =>              { sendWS({ir:{offsetY:event.target.value}}); })
        html.find("input[id='mpSensorOffsetYNumber']").on('change', event =>        { sendWS({ir:{offsetY:event.target.value}}); })

        html.find("input[id='mpSensorScaleX']").on('change', event =>               { sendWS({ir:{scaleX:event.target.value}}); })
        html.find("input[id='mpSensorScaleXNumber']").on('change', event =>         { sendWS({ir:{scaleX:event.target.value}}); })

        html.find("input[id='mpSensorScaleY']").on('change', event =>               { sendWS({ir:{scaleY:event.target.value}}); })
        html.find("input[id='mpSensorScaleYNumber']").on('change', event =>         { sendWS({ir:{scaleY:event.target.value}}); })

        html.find("input[id='mpSensorCalEn']").on('change', event =>                { sendWS({ir:{calibration:event.target.checked ? '1' : '0'}}); })
        html.find("input[id='mpSensorOffsetEn']").on('change', event =>             { sendWS({ir:{offsetCalibration:event.target.checked ? '1' : '0'}}); })
        html.find("button[id=mpRestartSensor]").on('click', event =>                { sendWS({event:"restart"}); })
        html.find("button[id='mpConfigPerformCal']").on('click', event =>           { sendWS({event:"calibration", state:"init"}); })

        // --- Downloads ---
        html.find("button[id='mpConfigRefresh']").on('click', event =>           {
            document.getElementById('mpConfigMasterModuleVersion').innerHTML = '';
            document.getElementById('mpConfigMasterFwVersion').innerHTML = '';
            document.getElementById('mpConfigMasterBaseVersion').innerHTML = '';
            document.getElementById('mpConfigMasterPenVersion').innerHTML = '';
            document.getElementById('mpConfigMasterMsVersion').innerHTML = '';
            setTimeout(() => {
                checkForUpdate('Module');
                checkForUpdate('SensorFirmware');
                checkForUpdate('SensorWebserver');
                checkForUpdate('MaterialCompanion');
                checkForUpdate('Base');
                checkForUpdate('Pen');
            },100)
            
        });
        html.find("button[id='mpConfigDownloadFw']").on('click', event =>           {
            this.downloadFile('SensorFirmware',document.getElementById('mpConfigFwVer').value);
        });
        html.find("button[id='mpConfigDownloadSWs']").on('click', event =>           {
            this.downloadFile('SensorWebserver');
        });
        html.find("button[id='mpConfigDownloadBaseFw']").on('click', event =>           {
            this.downloadFile('Base');
        });
        html.find("button[id='mpConfigDownloadPenFw']").on('click', event =>           {
            this.downloadFile('Pen');
        });
        html.find("button[id='mpConfigDownloadMs']").on('click', event =>           {
            this.downloadFile('MaterialCompanion', document.getElementById('mpConfigOS').value);
        });
    }

    downloadFile(target, variant = null) {

        const url = urls.find(u => u.target == target).url;
        let parent = this;
        $.getJSON(url).done(function(releases) {
            let url;
            releases = releases.filter(r => r.prerelease == false);
            if (target == 'SensorFirmware') releases = releases.filter(r => r.tag_name.includes('irmware'));
            else if (target == 'SensorWebserver') releases = releases.filter(r => r.tag_name.includes('ebserver'));

            if (releases.length == 0) {
                ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.FileNotFound"));
                return;
            }

            if (variant == 'source') {
                parent.downloadURI(releases[0].zipball_url)
                return;
            }

            let assets = releases[0].assets;

            if (target == 'SensorFirmware') {
                assets = assets.filter(a => a.name.includes('zip') && a.name.includes(variant))
            }
            else if (target == 'MaterialCompanion') {
                assets = assets.filter(a => a.name.includes(variant))
            }

            if (assets.length > 0) parent.downloadURI(assets[0].browser_download_url)
            else ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.FileNotFound"));
        });
        
    }

    async setSettings(settingId,val,refresh=false) {
        const sett = game.settings.settings.get(`${moduleName}.${settingId}`);
        if (sett.scope == 'client' || game.user.isGM)
            return await game.settings.set(moduleName,settingId,val);
        else {
            const payload = {
                msgType: "setSettings",
                settingId,
                value: val
            }
            game.socket.emit(`module.MaterialPlane`, payload);
        }
    }

    buildPenTable() {
        const penMacros = game.settings.get(moduleName,'penMacros')
        let html = '';
        for (let i=0; i<penMacros.length; i++) {
            const pen = penMacros[i];
            const color = pen.penId == lastBaseAddress ? "green" : "";
            
            const buttonSelector = `
                <select name="mpPenButtonSelect" id="mpPenButtonSelect-${i}" style="width:6%; max-width:6%; margin-right:0.5%">
                    <option value="penA" ${pen.button == 'penA' ? 'selected' : ''}>A</option>
                    <option value="penB" ${pen.button == 'penB' ? 'selected' : ''}>B</option>
                    <option value="penC" ${pen.button == 'penC' ? 'selected' : ''}>C</option>
                    <option value="penD" ${pen.button == 'penD' ? 'selected' : ''}>D</option>
                </select>
            `;

            const modeSelector = `
                <select name="mpPenButtonMode" id="mpPenButtonMode-${i}" style="width:12.5%; min-width:12.5%; margin-right:0.5%">
                    <option value="click" ${pen.mode == 'click' ? 'selected' : ''}>${game.i18n.localize("MaterialPlane.Config.PenMode_Press")}</option>
                    <option value="hold" ${pen.mode == 'hold' ? 'selected' : ''}>${game.i18n.localize("MaterialPlane.Config.PenMode_Hold")}</option>
                    <option value="release" ${pen.mode == 'release' ? 'selected' : ''}>${game.i18n.localize("MaterialPlane.Config.PenMode_Release")}</option>
                </select>
            `;

            let mSelector = `<select name="mpPenMSelect" id="mpPenMSelect-${i}" style="width:10%; max-width:10%; margin-right:0.5%">`;
            for (let i=1; i<9; i++) {
                 const selected = pen.m == i ? 'selected' : '';
                 mSelector += `<option value=${i} ${selected}>M${i}</option>`
             }
             mSelector += `</select>`;

            let macroSelector = `<select name="mpPenMacroSelect" id="mpPenMacroSelect-${i}" style="width:22.5%; max-width:22.5%; margin-right:0.5%"><option value=""></option>`;
            for (let macro of game.macros.contents) {
                const selected = macro.id === pen.macro ? 'selected' : '';
                macroSelector += `<option value=${macro.id} ${selected}>${macro.name}</option>`
            }
            macroSelector += `</select>`;

            html += `
            <div style="display:flex; width:100%">
                ${mSelector}
                <input type="number"  name="mpPenId" style="width:8.5%; min-width:8.5%; margin-right:0.5%;color:${color}" id="mpPenId-${i}" ${pen.penId != '' ? `value=${pen.penId}` : `placeholder=${game.i18n.localize("MaterialPlane.Config.Any")}`} >
                ${buttonSelector}
                ${modeSelector}
                ${macroSelector}
                <input type="text" name="mpPenArgs" id="mpPenArgs-${i}" value="${pen.args}" style="width:22.5%; max-width:22.5%; margin-right:0.5%">
                <button type="button" name="mpSetPenIdBtn" style="width:5%; margin-right:1.5%" id="mpSetPenIdBtn-${i}"><i class="fas fa-fingerprint"></i></button>
                <button type="button" name="mpDeletePenBtn" style="width:5%" id="mpDeletePenBtn-${i}"><i class="fas fa-trash"></i></button>
            </div>
            `;

            
        }

        const tableElement = document.getElementById('mpPenList');
        tableElement.innerHTML = html;

        for (let elmnt of document.getElementsByName('mpPenMSelect')) elmnt.addEventListener('change', event => {this.setPenMacroSetting()});
        for (let elmnt of document.getElementsByName('mpPenButtonSelect')) elmnt.addEventListener('change', event => {this.setPenMacroSetting()});
        for (let elmnt of document.getElementsByName('mpPenButtonMode')) elmnt.addEventListener('change', event => {this.setPenMacroSetting()});
        for (let elmnt of document.getElementsByName('mpPenMacroSelect')) elmnt.addEventListener('change', event => {this.setPenMacroSetting()});
        for (let elmnt of document.getElementsByName('mpPenArgs')) elmnt.addEventListener('change', event => {this.setPenMacroSetting()});

        for (let elmnt of document.getElementsByName('mpPenId')) elmnt.addEventListener('change', event => {
            const target = (event.target.id ? event.target.id : event.target.parentElement.id);
            if (document.getElementById(target).value == '') document.getElementById(target).placeholder = game.i18n.localize("MaterialPlane.Config.Any");
            this.setPenMacroSetting()
        });

        for (let elmnt of document.getElementsByName('mpDeletePenBtn')) elmnt.addEventListener('click', async event => {
            const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpDeletePenBtn-', '');
            let sett = await game.settings.get(moduleName,'penMacros');
            sett.splice(targetId,1)
            await this.setSettings('penMacros',sett);
            this.buildPenTable();
        });

        for (let elmnt of document.getElementsByName('mpSetPenIdBtn')) elmnt.addEventListener('click', event => {
            if (lastBaseAddress == undefined || lastBaseAddress == 0) return;
            const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpSetPenIdBtn-', '');
            document.getElementById(`mpPenId-${targetId}`).value = lastBaseAddress;
            this.setPenMacroSetting()
        });
    }

    setPenMacroSetting() {
        let arr = [];
        for (let elmnt of document.getElementsByName('mpPenMSelect')) {
            const id = elmnt.id.replace('mpPenMSelect-', '');
            arr.push({
                penId: document.getElementById(`mpPenId-${id}`).value,
                m: elmnt.value,
                button: document.getElementById(`mpPenButtonSelect-${id}`).value,
                mode: document.getElementById(`mpPenButtonMode-${id}`).value,
                macro: document.getElementById(`mpPenMacroSelect-${id}`).value,
                args: document.getElementById(`mpPenArgs-${id}`).value,
            })
        }
        this.setSettings('penMacros',arr);
    }

    /**
     * Build the table for the base data
     */
    buildBaseTable() {
        let html = '';
        for (let i=0; i<this.baseSettings.length; i++) {
            const base = this.baseSettings[i];
            const linkActor = base.linkActor ? "checked" : "";
            const tokenName = base.linkActor ? 'any' : base.tokenName;
            const sceneName = base.linkActor ? 'any' : base.sceneName;
            const color = base.baseId === lastBaseAddress ? "green" : "";
            const disable = linkActor ? "disabled" : "";

            html += `
            <div style="display:flex; width:100%">
                <input type="number"  name="mpBaseId" style="width:8.5%; margin-right:0.5%;color:${color}" id="mpBaseId-${i}" value=${base.baseId}>
                <input type="text" name="mpTokenName" style="width:19.5%; margin-right:0.5%" id="mpTokenName-${i}" value="${tokenName}" ${disable}>
                <input type="text" name="mpSceneName" style="width:19.5%; margin-right:0.5%" id="mpSceneName-${i}" value="${sceneName}" ${disable}>
                <input type="text" name="mpActorName" style="width:19.5%; margin-right:2.5%" id="mpActorName-${i}" value="${base.actorName}">
                <input type="checkbox" name="mpLinkActorCb" style="margin-right: 3%" id="mpLinkActorCb-${i}" ${linkActor}>
                <button type="button" name="mpSetBaseIdBtn" style="width:5%; margin-right:1.5%" id="mpSetBaseIdBtn-${i}"><i class="fas fa-fingerprint"></i></button>
                <button type="button" name="mpSetBaseDataBtn" style="width:5%; margin-right:1.5%" id="mpSetBaseDataBtn-${i}"><i class="fas fa-table"></i></button>
                <button type="button" name="mpDeleteBaseBtn" style="width:5%" id="mpDeleteBaseBtn-${i}"><i class="fas fa-trash"></i></button>
            </div>
            `
        }
       
        const tableElement = document.getElementById('mpBaseList');
        tableElement.innerHTML = html;

        for (let elmnt of document.getElementsByName('mpBaseId')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpBaseId-', '');
                this.baseSettings[targetId].baseId = event.target.value;
                this.setSettings('baseSetup',this.baseSettings);
            })
        for (let elmnt of document.getElementsByName('mpTokenName')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpTokenName-', '');
                this.baseSettings[targetId].tokenName = event.target.value;
                this.setSettings('baseSetup',this.baseSettings);
            })
        for (let elmnt of document.getElementsByName('mpSceneName')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpSceneName-', '');
                this.baseSettings[targetId].sceneName = event.target.value;
                this.setSettings('baseSetup',this.baseSettings);
            })
        for (let elmnt of document.getElementsByName('mpActorName')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpActorName-', '');
                this.baseSettings[targetId].actorName = event.target.value;
                this.setSettings('baseSetup',this.baseSettings);
            })
        for (let elmnt of document.getElementsByName('mpLinkActorCb')) 
            elmnt.addEventListener('change', async event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpLinkActorCb-', '');
                this.baseSettings[targetId].linkActor = event.target.checked;
                await this.setSettings('baseSetup',this.baseSettings);
                this.buildBaseTable();
            })
        for (let elmnt of document.getElementsByName('mpSetBaseIdBtn')) 
            elmnt.addEventListener('click', async event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpSetBaseIdBtn-', '');
                this.baseSettings[targetId].baseId = document.getElementById('mpLastBaseAddress').value;
                await this.setSettings('baseSetup',this.baseSettings);
                this.buildBaseTable();
            })
        for (let elmnt of document.getElementsByName('mpSetBaseDataBtn')) 
            elmnt.addEventListener('click', async event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpSetBaseDataBtn-', '');
                this.baseSettings[targetId].tokenName = document.getElementById('mpLastTokenName').value;
                this.baseSettings[targetId].sceneName = document.getElementById('mpLastTokenSceneName').value;
                this.baseSettings[targetId].actorName = document.getElementById('mpLastTokenActorName').value;
                await this.setSettings('baseSetup',this.baseSettings);
                this.buildBaseTable();
            })
        for (let elmnt of document.getElementsByName('mpDeleteBaseBtn')) 
            elmnt.addEventListener('click', async event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpDeleteBaseBtn-', '');
                this.baseSettings.splice(targetId,1)
                await this.setSettings('baseSetup',this.baseSettings);
                this.buildBaseTable();
            })
    }

    /**
     * Build the table for the remote control
     */
    buildRcTable() {
        let html = '';

        for (let i=0; i<this.irCodes.length; i++) {
            const code = this.irCodes[i];

            html += `
            <div style="display:flex; width:100%">
                <input type="text"  name="mpIrName" style="width:24.5%; margin-right:0.5%" id="mpIrName-${i}" value="${code.name}">
                <input type="text" name="mpIrProtocol" style="width:12%; margin-right:0.5%" id="mpIrProtocol-${i}" value="${code.protocol}">
                <input type="number" name="mpIrCode" style="width:14.5%; margin-right:0.5%" id="mpIrCode-${i}" value="${code.code}">
                <select name="mpIrMacro" style="width:14.5%; margin-right:0.5%" id="mpIrMacro-${i}">
                    <option value="">${game.i18n.localize("MaterialPlane.Config.None")}</option>
            `;
                
            for (let macro of game.macros) {
                const selected = macro.id === code.macro ? 'selected' : '';
                html += `<option value="${macro.id}" ${selected}>${macro.name}</option>`;
            }

            html += `
                </select>
                <input type="text" name="mpIrArgument" style="width:12%; margin-right:0.5%" id="mpIrArgument-${i}" value="${code.argument}">
                <input type="number" name="mpIrDelay" style="width:7%; margin-right:0.5%" id="mpIrDelay-${i}" value="${code.delay}">
                <button type="button" name="mpIrSetDataBtn" style="width:5%; margin-right:0.5%" id="mpIrSetDataBtn-${i}"><i class="fas fa-table"></i></button>
                <button type="button" name="mpIrDeleteBtn" style="width:5%" id="mpIrDeleteBtn-${i}"><i class="fas fa-trash"></i></button>
            </div>
            `
        }

        const tableElement = document.getElementById('mpRemoteList');
        tableElement.innerHTML = html;

        for (let elmnt of document.getElementsByName('mpIrName')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpIrName-', '');
                this.irCodes[targetId].name = event.target.value;
                this.setSettings('remoteSetup',this.irCodes);
            })
        for (let elmnt of document.getElementsByName('mpIrProtocol')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpIrProtocol-', '');
                this.irCodes[targetId].protocol = event.target.value;
                this.setSettings('remoteSetup',this.irCodes);
            })
        for (let elmnt of document.getElementsByName('mpIrCode')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpIrCode-', '');
                this.irCodes[targetId].code = event.target.value;
                this.setSettings('remoteSetup',this.irCodes);
            })
        for (let elmnt of document.getElementsByName('mpIrMacro')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpIrMacro-', '');
                this.irCodes[targetId].macro = event.target.value;
                this.setSettings('remoteSetup',this.irCodes);
            })
        for (let elmnt of document.getElementsByName('mpIrArgument')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpIrArgument-', '');
                this.irCodes[targetId].argument = event.target.value;
                this.setSettings('remoteSetup',this.irCodes);
            })
        for (let elmnt of document.getElementsByName('mpIrDelay')) 
            elmnt.addEventListener('change', event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpIrDelay-', '');
                this.irCodes[targetId].delay = event.target.value;
                this.setSettings('remoteSetup',this.irCodes);
            })
        for (let elmnt of document.getElementsByName('mpIrSetDataBtn')) 
            elmnt.addEventListener('click', async event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpIrSetDataBtn-', '');
                this.irCodes[targetId].protocol = document.getElementById('mpLastIrProtocol').value;
                this.irCodes[targetId].code = document.getElementById('mpLastIrCode').value;
                await this.setSettings('remoteSetup',this.irCodes);
                this.buildRcTable();
            })
        for (let elmnt of document.getElementsByName('mpIrDeleteBtn')) 
            elmnt.addEventListener('click', async event => {
                const targetId = (event.target.id ? event.target.id : event.target.parentElement.id).replace('mpIrDeleteBtn-', '');
                this.irCodes.splice(targetId,1)
                await this.setSettings('remoteSetup',this.irCodes);
                this.buildRcTable();
            })
    }

    /**
     * Constrain a value within a range
     * @param {number} val value to constrain
     * @param {object} range range to constrain within, must contain 'min' and 'max' values
     * @returns the constrained value
     */
    constrain(val,range) {
        if (val < range.min) return range.min;
        if (val > range.max) return range.max;
        else return val;
    }

    pointColors = ['#FF0000', '#00AD00', '#0000FF', '#FFFF00', '#FF00FF', '#7F00FF', '#007FFF', '#FF7F00', '#000000']

    /**
     * Update the points in the 'Sensor' section
     * @param {*} data 
     * @returns 
     */
    updateIrPoint(data, newPoint) {
        if (newPoint.number > 3) return;
        document.getElementById("mpCoordsBaseId").innerHTML=data.id;
        document.getElementById("mpCoordsBaseCmd").innerHTML=data.command;
        document.getElementById("mpCoordsBaseBat").innerHTML=`${data.battery}%`;

        let point = {
            x: newPoint.x,
            y: newPoint.y,
            avgBrightness: newPoint.avgBrightness,
            maxBrightness: newPoint.maxBrightness,
            area: newPoint.area,
            number: newPoint.number
        }
        if (newPoint == undefined || isNaN(newPoint.x)  || isNaN(newPoint.y) || newPoint.x == -9999 || newPoint.y == -9999) {
            point.x = 0;
            point.y = 0;
            point.avgBrightness = 0;
            point.maxBrightness = 0;
            point.area = 0;
        }

        document.getElementById("mpCoordsX-"+point.number).innerHTML = Math.round(point.x);
        document.getElementById("mpCoordsY-"+point.number).innerHTML = Math.round(point.y);
        document.getElementById("mpCoordsAvgBrightness-"+point.number).innerHTML = Math.round(point.avgBrightness);
        document.getElementById("mpCoordsMaxBrightness-"+point.number).innerHTML = Math.round(point.maxBrightness);
        document.getElementById("mpCoordsArea-"+point.number).innerHTML = Math.round(point.area);

        let color = "black";
        if (point.x < 0 || point.x > 4096 || point.y < 0 || point.y > 4096) color = "red";
        if (point.maxBrightness == 0) color = "grey";

        document.getElementById("mpCoordsPoint-"+point.number).style.color = (point.maxBrightness == 0) ? 'grey' : this.pointColors[point.number];
        document.getElementById("mpCoordsX-"+point.number).style.color = color;
        document.getElementById("mpCoordsY-"+point.number).style.color = color;
        document.getElementById("mpCoordsAvgBrightness-"+point.number).style.color = color;
        document.getElementById("mpCoordsMaxBrightness-"+point.number).style.color = color;
        document.getElementById("mpCoordsArea-"+point.number).style.color = color;
    }

    /**
     * Draw points on the canvas in the 'Sensor' section
     * @param {} data 
     */
    drawIrCoordinates(data) {
        var stage = document.getElementById('mpConfigCoordinatesStage');
        if(stage.getContext) {
            var ctx = stage.getContext('2d');
        }

        ctx.clearRect(0, 0, stage.width, stage.height);
        for (let point of data.irPoints) {
            this.updateIrPoint(data, point);
            if (point == undefined || point.x == undefined) continue;
            if (point.x > 0 && point.y < 4096) {
                const x = point.x/4096*stage.width;
                const y = point.y/4096*stage.height;
                ctx.fillStyle = this.pointColors[point.number];
                ctx.beginPath();
                ctx.arc(x,y,3,0,2*Math.PI,false);
                ctx.fill();
                ctx.fillText(point.number, x + 5, y + 10);
            }
        }
    }

    /**
     * Set the sensor settings
     * @param {*} settings 
     */
    setIrSettings(settings) {
        this.sensorSettings = settings;
        if (this.configOpen && document.getElementById("mpSensorUpdateRate") != null) {
            document.getElementById("mpSensorUpdateRate").value=settings.updateRate;
            document.getElementById("mpSensorUpdateRateNumber").value=settings.updateRate;

            
            document.getElementById("mpSensorBrightness").value=settings.brightness;
            document.getElementById("mpSensorBrightnessNumber").value=settings.brightness;

            document.getElementById("mpSensorMinBrightness").value=settings.minBrightness;
            document.getElementById("mpSensorMinBrightnessNumber").value=settings.minBrightness;

            document.getElementById("mpSensorAverage").value=settings.average;
            document.getElementById("mpSensorAverageNumber").value=settings.average;

            document.getElementById("mpSensorMirrorX").checked=settings.mirrorX;
            document.getElementById("mpSensorMirrorY").checked=settings.mirrorY;
            document.getElementById("mpSensorRotate").checked=settings.rotation;
            document.getElementById("mpSensorOffsetX").value=settings.offsetX;
            document.getElementById("mpSensorOffsetXNumber").value=settings.offsetX;
            document.getElementById("mpSensorOffsetY").value=settings.offsetY;
            document.getElementById("mpSensorOffsetYNumber").value=settings.offsetY;
            document.getElementById("mpSensorScaleX").value=settings.scaleX;
            document.getElementById("mpSensorScaleXNumber").value=settings.scaleX;
            document.getElementById("mpSensorScaleY").value=settings.scaleY;
            document.getElementById("mpSensorScaleYNumber").value=settings.scaleY;
            document.getElementById("mpSensorCalEn").checked=settings.calibrationEnable;
            document.getElementById("mpSensorOffsetEn").checked=settings.offsetEnable;
        }
    }

    downloadURI(uri, name) {
        var link = document.createElement("a");
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    
}