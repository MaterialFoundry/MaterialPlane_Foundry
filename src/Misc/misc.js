import { compatibilityHandler } from "./compatibilityHandler.js";

let debugSettings = {
  wsRaw: false,
  ws: false,
  touchDetect: false,
  tapDetect: false,
  nearestToken: false,
  updateMovement: false,
  moveToken: false,
  dropToken: false,
  baseData: false,
  cal: false,
  ruler: false
};

let batteryNotificationTimer = 0;

export function hideElement(id) {
  const elmnt = document.getElementById(id);
  if (elmnt) elmnt.style.display = 'none';
}

export function showElement(id) {
  const elmnt = document.getElementById(id);
  if (elmnt) elmnt.style.display = '';
}

export function setSelectElement(id, value) {
  if (value == undefined) return;
  const elmnt = document.getElementById(id);
  if (elmnt) elmnt.value = value;
}

export function roundFloat(num, significance) {
  const multiplier = Math.pow(10, significance);
  return Math.round(multiplier*num)/multiplier;
}

export function activateControl(controlName) {
  if (compatibilityHandler.controls.activeControl() == controlName) return;
  compatibilityHandler.controls.activateControl(controlName);
}

export function updatePowerState(data) {
  let battery = data.percentage;
  let batteryColor = "#FFFFFF";

  if (battery < 20 && data.chargerStatus != "Charging" && Date.now() - batteryNotificationTimer >= 60000) {
    batteryNotificationTimer = Date.now();
    ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.BatteryLowSensor"));
  }

  if (battery > 100) battery = 100;
  if (battery < 0) battery = 0;
  let icon;

  if (data.chargerStatus == "Charging") {
    icon = 'fas fa-battery-bolt';
    batteryColor = "#00FF00"; 
  }
  else if (battery >= 80) {
      icon = 'fas fa-battery-full';
      batteryColor = "#00FF00";
  }
  else if (battery >= 60 && battery < 80) {
      icon = 'fas fa-battery-three-quarters';
      batteryColor = "#B9FF00";
  }
  else if (battery >= 40 && battery < 60) {
      icon = 'fas fa-battery-half';
      batteryColor = "#F0FF00";
  }
  else if (battery >= 20 && battery < 40) {
      icon = 'fas fa-battery-quarter';
      batteryColor = "#FF9000";
  }
  else if (battery < 20) {
      icon = 'fas fa-battery-empty';
      batteryColor = "#FF0000";
  }
  
  const playersElement = compatibilityHandler.playersElement();
  if (playersElement && document.getElementById("batteryLabel") == null) {
      
      let batteryIcon = document.createElement("i");
      batteryIcon.id = "batteryIcon";
      batteryIcon.style.fontSize = "0.75em";
      let batteryLabel = document.createElement("bat");
      batteryLabel.id = "batteryLabel";
      batteryLabel.style.fontSize = "0.8em";

      playersElement.after(batteryLabel);
      playersElement.after(batteryIcon);
  }
  
  if (playersElement) {
    document.getElementById("batteryLabel").innerHTML = `${battery}%`;
    document.getElementById("batteryIcon").className = icon; 
    document.getElementById("batteryIcon").style.color = batteryColor;
  }
  
}

export function configureDebug(data) {
  for (const [key,value] of Object.entries(data)) {
    debugSettings[key] = value;
  }
  console.log(`MP Debug - Configured to`,debugSettings)
}

export function debug(type, message) {
  if (debugSettings?.[type]) console.log(`MP Debug - ${type} - `, message)
}

export function compareVersions(checkedVersion, requiredVersion) {
  requiredVersion = requiredVersion.split(".");
  checkedVersion = checkedVersion.split(".");
  
  for (let i=0; i<3; i++) {
    requiredVersion[i] = isNaN(parseInt(requiredVersion[i])) ? 0 : parseInt(requiredVersion[i]);
    checkedVersion[i] = isNaN(parseInt(checkedVersion[i])) ? 0 : parseInt(checkedVersion[i]);
  }
  
  if (checkedVersion[0] > requiredVersion[0]) return false;
  if (checkedVersion[0] < requiredVersion[0]) return true;
  if (checkedVersion[1] > requiredVersion[1]) return false;
  if (checkedVersion[1] < requiredVersion[1]) return true;
  if (checkedVersion[2] > requiredVersion[2]) return false;
  return true;
}

export function compatibleCore(compatibleVersion){
  const split = compatibleVersion.split(".");
  if (split.length == 1) compatibleVersion = `${compatibleVersion}.0`;
  let coreVersion = game.version;
  return compareVersions(compatibleVersion, coreVersion);
}

export function generateId(){
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < 16; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export class MovingAverage {
  val = [];
  count = 0;
  size = 10;
  complete=false;

  constructor(size = 10) {
    this.size = size;
  }

  reset() {
    this.count = 0;
    this.complete = false;
  }

  newValue(val) {
    this.val[this.count] = val;
    this.count++;
    if (this.count > this.size) {
      this.count -= this.size + 1;
      this.complete = true;
    }

    let newVal = 0;
    const len = this.complete ? this.size : this.count;
    for (let i=0; i<len; i++) {
      newVal += this.val[i];
    }

    return newVal/len
  }
}

export function registerLayer() {
  const layers =  {
    materialPlane: {
          layerClass: MaterialPlaneLayer,
          group: "primary"
      }
  }

  CONFIG.Canvas.layers = foundry.utils.mergeObject(Canvas.layers, layers);

  if (!Object.is(Canvas.layers, CONFIG.Canvas.layers)) {
    const layers = Canvas.layers;
    Object.defineProperty(Canvas, 'layers', {
      get: function () {
        return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers)
      }
    })
  }
}

export class MaterialPlaneLayer extends CanvasLayer {
  constructor() {
    super();
  }

  /** @override */
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, { zIndex: 20000 });
  }

  activate() {
    CanvasLayer.prototype.activate.apply(this);
    this.zIndex = 10000;
    this._zIndex = 10000;
    return this;
  }

  deactivate() {
    CanvasLayer.prototype.deactivate.apply(this);
    return this;
  }

  async _draw() {}

  async draw() {
    super.draw();
  }
}

