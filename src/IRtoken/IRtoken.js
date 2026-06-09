import { moduleName } from "../../MaterialPlane.js";
import { debug } from "../Misc/misc.js";
import { DragRuler } from "./tokenRuler.js";
import { findToken, getGridCenter, getIRDeadZone, getIROffset, getTokenGridEnterPosition, getTokenCollision, comparePositions, addToCoordinates, checkSurroundingGridCollision, findNearestEmptySpace } from "./tokenHelpers.js";
import { TokenMarker } from "./tokenMarker.js";
import { TokenDebug } from "./tokenDebug.js";
import { compatibilityHandler } from "../Misc/compatibilityHandler.js";

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
        this.oldMovementAction;

        this.marker = new TokenMarker();
        this.debug = new TokenDebug();
        canvas.stage.addChild(this.marker);
        canvas.stage.addChild(this.debug);
        this.marker.init();
        this.debug.init();

        this.ruler = new DragRuler();
    }

    /**
     * New IR coordinates were received. Coordinates will be scaled. If a token is near the scaled coordinate
     *
     * @params {object} data:  while referenced and stored into rawCoordinates, rawCoordinates appears unused.
     * @params {object} scaledCoords: x and y values that correspond to canvas pixels.
     * @params {boolean} forcenew: Force a new token to be associated with this movement.
     * @params {boolean} moveToken: Move the token
     * @params {boolean} touch: Generated from touchscreen?  Current does nothing.
     */
    async update(data,scaledCoords,forceNew=false,moveToken=true,touch=false){

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

        if (this.token && (!this.currentGridSpace || !this.previousPosition || !this.originPosition || !this.oldMovementAction)) {
            this.currentGridSpace = {x:this.token.x+canvas.dimensions.size/2, y:this.token.y+canvas.dimensions.size/2}
            this.previousPosition = this.currentGridSpace;
            this.controlledToken = this.token;
            this.originPosition = {x:this.token.x, y:this.token.y};
            this.oldMovementAction = this.token?.document.movementAction;
            this.token.MPlastPosition = this.previousPosition;
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
            this.oldMovementAction = this.token?.document.movementAction;
            this.token.MPlastPosition = this.previousPosition;
            
            if (this.token.can(game.user,"control"))
                await this.token.document.update({movementAction: 'displace'});
            else
                game.socket.emit(`module.MaterialPlane`, {
                    "msgType": "setTokenMovementAction",
                    "senderId": game.user.id, 
                    "receiverId": game.data.users.find(users => users.role == 4)._id, 
                    "tokenId": this.token.id,
                    "action": 'displace'
                });

            //Start the token ruler
            this.ruler.start(this.token, this.currentGridSpace);
            
            if (touch) {
                //this.token._finalizeDragLeft = (ev) => {
                //    console.log('dragLeft')
                //}
            }
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
     * Show how the token might get to the new coords
     * @param {Object} coords: Contains x & y canvas coordinates
     *
     * With movementMethod of tokenDrop, the token does not move until it is dropped.
     * As such, in this mode, all that is done is that the ruler is drawn.  The
     * coordinates need to be stored, because when the token is dropped, the
     * coordinates are not provided at that time.  moveToken() does this,
     * but if that changes, it needs to be added to this function.
     *
     * The usefulness of this movement is much more useful if paired with the FindMovementPath
     * ruler method, since this function also uses FindMovementPath to determine a path to the
     * destination - ideally, the 2 settings should be tied together.
     *
     * This function is simple enough it really doesn't need to be its own function,
     * but this may make it easier if moveToken() is refactored in various ways to
     * add any new logic here.
     */
    async moveTokenDrop(coords) {
        let currentGridSpace = getGridCenter(coords, this.token);
        debug('moveToken',`moveTokenDrop: Would move token from ${this.token.x}, ${this.token.y} to ${currentGridSpace.x}, ${currentGridSpace.y}`);
        // Other parts of MaterialPlane sets movementAction to displace - in that mode, the ruler is not
        // drawn & calculated properly, so reset movementAction to the old value, and make sure the old
        // value is not displace, but walk instead (in that case, what the real old movementAction was is
        // probably lost
        if (this.oldMovementAction === 'displace')
            this.oldMovementAction = 'walk'

        await this.token.document.update({movementAction: this.oldMovementAction});

        this.currentGridSpace = currentGridSpace;
        this.ruler.move(currentGridSpace);
    }

    /**
     * The token has been dropped, so now move it along its path.  This is used when the movement method is to
     * not move the token until it is dropped.  Hence, the pretty terrible function name - tokenDrop describes
     * the movement method, and Drop the action that is being done.
     *
     * This is called from dropIRtoken(), which only calls this is movementMethod is tokenDrop.  If this is called
     * when that is not the movementMethod, unpredictable results are likely.
     *
     */
    async tokenDropDrop(release = game.settings.get(moduleName,'deselect')){

        //If no token is controlled, return
        if (this.token == undefined) return false;

        const gridSize = canvas.dimensions.size;

        let newCoords = {
            x: this.currentGridSpace.x - 0.5*gridSize,
            y: this.currentGridSpace.y - 0.5*gridSize,
            rotation: this.token.document.rotation
        }

        debug('moveToken',`TokenDropDrop newCoords is ${newCoords.x}, ${newCoords.y}`);

        /* The path that the ruler sets is used here if set to findMovementPath.  If the ruler is not set to that,
         * then call ruler.findMovementPath() to fill in the needed data.
         */
        const rulerSettings = game.settings.get(moduleName,'tokenRuler');
        debug('moveToken',`TokenDropDrop rulerSettings is ${rulerSettings.mode}`);

        if (rulerSettings.mode != 'findMovementPath') {
            await this.ruler.findMovementPath(newCoords, false);
        }

        if (this.ruler.path === undefined || this.ruler.path.length == 0) {
            debug('moveToken', `TokenDropDrop did not find path from ${this.token.x}, ${this.token.y} to ${newCoords.x}, ${newCoords.y}`);
        } else {
            this.previousPosition = this.currentGridSpace;
            let final_pos = this.ruler.path[this.ruler.path.length - 1];


            let newCoords = {
                x: final_pos.x - final_pos.x % gridSize,
                y: final_pos.y - final_pos.y % gridSize,
                rotation: this.token.document.rotation
            }

            debug('moveToken',`TokenDropDrop adjusted final coords is ${newCoords.x}, ${newCoords.y}`);

            for (const wp of this.ruler.path) {
                debug('moveToken', `Moving token to waypoint ${wp.x}, ${wp.y}`);

                // If user can control the token
                if (this.token.can(game.user, "control")) {
                    //Update token position
                    //const oldMovementAction = this.token?.document.movementAction;
                    await this.token?.document.update({...wp});

                    if (this.token == undefined) return false;

                    //Prevent token animation
                    if (this.token?.animationName)
                        compatibilityHandler.terminateTokenAnimation(this.token);
                }
                //Otherwise, request movement from GM client
                else {
                    let payload = {
                        "msgType": "moveToken",
                        "senderId": game.user.id,
                        "receiverId": game.data.users.find(users => users.role == 4)._id,
                        "tokenId": this.token.id,
                        "newCoords": wp
                    };
                    game.socket.emit(`module.MaterialPlane`, payload);
                }


                //Make sure the token is positioned in the correct spot (required if a token is moved but dropped at its starting position)
                this.token.document.x = newCoords.x;
                this.token.document.y = newCoords.y;
                this.token.refresh();
                this.token.initializeSources();

                if (this.oldMovementAction === 'displace')
                    this.oldMovementAction = 'walk'

                if (this.token.can(game.user, "control"))
                    await this.token.document.update({movementAction: this.oldMovementAction});
                else
                    game.socket.emit(`module.MaterialPlane`, {
                        "msgType": "setTokenMovementAction",
                        "senderId": game.user.id,
                        "receiverId": game.data.users.find(users => users.role == 4)._id,
                        "tokenId": this.token.id,
                        "action": this.oldMovementAction
                    });
            }
        }
        //Release token, if setting is enabled
        if (release) this.token?.release();

        //Handle tokenDrop for token ruler
        this.ruler.tokenDrop();

        this.token = undefined;
        this.marker.hide();

        return true;
    }

    /**
     * Move the token to the new coordinates
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

        let movementMethod = game.settings.get(moduleName,'movementMethod');
        if (movementMethod == 'tokenDrop') {
            this.moveTokenDrop(coords);
            return;
        }

        //Check if a token has entered a new grid space, if so, store where it entered the space
        let enterPos = await getTokenGridEnterPosition(this.token, this.previousPosition, currentGridSpace, coords, this.debug);

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
            if (movementMethod == 'live') this.token.initializeSources();

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
      *
      * @params (boolean) release: Release the token on drop.  None of the function callers set this, and here it
      *     set to the module setting of deselect behavior.
      * @returns boolean: This is always set to true, and the callers of this function do not look at the
      *     return value, so this could probably be removed.
      */
    async dropIRtoken(release = game.settings.get(moduleName,'deselect')){
        
        //If no token is controlled, return
        if (this.token == undefined) return false;

        if (game.settings.get(moduleName,'movementMethod') === 'tokenDrop') {
            this.tokenDropDrop();
            return true;
        }

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
                //const oldMovementAction = this.token?.document.movementAction;
                await this.token?.document.update({...newCoords});

                if (this.token == undefined) return false;
                
                //Prevent token animation
                if (this.token?.animationName)
                    compatibilityHandler.terminateTokenAnimation(this.token);

                //Print debug message
                debug('dropToken',`Token ${this.token?.name}, Dropping at (${newCoords.x}, ${newCoords.y})`)
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
        this.token.refresh();
        this.token.initializeSources();

        if (this.oldMovementAction === 'displace') 
            this.oldMovementAction = 'walk'

        if (this.token.can(game.user,"control"))
            await this.token.document.update({movementAction: this.oldMovementAction});
        else
            game.socket.emit(`module.MaterialPlane`, {
                "msgType": "setTokenMovementAction",
                "senderId": game.user.id, 
                "receiverId": game.data.users.find(users => users.role == 4)._id, 
                "tokenId": this.token.id,
                "action": this.oldMovementAction
            });
        
        //Release token, if setting is enabled
        if (release) this.token?.release();

        //Handle tokenDrop for token ruler
        this.ruler.tokenDrop();

        this.token = undefined;
        this.marker.hide();

        return true;
    }
}
