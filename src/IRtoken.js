import { moduleName } from "../MaterialPlane.js";
import { findToken, tokenMarker } from "./misc.js";

export class IRtoken {
    constructor() { 
        this.controlledToken = undefined;   //Stores the currently controlled token
        this.currentPosition;           //Stores the current position of the token
        this.token = undefined;
        this.rawCoordinates;
        this.previousPosition;

        this.marker = new tokenMarker();
        canvas.stage.addChild(this.marker);
        this.marker.init();
    }

    /**
     * New IR coordinates were received. Coordinates will be scaled. If a token is near the scaled coordinate
     * @param {*} coords 
     */
    async update(data,scaledCoords,forceNew=false){
        if (data.x == undefined || data.y == undefined) return false;
        let coords = {x:data.x,y:data.y}
        this.rawCoordinates = coords;

        if (this.token == undefined || forceNew) {
            //Find the nearest token to the scaled coordinates
            if (this.token == undefined) this.token = findToken( scaledCoords );
            
            if (this.token == undefined) return false;
            if (this.token.can(game.user,"control") == false && game.settings.get(moduleName,'EnNonOwned') == false) {
                this.token = undefined;
                return false;
            }
            this.currentPosition = {x:this.token.x+canvas.scene.data.grid/2, y:this.token.y+canvas.scene.data.grid/2}
            this.previousPosition = this.currentPosition;
            this.controlledToken = this.token;
        }
        if (this.token.can(game.user,"control"))  this.token.control({releaseOthers:false});
        this.moveToken(scaledCoords);

        if (game.settings.get(moduleName,'movementMarker') && this.marker != undefined && this.token != undefined) this.marker.show();
        return true;
    }
    
    /**
     * Move the token to the new coordinates
     * @param {*} token 
     * @param {*} coords 
     */
    async moveToken(coords) {
        const coordsRaw = coords;
        //Compensate for the difference between the center of the token and the top-left of the token, and compensate for token size
        coords.x -= this.token.hitArea.width/2 +(this.token.data.width - 1)*canvas.scene.data.grid/2;
        coords.y -= this.token.hitArea.height/2 -(this.token.data.height - 1)*canvas.scene.data.grid/2;
        if (Math.abs(coords.x-this.token.data.x) < 5 && Math.abs(coords.y-this.token.data.y) < 5) return;

        let cp = canvas.grid.getCenter(coords.x+canvas.dimensions.size/2,coords.y+canvas.dimensions.size/2);
        let currentPos = {x:cp[0], y:cp[1]};

        let movementMethod = game.settings.get(moduleName,'movementMethod');
        
        let collision = false;
        if (this.previousPosition == undefined) this.previousPosition = currentPos;
        else if (this.previousPosition.x != currentPos.x || this.previousPosition.y != currentPos.y){
            collision = this.checkCollision(this.token,this.previousPosition,currentPos);
        }

        if (this.token.can(game.user,"control") == false) {
            movementMethod = 0;
            collision = false;
        }
        
        //Default foundry movement method: update position after dropping token. Or live movement method: update vision live, update position when dropping token
        if (movementMethod < 2) {
            if (collision == false) {
                
                if (movementMethod == 1) this.previousPosition = currentPos;

                if (this.token.can(game.user,"control")) {
                    let surroundingGridCollisions = this.checkSurroundingGridCollision(coords,currentPos);
                    let collisions = [surroundingGridCollisions[0],surroundingGridCollisions[1],surroundingGridCollisions[2],surroundingGridCollisions[3]];
                    
                    if (surroundingGridCollisions[4]) {collisions[0]=true; collisions[2]=true}
                    if (surroundingGridCollisions[5]) {collisions[0]=true; collisions[3]=true}
                    if (surroundingGridCollisions[6]) {collisions[1]=true; collisions[2]=true}
                    if (surroundingGridCollisions[7]) {collisions[1]=true; collisions[3]=true}

                    //if (!surroundingGridCollisions[0] && !surroundingGridCollisions[1]) this.token.data.x = coords.x;
                    //if (!surroundingGridCollisions[2] && !surroundingGridCollisions[3]) this.token.data.y = coords.y;
                    let moveX = false;
                    let moveY = false;
                    if (!collisions[0] && !collisions[1]) moveX = true;
                    if (!collisions[2] && !collisions[3]) moveY = true;
                    
                    if (moveX && moveY) {
                        this.token.data.x = coords.x;
                        this.token.data.y = coords.y;
                        this.currentPosition = currentPos;
                    }
                    //movement in X is allowed, Y is not
                    else if (!surroundingGridCollisions[0] && !surroundingGridCollisions[1]) {
                        this.token.data.x = coords.x;
                        this.token.data.y = currentPos.y - Math.floor(canvas.dimensions.size/2);
                        this.currentPosition = currentPos;
                    }
                    //movement in Y is allowed, X is not
                    else if (!surroundingGridCollisions[2] && !surroundingGridCollisions[3]) {
                        this.token.data.x = currentPos.x - Math.floor(canvas.dimensions.size/2);
                        this.token.data.y = coords.y;
                        this.currentPosition = currentPos;
                    }
                }
                else {
                    this.token.data.x = coords.x;
                    this.token.data.y = coords.y;
                    this.currentPosition = currentPos;
                }

                this.token.refresh();
                if (movementMethod == 1) this.token.updateSource({noUpdateFog: false});
            }
        }
        //Step-by-Step movement: when dragging the token, the token is moved every gridspace
        else if (movementMethod == 2) {
            if (collision == false) {
                this.currentPosition = currentPos;
                let newCoords = {
                    x: (this.currentPosition.x-canvas.scene.data.grid/2),
                    y: (this.currentPosition.y-canvas.scene.data.grid/2)
                }
                
                this.previousPosition = this.currentPosition;

                await this.token.document.update(newCoords);
            }
        }

        //Draw the movement marker
        if (game.settings.get(moduleName,'movementMarker')) {
            const color = collision ? "0xFF0000" : "0x00FF00"
            if (this.currentPosition != undefined && this.token != undefined)
                this.marker.updateMarker({
                    x: currentPos.x,
                    y: currentPos.y,
                    width: canvas.dimensions.size,
                    height: canvas.dimensions.size,
                    color: color
                })
        }
    }

