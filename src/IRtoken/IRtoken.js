import { moduleName } from "../../MaterialPlane.js";
import { debug } from "../Misc/misc.js";
import { DragRuler } from "./tokenRuler.js";
import { findToken, getGridCenter, getIRDeadZone, getIROffset, getTokenGridEnterPosition, getTokenCollision, comparePositions, addToCoordinates, checkSurroundingGridCollision, findNearestEmptySpace } from "./tokenHelpers.js";
import { TokenMarker } from "./tokenMarker.js";
import { TokenDebug } from "./tokenDebug.js";
import { compatibilityHandler } from "../Misc/compatibilityHandler.js";
import { Pathfinder } from "./pathfinder.js";

let pausedMessage = false;

export class IRtoken {
    constructor() { 
        this.controlledToken = undefined;   //Stores the currently controlled token
        this.currentGridSpace;           //Stores the current position of the token
        this.token = undefined;
        this.rawCoordinates;
        this.previousPosition;
        this.scaledCoords;
        this.previousCoords;
        this.currentScene;
        this.path = [];
        this.pathCounter = 0;
        this.pathAvg = {x:0, y:0};
        this.tokenAngle;

        this.marker = new TokenMarker();
        this.debug = new TokenDebug();
        canvas.stage.addChild(this.marker);
        canvas.stage.addChild(this.debug);
        this.marker.init();
        this.debug.init();
        this.pathfinder = new Pathfinder();

        this.ruler = new DragRuler();
    }

    /**
     * New IR coordinates were received. Coordinates will be scaled. If a token is near the scaled coordinate
     * @param {*} coords 
     */
    async update(data,scaledCoords,forceNew=false,moveToken=true){

        if (data == undefined && this.token == undefined) return;

        //Prevent movement if game is paused
        if (game.paused) {
            if (!pausedMessage) {
                pausedMessage = true;
                ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.GamePaused"));
                setTimeout(()=> pausedMessage = false, 5000);
            }
            return true;
        }

        if (data != undefined) {
            let coords = {x:data.x,y:data.y}
            this.rawCoordinates = coords;
        }
        if (scaledCoords != undefined) {
            this.scaledCoords = scaledCoords;
        }

        if (this.token && this.currentScene !== canvas.scene.id) {
            this.currentGridSpace = {x:this.token.x+canvas.dimensions.size/2, y:this.token.y+canvas.dimensions.size/2}
            this.previousPosition = this.currentGridSpace;
            this.originPosition = {x:this.token.x, y:this.token.y};
            this.currentScene = canvas.scene.id;
        }
        
        //If no token is assigned yet
        if (this.token == undefined || forceNew) {
            //Find the nearest token to the scaled coordinates
            if (this.token == undefined) this.token = findToken( this.scaledCoords );
            
            if (this.token == undefined) {
                debug('updateMovement','No token found')
                return false;
            }
            
            //If the user can't control the token and non-owned token movement is disabled, prevent token movement
            if (this.token.can(game.user,"control") == false && game.settings.get(moduleName,'EnNonOwned') == false) {
                
                debug('updateMovement',`User can't control token ${this.token?.name}`)
                this.token = undefined;
                return false;
            }

            //Print debug message
            debug('updateMovement',`Found token ${this.token.name}`)

            //Get the current grid space of the token
            this.currentGridSpace = {x:this.token.x+canvas.dimensions.size/2, y:this.token.y+canvas.dimensions.size/2}
            this.previousPosition = this.currentGridSpace;
            this.controlledToken = this.token;
            this.originPosition = {x:this.token.x, y:this.token.y};

            //Start the token ruler
            this.ruler.start(this.token, this.currentGridSpace);

            this.pathfinder.start(this.token, this.currentGridSpace)
        }

        //Select token
        if (this.token.can(game.user,"control"))
            this.token.control({releaseOthers:false});
        
        //Move token
        if (moveToken) 
            this.moveToken(this.scaledCoords);

        //Enable marker
        if (game.settings.get(moduleName,'movementMarker') && this.marker != undefined && this.token != undefined) 
            this.marker.show(); 

        return true;
    }
    
