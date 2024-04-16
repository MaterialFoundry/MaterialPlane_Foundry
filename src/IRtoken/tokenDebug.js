export class TokenDebug extends CanvasLayer {
    enabled = false;

    gridSpace = {x:0,y:0};

    constructor() {
        super();
        this.init();
    }
  
    init() {
        if (!this.enabled) return;

        //token coords
        this.tokenContainer = new PIXI.Container();
        this.addChild(this.tokenContainer);
        this.tokenContainer.visible = true;

        var tokenCircle = new PIXI.Graphics();
        tokenCircle.lineStyle(4, 0xFF0000, 2);
        tokenCircle.beginFill(0x000000);
        tokenCircle.drawCircle(10, 10, 4);
        this.tokenContainer.addChild(tokenCircle);

        var tokenLabel = new PIXI.Text('token', {fontFamily : 'Arial', fontSize: 10, fontWeight : 'bold', fill : 0xFF0000, align : 'center'});
        tokenLabel.anchor.set(0.5);
        tokenLabel.position.set(0,-5)
        this.tokenContainer.addChild(tokenLabel);

        //raw coords
        this.coordsContainer = new PIXI.Container();
        this.addChild(this.coordsContainer);
        this.coordsContainer.visible = true;

        var coordsCircle = new PIXI.Graphics();
        coordsCircle.lineStyle(4, 0xFFFF00, 2);
        coordsCircle.beginFill(0x000000);
        coordsCircle.drawCircle(10, 10, 4);
        this.coordsContainer.addChild(coordsCircle);

        var label = new PIXI.Text('coordsRaw', {fontFamily : 'Arial', fontSize: 10, fontWeight : 'bold', fill : 0xFFFF00, align : 'center'});
        label.anchor.set(0.5);
        label.position.set(0,-5)
        this.coordsContainer.addChild(label);

        //current grid space
        this.gSpaceContainer = new PIXI.Container();
        this.addChild(this.gSpaceContainer);
        this.gSpaceContainer.visible = true;

        var gSpaceCircle = new PIXI.Graphics();
        gSpaceCircle.lineStyle(4, 0x00FF00, 2);
        gSpaceCircle.beginFill(0x000000);
        gSpaceCircle.drawCircle(10, 10, 4);
        this.gSpaceContainer.addChild(gSpaceCircle);

        var gSpacelabel = new PIXI.Text('gSpace', {fontFamily : 'Arial', fontSize: 10, fontWeight : 'bold', fill : 0x00FF00, align : 'center'});
        gSpacelabel.anchor.set(0.5);
        gSpacelabel.position.set(0,20)
        this.gSpaceContainer.addChild(gSpacelabel);

        //ir offset
        this.irOffsetContainer = new PIXI.Container();
        this.addChild(this.irOffsetContainer);
        this.irOffsetContainer.visible = true;

        var irOffsetCircle = new PIXI.Graphics();
        irOffsetCircle.lineStyle(4, 0x0000FF, 2);
        irOffsetCircle.beginFill(0x000000);
        irOffsetCircle.drawCircle(10, 10, 4);
        this.irOffsetContainer.addChild(irOffsetCircle);

        var irOffsetlabel = new PIXI.Text('irOffset', {fontFamily : 'Arial', fontSize: 10, fontWeight : 'bold', fill : 0x0000FF, align : 'center'});
        irOffsetlabel.anchor.set(0.5);
        irOffsetlabel.position.set(0,20)
        this.irOffsetContainer.addChild(irOffsetlabel);

        //collision offset
        this.collisionOffsetContainer = new PIXI.Container();
        this.addChild(this.collisionOffsetContainer);
        this.collisionOffsetContainer.visible = true;

        var collisionOffsetCircle = new PIXI.Graphics();
        collisionOffsetCircle.lineStyle(4, 0x00FFFF, 2);
        collisionOffsetCircle.beginFill(0x000000);
        collisionOffsetCircle.drawCircle(10, 10, 4);
        this.collisionOffsetContainer.addChild(collisionOffsetCircle);

        var collisionOffsetlabel = new PIXI.Text('cOffset', {fontFamily : 'Arial', fontSize: 10, fontWeight : 'bold', fill : 0x00FFFF, align : 'center'});
        collisionOffsetlabel.anchor.set(0.5);
        collisionOffsetlabel.position.set(0,20)
        this.collisionOffsetContainer.addChild(collisionOffsetlabel);

        //enter grid position
        this.enterGridContainer = new PIXI.Container();
        this.addChild(this.enterGridContainer);
        this.enterGridContainer.visible = true;

        var enterGridCircle = new PIXI.Graphics();
        enterGridCircle.lineStyle(4, 0xFFFF00, 2);
        enterGridCircle.beginFill(0x000000);
        enterGridCircle.drawCircle(10, 10, 4);
        this.enterGridContainer.addChild(enterGridCircle);

        var enterGridlabel = new PIXI.Text('enter', {fontFamily : 'Arial', fontSize: 10, fontWeight : 'bold', fill : 0xFFFF00, align : 'center'});
        enterGridlabel.anchor.set(0.5);
        enterGridlabel.position.set(0,20)
        this.enterGridContainer.addChild(enterGridlabel);

        //token last position
        this.tokenLastPositionContainer = new PIXI.Container();
        this.addChild(this.tokenLastPositionContainer);
        this.tokenLastPositionContainer.visible = true;

        var tokenLastPositionCircle = new PIXI.Graphics();
        tokenLastPositionCircle.lineStyle(4, 0xFFFFFF, 2);
        tokenLastPositionCircle.beginFill(0x000000);
        tokenLastPositionCircle.drawCircle(10, 10, 4);
        this.tokenLastPositionContainer.addChild(tokenLastPositionCircle);

        var tokenLastPositionlabel = new PIXI.Text('tokenLast', {fontFamily : 'Arial', fontSize: 10, fontWeight : 'bold', fill : 0xFFFFFF, align : 'center'});
        tokenLastPositionlabel.anchor.set(0.5);
        tokenLastPositionlabel.position.set(20,20)
        this.tokenLastPositionContainer.addChild(tokenLastPositionlabel);

        //collision test position
        this.collisionTestPositionContainer = new PIXI.Container();
        this.addChild(this.collisionTestPositionContainer);
        this.collisionTestPositionContainer.visible = true;

        var collisionTestPositionCircle = new PIXI.Graphics();
        collisionTestPositionCircle.lineStyle(4, 0xFF00FF, 2);
        collisionTestPositionCircle.beginFill(0x000000);
        collisionTestPositionCircle.drawCircle(10, 10, 4);
        this.collisionTestPositionContainer.addChild(collisionTestPositionCircle);

        var collisionTestPositionlabel = new PIXI.Text('collisionTest', {fontFamily : 'Arial', fontSize: 10, fontWeight : 'bold', fill : 0xFF00FF, align : 'center'});
        collisionTestPositionlabel.anchor.set(0.5);
        collisionTestPositionlabel.position.set(40,20)
        this.collisionTestPositionContainer.addChild(collisionTestPositionlabel);

        var collisionTestLine = new PIXI.Graphics();
        collisionTestLine.lineStyle(2, 0xFF00FF);
        collisionTestLine.label = 'collisionLine';
        this.collisionTestPositionContainer.addChild(collisionTestLine);
    }
  
    async _draw() {}

    async draw() {
      super.draw();
    }

    updateToken(token) {
        if (!this.enabled) return;
        const x = token.x;
        const y = token.y;
        this.tokenContainer.setTransform(x, y);
    }

    updateCoords(coords) {
        if (!this.enabled) return;
        this.coordsContainer.setTransform(coords.x, coords.y);
    }

    updateGridSpace(coords) {
        if (!this.enabled) return;
        this.gSpaceContainer.setTransform(coords.x, coords.y);
        this.gridSpace = coords;
    }

    updateIrOffset(coords) {
        if (!this.enabled) return;
        this.irOffsetContainer.setTransform(coords.x, coords.y);
    }

    updateCollisionOffset(coords) {
        if (!this.enabled) return;
        this.collisionOffsetContainer.setTransform(coords.x, coords.y);
    }

    updateEnterGrid(coords) {
        if (!this.enabled) return;
        this.enterGridContainer.setTransform(coords.x, coords.y);
    }

    updateTokenLastPosition(coords) {
        if (!this.enabled) return;
        this.tokenLastPositionContainer.setTransform(coords.x, coords.y);
    }

    updateCollisionTestPosition(coords) {
        if (!this.enabled) return;
        this.collisionTestPositionContainer.setTransform(coords.x, coords.y);
        let line = this.collisionTestPositionContainer.children.find(c => c.label == 'collisionLine');
        line.clear();
        line.lineStyle(2, 0xFF00FF);
        line.lineTo(this.gridSpace.x-coords.x, this.gridSpace.y-coords.y);
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