    /*
     * Check for wall collisions
     */
    checkCollision(token,origin,destination) {
        // Create a Ray for the attempted move
        let ray = new Ray({x: origin.x, y: origin.y}, {x: destination.x, y: destination.y});

        // Shift the origin point by the prior velocity
        ray.A.x -= token._velocity.sx;
        ray.A.y -= token._velocity.sy;

        // Shift the destination point by the requested velocity
        ray.B.x -= Math.sign(ray.dx);
        ray.B.y -= Math.sign(ray.dy);

        // Check for a wall collision
        return canvas.walls.checkCollision(ray);
    }

    /*
     * Check if surrounding grids cause wall collisions
     */
    checkSurroundingGridCollision(coords,origin) {
        
        const offsetFromGrid = {
            x: coords.x+canvas.dimensions.size/2 - origin.x,
            y: coords.y+canvas.dimensions.size/2 - origin.y
        }
        let surroundingGrids = [false,false,false,false,false,false,false,false];
        if (offsetFromGrid.x > 0)       surroundingGrids[0] = this.checkCollision(this.token,origin,{x:origin.x+canvas.dimensions.size,   y:origin.y})
        else if (offsetFromGrid.x < 0)  surroundingGrids[1] = this.checkCollision(this.token,origin,{x:origin.x-canvas.dimensions.size,   y:origin.y})
        if (offsetFromGrid.y > 0)       surroundingGrids[2] = this.checkCollision(this.token,origin,{x:origin.x,                          y:origin.y+canvas.dimensions.size})
        else if (offsetFromGrid.y < 0)  surroundingGrids[3] = this.checkCollision(this.token,origin,{x:origin.x,                          y:origin.y-canvas.dimensions.size})

        if (offsetFromGrid.x > 0 && offsetFromGrid.y > 0)       surroundingGrids[4] = this.checkCollision(this.token,origin,{x:origin.x+canvas.dimensions.size, y:origin.y+canvas.dimensions.size})
        else if (offsetFromGrid.x > 0 && offsetFromGrid.y < 0)  surroundingGrids[5] = this.checkCollision(this.token,origin,{x:origin.x+canvas.dimensions.size, y:origin.y-canvas.dimensions.size})
        else if (offsetFromGrid.x < 0 && offsetFromGrid.y > 0)  surroundingGrids[6] = this.checkCollision(this.token,origin,{x:origin.x-canvas.dimensions.size, y:origin.y+canvas.dimensions.size})
        else if (offsetFromGrid.x < 0 && offsetFromGrid.y < 0)  surroundingGrids[7] = this.checkCollision(this.token,origin,{x:origin.x-canvas.dimensions.size, y:origin.y-canvas.dimensions.size})
        return surroundingGrids;
    }

     /**
     * Calculate the difference between the old coordinates of the token and the last measured coordinates, and move the token there
     */
    async dropIRtoken(){
        
        //If no token is controlled, return
        if (this.token == undefined) return;
        

        //Release token, if setting is enabled
        if (game.settings.get(moduleName,'deselect')) this.token.release();

        //Get the coordinates of the center of the grid closest to the coords
        if (game.settings.get(moduleName,'movementMethod') != 2) {
            let newCoords = {
                x: (this.currentPosition.x-canvas.scene.data.grid/2),
                y: (this.currentPosition.y-canvas.scene.data.grid/2)
            }
            this.previousPosition = this.currentPosition;

            await this.token.document.update(newCoords);
        }
        
        this.token = undefined;
        this.marker.hide();
    }

    requestMovement(token,coords){
        let payload = {
            "msgType": "moveToken",
            "senderId": game.user.id, 
            "receiverId": game.data.users.find(users => users.role == 4)._id, 
            "tokenId": token.id,
            "newCoords": coords
        };
        game.socket.emit(`module.MaterialPlane`, payload);
    }
}