    /**
     * Move the token to the new coordinates
     * @param {*} token 
     * @param {*} coords 
     */
    async moveToken(coords) {
        this.debug.updateToken(this.token);
        
        this.debug.updateCoords(coords);

        this.previousCoords = Object.assign({}, coords);

        //Compensate for the offset of the IR led
        coords = getIROffset(coords, this.token);
        this.debug.updateIrOffset(coords);

        //Only move token if the coordinates have changed by more than 5
        if (getIRDeadZone(coords, this.token, 5)) return;

        //Get the center of the current grid space
        let currentGridSpace = getGridCenter(coords, this.token);
        this.debug.updateGridSpace(currentGridSpace);

        if (game.settings.get(moduleName, 'autoRotate')) {
            let angle;
            if (this.pathCounter === 0) {
                this.path.push({coords})
            }
            else {
                const diff = {x: this.path[this.pathCounter-1].coords.x - coords.x, y: this.path[this.pathCounter-1].coords.y - coords.y};
                this.path.push({coords, diff});
                this.pathAvg = {x:0, y:0};
                for (let i=0; i<this.pathCounter; i++) {
                    this.pathAvg.x += this.path[i].diff?.x || 0;
                    this.pathAvg.y += this.path[i].diff?.y || 0;
                }
                this.pathAvg.x /= this.pathCounter;
                this.pathAvg.y /= this.pathCounter;
    
                const radians = Math.atan2(this.pathAvg.y, this.pathAvg.x);
                angle = 180 * radians / Math.PI + 90;
    
                this.tokenAngle = angle;
                this.token.document.rotation = this.tokenAngle;
            }
            
            if (this.path.length > 20) this.path.shift();
            else this.pathCounter++;
    
            //console.log('path', coords, this.path, this.pathAvg, angle, this.pathCounter)
        }
        

        //console.log('prev', this.previousPosition, currentGridSpace, canvas.grid.measurePath([this.previousPosition,currentGridSpace]).distance)
        //Check if a token has entered a new grid space, if so, store where it entered the space
        const path = canvas.grid.measurePath([this.previousPosition, currentGridSpace]);
        const distance = path.distance / canvas.grid.distance;
        if (distance > 6) return;
        let enterPos;
        if (distance == 0)
            enterPos = await getTokenGridEnterPosition(this.token, this.previousPosition, currentGridSpace, coords, this.debug);
        else
            enterPos = this.previousPosition || this.originPosition

        //this.pathfinder.calculatePath(currentGridSpace);


        let movementMethod = game.settings.get(moduleName,'movementMethod');

        //Check if a collision occurs between the position where the token entered the grid space, and the current position. This is to prevent teleportation through walls that are placed through a grid space.
        let collision;
        if (movementMethod == 'stepByStep') collision = getTokenCollision(this.token, undefined, currentGridSpace, false);
        else collision = getTokenCollision(this.token, enterPos, currentGridSpace, true, this.previousPosition, this.debug);

        if (!collision) {
            this.token.MPgridEnterPosition = enterPos;
        }

        this.debug.updateEnterGrid(enterPos);
        
        const gridSize = canvas.dimensions.size;

        //In case of a collision, send debug message and prevent movement
        if (collision) {
            debug('moveToken',`Token: ${this.token.name}, Can't move due to a wall collision`)
        }

        //Step-by-Step movement: when dragging the token, the token is moved every gridspace
        else if (movementMethod == 'stepByStep') { 
            //Update the token ruler
            this.ruler.move(currentGridSpace);

            //Save the current position
            this.currentGridSpace = currentGridSpace;
            this.previousPosition = currentGridSpace;

            //Calculate the new coords for token.document.update
            const newCoords = {
                x: currentGridSpace.x - 0.5*gridSize,
                y: currentGridSpace.y - 0.5*gridSize
            }

            //If user can control the token
            if (this.token.can(game.user,"control")) {
                //Update token position
                await this.token.document.update(newCoords);
            }
            //Otherwise, request movement from GM client
            else {
                let payload = {
                    "msgType": "moveToken",
                    "senderId": game.user.id, 
                    "receiverId": game.data.users.find(users => users.role == 4)._id, 
                    "tokenId": this.token.id,
                    "newCoords": newCoords
                };
                game.socket.emit(`module.MaterialPlane`, payload);
            }

            //Print debug info
            debug('moveToken',`Token: ${this.token?.name}, Move to: (${newCoords.x}, ${newCoords.y})`)
        }

        //Default foundry movement method: update position after dropping token
        //Or live movement method: update vision live, update position when dropping token
        else {
            this.token.MPlastPosition = this.previousPosition;
            if (movementMethod == 'live') this.previousPosition = currentGridSpace;

            if (this.token.can(game.user,"control")) {
                //Get collisions for surrounding grid spaces
                const collisions = checkSurroundingGridCollision(this.token, coords, currentGridSpace, this.debug);
                
                //Movement in X and Y is allowed
                if (collisions.moveX && collisions.moveY) {
                    this.token.document.x = coords.x;
                    this.token.document.y = coords.y;
                }
                //Movement in X is allowed, Y is not
                else if (!collisions.e && !collisions.w) {
                    this.token.document.x = coords.x;
                    this.token.document.y = currentGridSpace.y - Math.floor(gridSize/2);
                }
                //Movement in Y is allowed, X is not
                else if (!collisions.n && !collisions.s) {
                    this.token.document.x = currentGridSpace.x - Math.floor(gridSize/2);
                    this.token.document.y = coords.y;
                }

                this.currentGridSpace = currentGridSpace;
            }
            else {
                this.token.document.x = coords.x;
                this.token.document.y = coords.y;
                this.currentGridSpace = currentGridSpace;
            }

            //Update the token ruler
            this.ruler.move(currentGridSpace);

            //Refresh token to update its position
            this.token.refresh();

            //Update lighting in case of 'live' movement method
            if (movementMethod == 'live') compatibilityHandler('initializeSources', this.token);

            //Print debug message
            debug('moveToken',`Token: ${this.token.name}, Move to: (${coords.x}, ${coords.y})`)
        }

        //Draw the movement marker
        if (game.settings.get(moduleName,'movementMarker')) {
            const color = collision ? "0xFF0000" : "0x00FF00"
            if (this.currentGridSpace != undefined && this.token != undefined) {
                this.marker.updateMarker({
                    x: currentGridSpace.x,
                    y: currentGridSpace.y,
                    width: this.token.document.width,
                    height: this.token.document.height,
                    gridSize,
                    color: color
                })
            }
        }
    }

