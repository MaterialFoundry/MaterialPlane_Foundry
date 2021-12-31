import * as MODULE from "../../MaterialPlane.js";
import { downloadUtility } from "./misc.js";

export const registerSettings = function() {
    game.settings.register(MODULE.moduleName,'baseSetup', {
        scope: "world",
        config: false,
        type: Array,
        default: []
    });

    game.settings.register(MODULE.moduleName,'offset', {
        scope: "world",
        config: false,
        type: Object,
        default: {x:0,y:0}
    });

    /**
     * Download utility (button)
     */
    game.settings.registerMenu(MODULE.moduleName, 'downloadUtility',{
        name: "MaterialPlane.DownloadUtility.Title",
        label: "MaterialPlane.DownloadUtility.Title",
        type: downloadUtility,
        restricted: false
    });

    /**
     * Sets the movement method
     */
    game.settings.register(MODULE.moduleName,'movementMethod', {
        name: "MaterialPlane.Sett.MovementMethod",
        hint: "MaterialPlane.Sett.MovementMethod_Hint",
        scope: "world",
        config: true,
        type:Number,
        default:1,
        choices:["MaterialPlane.Sett.MovementMethod_Default","MaterialPlane.Sett.MovementMethod_Live","MaterialPlane.Sett.MovementMethod_SbS"]
    });

    /**
     * Release the token after dropping
     */
    game.settings.register(MODULE.moduleName,'deselect', {
        name: "MaterialPlane.Sett.Deselect",
        hint: "MaterialPlane.Sett.Deselect_Hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    /**
     * Draw movement marker
     */
     game.settings.register(MODULE.moduleName,'movementMarker', {
        name: "MaterialPlane.Sett.MovementMarker",
        hint: "MaterialPlane.Sett.MovementMarker_Hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    /**
     * Sets if the target client is allowed to move non-owned tokens
     */
    game.settings.register(MODULE.moduleName,'EnNonOwned', {
        name: "MaterialPlane.Sett.NonownedMovement",
        hint: "MaterialPlane.Sett.NonownedMovement_Hint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    /**
     * Hides all elements on the target client, if that client is not a GM
     */
    game.settings.register(MODULE.moduleName,'HideElements', {
        name: "MaterialPlane.Sett.HideDisplay",
        hint: "MaterialPlane.Sett.HideDisplay_Hint",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: x => window.location.reload()
    });

    game.settings.register(MODULE.moduleName, 'MenuSize', {
        name: "MaterialPlane.Sett.MenuSize",
        hint: "MaterialPlane.Sett.MenuSizeHint",
        default: 2.5,
        type: Number,
        scope: 'world',
        range: { min: 0, max: 5, step: 0.1 },
        config: true
        
    });

    
    /**
     * Sets the name of the target client (who has the TV connected)
     */
     game.settings.register(MODULE.moduleName,'TargetName', {
        name: "MaterialPlane.Sett.TargetName",
        hint: "MaterialPlane.Sett.TargetName_Hint",
        scope: "world",
        config: true,
        default: "Observer",
        type: String,
        onChange: x => window.location.reload()
    });

    /**
     * Let this client connect to the sensor
     */
     game.settings.register(MODULE.moduleName,'Enable', {
        name: "MaterialPlane.Sett.Conn",
        hint: "MaterialPlane.Sett.Conn_Hint",
        scope: "client",
        config: true,
        default: true,
        type: Boolean,
        onChange: x => window.location.reload()
    });

    /**
     * Sets the IP address and port of the sensor
     */
    game.settings.register(MODULE.moduleName,'IP', {
        name: "MaterialPlane.Sett.SensorIP",
        hint: "MaterialPlane.Sett.SensorIP_Hint",
        scope: "world",
        config: true,
        default: "materialsensor.local:3000",
        type: String,
        onChange: x => window.location.reload()
    });

    /**
     * Use Material Server
     */
     game.settings.register(MODULE.moduleName,'EnMaterialServer', {
        name: "MaterialPlane.Sett.EnMaterialServer",
        hint: "MaterialPlane.Sett.EnMaterialServer_Hint",
        scope: "client",
        config: true,
        default: false,
        type: Boolean,
        onChange: x => window.location.reload()
    });

    /**
     * Sets the IP address and port of Material Server
     */
     game.settings.register(MODULE.moduleName,'MaterialServerIP', {
        name: "MaterialPlane.Sett.MaterialServerIP",
        hint: "MaterialPlane.Sett.MaterialServerIP_Hint",
        scope: "client",
        config: true,
        default: "localhost:3001",
        type: String,
        onChange: x => window.location.reload()
    });

    //invisible settings
    game.settings.register(MODULE.moduleName,'menuOpen', {
        name: "Menu Open",
        hint: "Menu open on GM side",
        scope: "client",
        config: false,
        default: false,
        type: Boolean
    });


}

