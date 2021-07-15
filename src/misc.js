
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
  return {"x":posX,"y":posY};
}

export function registerLayer() {

  CONFIG.Canvas.layers = foundry.utils.mergeObject(CONFIG.Canvas.layers, {
    materialPlane: MaterialPlaneLayer
  });

  // overriding other modules if needed
  if (!Object.is(Canvas.layers, CONFIG.Canvas.layers)) {
    console.error('Possible incomplete layer injection by other module detected!')

    const layers = Canvas.layers
    Object.defineProperty(Canvas, 'layers', {
      get: function () {
        return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers)
      }
    })
  }
  
}

class MaterialPlaneLayer extends CanvasLayer {
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
 export function findToken(coords){
        
  //Get the gridsize in on-screen pixels
  let gridsize = canvas.scene.data.grid*canvas.scene._viewPosition.scale;

  //For all tokens on the canvas: get the distance between the token and the coordinate. Get the closest token. If the distance is smaller than the hitbox of the token, 'token' is returned
  let closestToken = undefined;
  let minDistance = 1000;
  
  for (let token of canvas.tokens.children[0].children){
      let coordsCenter = token.getCenter(token.x,token.y); 
      const dx =  Math.abs(coordsCenter.x - coords.x);
      const dy = Math.abs(coordsCenter.y - coords.y);
      const distance = Math.sqrt( dx*dx + dy*dy );
      if (distance < minDistance) {
          closestToken = token;  
          minDistance = distance;
      }
  }
  
  if (minDistance < canvas.scene.data.grid*1) return closestToken;      
  else return undefined;
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
      //Draw icon
      const texture = PIXI.Texture.from(data.icon.icon);
      const icon = new PIXI.Sprite(texture);
      icon.anchor.set(data.icon.anchor.x,data.icon.anchor.y);
      
      icon.width = 25;
      icon.height = 25;
      this.container.addChild(icon); 
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
  }

  /*
   * Show the cursor
   */
  show() {
    this.container.visible = true;
  }

  /*
   * Remove the cursor
   */
  remove() {
    this.container.removeChildren();
  }
}