     /**
     * Calculate the difference between the old coordinates of the token and the last measured coordinates, and move the token there
     */
    async dropIRtoken(release = game.settings.get(moduleName,'deselect')){
        
        //If no token is controlled, return
        if (this.token == undefined) return false;

        const gridSize = canvas.dimensions.size;

        let newCoords = {
            x: this.currentGridSpace.x - 0.5*gridSize,
            y: this.currentGridSpace.y - 0.5*gridSize,
            rotation: this.token.document.rotation
        }
        
        //If collision prevention is enabled, check if the token doesn't end up in an occupied space, if so, adjust position
        if (game.settings.get(moduleName,'collisionPrevention')) {
            newCoords = findNearestEmptySpace(this.token, newCoords, this.originPosition);
            this.originPosition = newCoords;
            this.currentGridSpace = addToCoordinates(newCoords, gridSize/2);
        }
        
        this.previousPosition = this.currentGridSpace;
        
        //If 'stepByStep' movement method is not selected (for stepByStep this is handled in the moveToken function)
        if (game.settings.get(moduleName,'movementMethod') != 'stepByStep') {

            //If user can control the token
            if (this.token.can(game.user,"control")) {
                //Update token position
                await this.token.document.update(newCoords);
                
                if (this.token == undefined) return false;

                //Prevent token animation
                if (this.token?.animationName)
                    CanvasAnimation.terminateAnimation(this.token.animationName);

                //Print debug message
                debug('dropToken',`Token ${this.token.name}, Dropping at (${newCoords.x}, ${newCoords.y})`)
            }
            //Otherwise, request movement from GM client
            else {
                let payload = {
                    "msgType": "moveToken",
                    "senderId": game.user.id, 
                    "receiverId": game.data.users.find(users => users.role == 4)._id, 
                    "tokenId": this.token.id,
                    "newCoords": newCoords
                };
                game.socket.emit(`module.MaterialPlane`, payload);

                //Print debug message
                debug('dropToken',`Token ${this.token.name}, Non-owned token, requesting GM client to be dropped at (${newCoords.x}, ${newCoords.y})`)
            }
        }

        //Make sure the token is positioned in the correct spot (required if a token is moved but dropped at its starting position)
        this.token.document.x = newCoords.x;
        this.token.document.y = newCoords.y;
        if (game.settings.get(moduleName, 'autoRotate')) this.token.document.rotation = this.tokenAngle;
        this.token.refresh();
        compatibilityHandler('initializeSources', this.token);
        
        //Release token, if setting is enabled
        if (release) this.token.release();

        //Handle tokenDrop for token ruler
        this.ruler.tokenDrop();

        this.token = undefined;
        this.marker.hide();
        return true;
    }
}
