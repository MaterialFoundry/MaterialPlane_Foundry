
import { moduleName, hwFirmware, msVersion } from "../../MaterialPlane.js";

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
  cal: false
};

export function activateControl(controlName) {
  if (ui.controls.activeControl == controlName) return;
  const control = ui.controls.controls.find(c => c.name == controlName);
  ui.controls.initialize({layer:control.layer});
  canvas.layers.find(l => l.options.name == control.layer).activate();
  ui.controls.render(); 
}

export function updatePowerState(data) {
  let battery = data.percentage;
  let batteryColor = "#FFFFFF";
  const chargingState = data.chargingState;

  if (battery > 100) battery = 100;
  if (battery < 0) battery = 0;
  let icon;

  if (battery >= 80) {
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

  if (chargingState == 1) {   //charging
      icon = 'fas fa-battery-bolt';
  }
  
  if (document.getElementById("batteryLabel") == null) {
      const playersElement = document.getElementsByClassName("players-mode")[0];
      let batteryIcon = document.createElement("i");
      batteryIcon.id = "batteryIcon";
      batteryIcon.style.fontSize = "0.75em";
      let batteryLabel = document.createElement("bat");
      batteryLabel.id = "batteryLabel";
      batteryLabel.style.fontSize = "0.8em";

      playersElement.after(batteryLabel);
      playersElement.after(batteryIcon);
  }
  
  document.getElementById("batteryLabel").innerHTML = `${battery}%`;
  document.getElementById("batteryIcon").className = icon; 
  document.getElementById("batteryIcon").style.color = batteryColor;
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
  if (split.length == 2) compatibleVersion = `0.${compatibleVersion}`;
  let coreVersion = game.version == undefined ? game.data.version : `0.${game.version}`;
  return compareVersions(compatibleVersion, coreVersion);
}

/**
     * Scales the coordinates received from the IR sensor so they correspond with the in-game coordinate system
     * 
     * @param {*} coords Measured coordinates
     * @param {*} cornerComp Compensates for the difference between measured coordinates and token coordinates
     * @return {*} Scaled coordinates
     */
export function scaleIRinput(coords){
  if (coords.x < 0) coords.x = 0;
  if (coords.x > 4095) coords.x = 4095;
  if (coords.y < 0) coords.y = 0;
  if (coords.y > 4095) coords.y = 4095;

  //Calculate the amount of pixels that are visible on the screen
  const horVisible = screen.width/canvas.scene._viewPosition.scale;
  const vertVisible = screen.height/canvas.scene._viewPosition.scale;

  //Calculate the scaled coordinates
  const posX = (coords.x/4096)*horVisible+canvas.scene._viewPosition.x-horVisible/2;
  const posY = (coords.y/4096)*vertVisible+canvas.scene._viewPosition.y-vertVisible/2;

  debug('cal',`Raw: (${Math.round(coords.x)}, ${Math.round(coords.y)}). Scaled: (${Math.round(posX)}, ${Math.round(posY)}). View: (${Math.round(canvas.scene._viewPosition.x)}, ${Math.round(canvas.scene._viewPosition.y)}, ${canvas.scene._viewPosition.scale}). Canvas: ${canvas.dimensions.width}x${canvas.dimensions.height} (${canvas.dimensions.rect.x}, ${canvas.dimensions.rect.y}). Scene: ${canvas.dimensions.sceneWidth}x${canvas.dimensions.sceneHeight} (${canvas.dimensions.sceneRect.x}, ${canvas.dimensions.sceneRect.y}). Display: ${screen.width}x${screen.height}`)

  //Return the value
  return {"x":Math.round(posX),"y":Math.round(posY)};
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

export class MaterialPlaneLayer extends CanvasLayer {
  constructor() {
    super();
  }

  /** @override */
  static get layerOptions() {
    return mergeObject(super.layerOptions, { zIndex: 20000 });
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

  async _draw() {

  }

  async draw() {
    super.draw();
  }
}

/**
     * Find the token closest to the coordinates
     * 
     * @param {*} position Coordinates
     * @return {*} Token closest to the coordinates
     */
 export function findToken(coords, spacing, currentToken){

  if (spacing == undefined) {
    spacing = canvas.scene.grid.size;
  }

  //For all tokens on the canvas: get the distance between the token and the coordinate. Get the closest token. If the distance is smaller than the hitbox of the token, 'token' is returned
  let closestToken = undefined;
  let minDistance = 1000;
  
  for (let token of canvas.tokens.placeables){
    if (currentToken == token) continue;
    if (!token.can(game.user,"control")) {
      if (!game.settings.get(moduleName,'EnNonOwned') || !token.visible) continue;
    }

    let coordsCenter = token.getCenter(token.x,token.y); 
    const dx =  Math.abs(coordsCenter.x - coords.x + (token.document.width-1)*spacing/2);
    const dy = Math.abs(coordsCenter.y - coords.y - (token.document.height-1)*spacing/2);

    const distance = Math.sqrt( dx*dx + dy*dy );
  
    if (distance < minDistance) {
        closestToken = token;  
        minDistance = distance;
    }
  }
  if (closestToken == undefined) return undefined;
  
  debug('nearestToken',`Token: ${closestToken?.name}, Position: (${closestToken.x}, ${closestToken.y}), Distance: ${minDistance}, Min Distance: ${spacing}, Control: ${minDistance<spacing}`)

  if (minDistance < spacing) 
    return closestToken;      
  else 
    return undefined;
} 

/*
 * tokenMarker draws a rectangle at the target position for the token
 */
export class tokenMarker extends CanvasLayer {
    constructor() {
      super();
      this.init();
    }
  
    init() {
      this.container = new PIXI.Container();
      this.addChild(this.container);
    }
  
    async _draw() {

    }

    async draw() {
      super.draw();
    }
  
    /*
     * Update the marker position, size and color
     */
    updateMarker(data) {
        const width = data.width;
        const height = data.height;
        const x = data.x - Math.floor(data.width/2);
        const y = data.y - Math.floor(data.height/2);
        
    
        this.container.removeChildren();
        var drawing = new PIXI.Graphics();
        drawing.lineStyle(2, data.color, 1);
        //drawing.beginFill('#FF0000');
        drawing.drawRect(0,0,width,height);
        this.container.addChild(drawing);
      
      this.container.setTransform(x, y);
      this.container.visible = true;
    }
    
    /*
     * Hide the marker
     */
    hide() {
      this.container.visible = false;
    }
  
    /*
     * Show the marker
     */
    show() {
      this.container.visible = true;
    }
  
    /*
     * Remove the marker
     */
    remove() {
      this.container.removeChildren();
    }
  }

/*
 * 
 */
export class cursor extends MaterialPlaneLayer {
  constructor() {
    super();
    this.init();
  }

  init() {
    this.container = new PIXI.Container();
    this.addChild(this.container);
    this._zIndex=1100;
    this.zIndex=1100;
    this.container.zIndex = 1100;
    this.container._zIndex = 1100;
  }

  async draw() {
    super.draw();
  }

  /*
   * Update the cursor position, size and color
   */
  updateCursor(data) {
    const x = data.x - Math.floor(data.size/2);
    const y = data.y - Math.floor(data.size/2);

    this.container.removeChildren();

    if (data.selected != undefined && data.selected > 0) {
      //Draw pointer
      
      const pointerTexture = PIXI.Texture.from("modules/MaterialPlane/img/mouse-pointer-solid-blackBorder.png");
      const pointerIcon = new PIXI.Sprite(pointerTexture);
      pointerIcon.anchor.set(0,0);

      const pointerSize = canvas.dimensions.size/3;
      
      pointerIcon.width = pointerSize;
      pointerIcon.height = pointerSize;
      this.container.addChild(pointerIcon);

      if (data.selected != 1) {
        //Draw circle
        var circle = new PIXI.Graphics();
        circle.lineStyle(2, 0x000000, 1);
        circle.beginFill(0x222222);
        circle.drawCircle(1.25*pointerSize,1.25*pointerSize,pointerSize/1.5);
        this.container.addChild(circle);

        //Draw icon
        const texture = PIXI.Texture.from(data.icon.icon);
        const icon = new PIXI.Sprite(texture);
        icon.anchor.set(0.5);
        icon.position.set(1.25*pointerSize,1.25*pointerSize)

        icon.width = pointerSize*0.8;
        icon.height = pointerSize*0.8;
        this.container.addChild(icon); 
      }
      
    }
    else {
      var drawing = new PIXI.Graphics();
      drawing.lineStyle(1, data.color, 1);
      drawing.beginFill(data.color);
      drawing.drawCircle(0,0,data.size);
      this.container.addChild(drawing);
    }
    
    this.container.setTransform(x, y);
    this.container.visible = true;
  }
  
  /*
   * Hide the cursor
   */
  hide() {
    this.container.visible = false;
    this.visible = false;
  }

  /*
   * Show the cursor
   */
  show() {
    this.container.visible = true;
    this.visible = true;
  }

  /*
   * Remove the cursor
   */
  remove() {
    this.container.removeChildren();
  }
}