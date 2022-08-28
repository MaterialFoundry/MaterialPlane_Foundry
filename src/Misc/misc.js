
import { moduleName, hwFirmware, msVersion } from "../../MaterialPlane.js";

let debugSettings = {
  wsRaw: false,
  ws: false,
  touchDetect: false,
  tapDetect: false,
  nearestToken: false,
  updateMovement: false,
  moveToken: false,
  dropToken: false
};

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
  if (coords.x > 4093) coords.x = 4093;
  if (coords.y < 0) coords.y = 0;
  if (coords.y > 4093) coords.y = 4093;

  //Calculate the amount of pixels that are visible on the screen
  const horVisible = screen.width/canvas.scene._viewPosition.scale;
  const vertVisible = screen.height/canvas.scene._viewPosition.scale;

  //Calculate the scaled coordinates
  const posX = (coords.x/4093)*horVisible+canvas.scene._viewPosition.x-horVisible/2;
  const posY = (coords.y/4093)*vertVisible+canvas.scene._viewPosition.y-vertVisible/2;

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
  const layers =  compatibleCore("0.9") ? {
    materialPlane: {
          layerClass: MaterialPlaneLayer,
          group: "primary"
      }
  }
  : {
    materialPlane: MaterialPlaneLayer
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
    spacing = compatibleCore('10.0') ? canvas.scene.grid.size : canvas.scene.data.grid;
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
    const dx =  Math.abs(coordsCenter.x - coords.x);
    const dy = Math.abs(coordsCenter.y - coords.y);
    const distance = Math.sqrt( dx*dx + dy*dy );
  
    if (distance < minDistance) {
        closestToken = token;  
        minDistance = distance;
    }
  }

  debug('nearestToken',`Token: ${closestToken.name}, Position: (${closestToken.x}, ${closestToken.y}), Distance: ${minDistance}, Min Distance: ${spacing}, Control: ${minDistance<spacing}`)

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