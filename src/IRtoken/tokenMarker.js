import { MaterialPlaneLayer } from "../Misc/misc.js";

/**
 * Draws a rectangle to indicate where a token would land if released
 */
export class TokenMarker extends MaterialPlaneLayer {
    constructor() {
        super();
        this.init();
    }
  
    init() {
        this.container = new PIXI.Container();
        this.addChild(this.container);
    }
  
    async _draw() {}

    async draw() {
      super.draw();
    }
  
    /*
     * Update the marker position, size and color
     */
    updateMarker(data) {
        const x = data.x - 0.5*data.gridSize;
        const y = data.y - 0.5*data.gridSize;
        
        this.container.removeChildren();
        
        var drawing = new PIXI.Graphics();
        drawing.lineStyle(2, data.color, 1);
        drawing.drawRect(0,0,data.width*data.gridSize,data.height*data.gridSize);
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