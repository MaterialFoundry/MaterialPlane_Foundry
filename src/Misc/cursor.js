import { moduleName } from "../../MaterialPlane.js";
import { MaterialPlaneLayer } from "./misc.js";

export class Cursor extends MaterialPlaneLayer {
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
  
        const pointerSize = 20*game.settings.get(moduleName,'CursorSize')/canvas.scene._viewPosition.scale;
        
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
  
          icon.width = pointerSize;
          icon.height = pointerSize;
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