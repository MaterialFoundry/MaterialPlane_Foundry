import { moduleName } from "../../MaterialPlane.js";

export const registerSettings = function() {

    game.settings.register(moduleName, 'penOffset', {
        scope: "world",
        config: false,
        type: Object,
        default: {x: 80, y: -400},
        range: { min: -1000, max: 1000, step: 1 },
    })

    game.settings.register(moduleName,'baseSetup', {
        scope: "world",
        config: false,
        type: Array,
        default: []
    });

    game.settings.register(moduleName,'remoteSetup', {
        scope: "world",
        config: false,
        type: Array,
        default: []
    });

    /**
     * Select device
     */
     game.settings.register(moduleName,'device', {
        scope: "world",
        config: false,
        default: "sensor",
        type: String
    });

    /**
     * Tap mode
     */
    game.settings.register(moduleName,'tapMode', {
        scope: "world",
        config: false,
        default: "disable",
        type: String
    });

    /**
     * Touch timeout
     */
    game.settings.register(moduleName, 'touchTimeout', {
        default: 1000,
        type: Number,
        scope: 'world',
        range: { min: 500, max: 5000, step: 100 },
        config: false,
    });

    /**
     * Tap timeout
     */
    game.settings.register(moduleName, 'tapTimeout', {
        default: 500,
        type: Number,
        scope: 'world',
        range: { min: 100, max: 5000, step: 100 },
        config: false, 
    });

    /**
     * Ping on double tap
     */
    game.settings.register(moduleName,'tapPing', {
        scope: "world",
        config: false,
        default: true,
        type: Boolean
    });

    /**
     * Touch Scale X
     */
     game.settings.register(moduleName, 'touchScaleX', {
        default: 1,
        type: Number,
        scope: 'world',
        range: { min: 0, max: 2, step: 0.01 },
        config: false,
    });

    /**
     * Touch Scale Y
     */
     game.settings.register(moduleName, 'touchScaleY', {
        default: 1,
        type: Number,
        scope: 'world',
        range: { min: 0, max: 2, step: 0.01 },
        config: false,
    });

    /**
     * Sets the movement method
     */
    game.settings.register(moduleName,'movementMethod', {
        scope: "world",
        config: false,
        type:String,
        default:'live'
    });


    /**
     * Release the token after dropping
     */
    game.settings.register(moduleName,'deselect', {
        scope: "world",
        config: false,
        default: true,
        type: Boolean
    });

    /**
     * Draw movement marker
     */
     game.settings.register(moduleName,'movementMarker', {
        scope: "world",
        config: false,
        default: true,
        type: Boolean
    });

    /**
     * Auto rotate
     */
    game.settings.register(moduleName,'autoRotate', {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });

    /**
     * Sets if the target client is allowed to move non-owned tokens
     */
    game.settings.register(moduleName,'EnNonOwned', {
        scope: "world",
        config: false,
        default: true,
        type: Boolean
    });

    /**
     * Sets if the target client is allowed to move non-owned tokens
     */
     game.settings.register(moduleName,'collisionPrevention', {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });

    /**
     * Hides all elements on the target client, if that client is not a GM
     */
    game.settings.register(moduleName,'HideElements', {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });

    /**
     * Sets the size of the pen menu relative to the grid size
     */
    game.settings.register(moduleName, 'MenuSize', {
        default: 1,
        type: Number,
        scope: 'world',
        range: { min: 0.25, max: 2.50, step: 0.25 },
        config: false
    });

    game.settings.register(moduleName, 'CursorSize', {
        default: 1,
        type: Number,
        scope: 'world',
        range: { min: 0.25, max: 2.50, step: 0.25 },
        config: false
    });

    /**
     * Sets the active MP user
     */
    game.settings.register(moduleName,'ActiveUser', {
        scope: "world",
        config: false,
        default: "",
        type: String
    });

    /**
     * Let this client connect to the sensor
     */
     game.settings.register(moduleName,'Enable', {
        scope: "client",
        config: false,
        default: true,
        type: Boolean
    });

    /**
     * Sets the IP address and port of the sensor
     */
    game.settings.register(moduleName,'IP', {
        scope: "world",
        config: false,
        default: "materialsensor.local:3000",
        type: String
    });

    /**
     * Connection mode
     */
    game.settings.register(moduleName,'ConnectionMode', {
        scope: "client",
        config: false,
        default: "",
        type: String
    });

    game.settings.register(moduleName, 'nrOfConnAttempts', {
        default: 5,
        type: Number,
        scope: 'client',
        range: { min: 0, max: 100, step: 1 },
        config: false
        
    });

    /**
     * Use Material Server
     */
     game.settings.register(moduleName,'EnMaterialServer', {
        scope: "client",
        config: false,
        default: false,
        type: Boolean
    });

    /**
     * Sets the IP address and port of Material Server
     */
     game.settings.register(moduleName,'MaterialServerIP', {
        scope: "client",
        config: false,
        default: "localhost:3001",
        type: String
    });

    //invisible settings
    game.settings.register(moduleName,'menuOpen', {
        scope: "client",
        config: false,
        default: false,
        type: Boolean
    });

    game.settings.register(moduleName,'penMacros', {
        scope: "world",
        config: false,
        default: [],
        type: Array
    }) 

    /**
     * Token ruler settings
     */
    game.settings.register(moduleName,'tokenRuler', {
        scope: "world",
        config: false,
        default: {},
        type: Object
    })

    /**
     * Low Battery Notifications
     */
    game.settings.register(moduleName,'batteryNotifications', {
        scope: "world",
        config: false,
        default: true,
        type: Boolean
    });

    /**
     * Low Battery Notifications
     */
    game.settings.register(moduleName,'baseOrientation', {
        scope: "world",
        config: false,
        default: "0",
        type: String
    });

    //Settings migration
    if (game.settings.get(moduleName, 'ConnectionMode') == "") {
        console.log("Migrating Material Plane setting: 'Connection Mode'");
        if (!game.settings.get(moduleName, 'Enable')) game.settings.set(moduleName, 'ConnectionMode', 'noConnect')
        else if (game.settings.get(moduleName, 'EnMaterialServer')) game.settings.set(moduleName, 'ConnectionMode', 'materialCompanion')
        else game.settings.set(moduleName, 'ConnectionMode', 'direct')
    }

}

export function onHwVariantChange(variant) {
    if (document.getElementById("MaterialPlane_Config") == null || game.settings.get(moduleName,'device') == 'touch')  return;
    const elements = document.getElementsByClassName("mpProd");
    const display = variant == 'Production' ? '' : 'none';
    for (let elmnt of elements) elmnt.style.display = display;
}




