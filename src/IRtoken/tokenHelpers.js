import { moduleName } from "../../MaterialPlane.js";
import { debug } from "../Misc/misc.js";
import { compatibilityHandler } from "../Misc/compatibilityHandler.js";

/**
 * Compare positions of two tokens/objects. If they are equal, return true
 * @param {*} posA 
 * @param {*} posB 
 * @returns True if positions are equal
 */
export function comparePositions(posA, posB) {
    if (posA.x != posB.x) return false;
    if (posA.y != posB.y) return false;
    return true;
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

/**
 * Find the token closest to the coordinates
 * 
 * @param {*} position Coordinates
 * @return {*} Token closest to the coordinates
 */
export function findToken(coords, spacing, currentToken, mode){

    if (spacing == undefined) {
      spacing = canvas.scene.grid.size;
    }
  
    //For all tokens on the canvas: get the distance between the token and the coordinate. Get the closest token. If the distance is smaller than the hitbox of the token, 'token' is returned
    let closestToken = undefined;
    let minDistance = 1000;
    let minDistanceSpacing = 0;
    
    for (let token of canvas.tokens.placeables){
        if (mode != 'target') {
            if (currentToken == token) continue;
            if (!token.can(game.user,"control")) {
            if (!game.settings.get(moduleName,'EnNonOwned') || !token.visible) continue;
            }
        }
        
        let coordsCenter;
        let dx;
        let dy;
        let sp = spacing;
    
        if (mode == 'target') {
            coordsCenter = token.center; 
            dx =  Math.abs(coordsCenter.x - coords.x);
            dy = Math.abs(coordsCenter.y - coords.y);
            if (token.w >= spacing) sp = token.w;
            if (token.h >= spacing && token.h > sp) sp = token.h;
        }
        else {
            coordsCenter = compatibilityHandler('tokenCenter', token, token.x, token.y); 
            const baseOrientation = game.settings.get(moduleName,'baseOrientation');
            if (baseOrientation == '0') {
            dx = Math.abs(coordsCenter.x - coords.x + (token.document.width-1)*spacing/2);
            dy = Math.abs(coordsCenter.y - coords.y - (token.document.height-1)*spacing/2);
            }
            else if (baseOrientation == '90') {
            dx = Math.abs(coordsCenter.x - coords.x + (token.document.width-1)*spacing/2);
            dy = Math.abs(coordsCenter.y - coords.y + (token.document.height-1)*spacing/2);
            }
            else if (baseOrientation == '180') {
            dx = Math.abs(coordsCenter.x - coords.x - (token.document.width-1)*spacing/2);
            dy = Math.abs(coordsCenter.y - coords.y + (token.document.height-1)*spacing/2);
            }
            else if (baseOrientation == '270') {
            dx = Math.abs(coordsCenter.x - coords.x - (token.document.width-1)*spacing/2);
            dy = Math.abs(coordsCenter.y - coords.y - (token.document.height-1)*spacing/2);
            }
        }
    
        const distance = Math.sqrt( dx*dx + dy*dy );
        if (distance < minDistance) {
            closestToken = token;  
            minDistance = distance;
            minDistanceSpacing = sp;
        }
    }
    if (closestToken == undefined) 
        return undefined;
    
    debug('nearestToken',`Token: ${closestToken?.name}, Position: (${closestToken.x}, ${closestToken.y}), Distance: ${minDistance}, Min Distance: ${spacing}, Control: ${minDistance<spacing}`)
  
    if (minDistance < minDistanceSpacing/2) 
        return closestToken;      
    else 
        return undefined;
} 

/**
 * Returns the offset between the IR point and desired coordinate for the token
 * @param {*} coords 
 * @param {*} token 
 * @returns 
 */
export function getIROffset(coords, token) {
    const gridSize = canvas.dimensions.size;
    const baseOrientation = game.settings.get(moduleName,'baseOrientation');
    let newCoords = {};
   
    //Compensate for the difference between the center of the token and the top-left of the token, and compensate for token size
    if (baseOrientation == '0') {
        newCoords.x = coords.x - (token.document.width-0.5)*gridSize;
        newCoords.y = coords.y - 0.5*gridSize;
    }
    else if (baseOrientation == '90') {
        newCoords.x = coords.x - (token.document.width-0.5)*gridSize;
        newCoords.y = coords.y - (token.document.height-0.5)*gridSize;
    }
    if (baseOrientation == '180') {
        newCoords.x = coords.x - 0.5*gridSize;
        newCoords.y = coords.y - (token.document.height-0.5)*gridSize;
    }
    else if (baseOrientation == '270') {
        newCoords.x = coords.x - gridSize/2;
        newCoords.y = coords.y - gridSize/2;
    }

    return newCoords;
}

/**
 * Returns the center of the grid
 * @param {*} coords 
 * @returns 
 */
export function getGridCenter(coords, token) {
    const gridSize = canvas.dimensions.size;
    let newCoords = {
        x: coords.x + 0.5*gridSize,
        y: coords.y + 0.5*gridSize
    }

    return compatibilityHandler('gridCenter', newCoords.x, newCoords.y);
}

/**
 * Returns whether two values are within a specified range of each other
 * @param {*} a 
 * @param {*} b 
 * @param {*} range 
 * @returns 
 */
function isWithinRange(a, b, range) {
    return Math.abs(a - b) < range;
}

/**
 * Returns whether coordinates are within a specified deadzone
 * @param {*} coords 
 * @param {*} token 
 * @param {*} deadzone 
 * @returns 
 */
export function getIRDeadZone(coords, token, deadzone) {
    return isWithinRange(coords.x, token.x, deadzone) && isWithinRange(coords.y, token.y, deadzone);
}

/**
 * Check if a token has entered a new grid space, if so, store where it entered the space
 * @param {*} token 
 * @param {*} previousPosition 
 * @param {*} currentGridSpace 
 */
export function getTokenGridEnterPosition(token, previousPosition, currentGridSpace, coords, debug) {
    const gridSize = canvas.dimensions.size;

    if (token.MPlastPosition == undefined) 
        token.MPlastPosition = currentGridSpace;

    if (token.MPgridEnterPosition == undefined)
        token.MPgridEnterPosition = currentGridSpace;

    debug.updateTokenLastPosition({
        x: token.MPlastPosition.x,
        y: token.MPlastPosition.y
    });

    if (previousPosition == undefined) 
        previousPosition = currentGridSpace;

    if (Math.abs(token.x - coords.x) >= gridSize || Math.abs(token.y - coords.y) >= gridSize) return token.MPgridEnterPosition;

    if (token.MPgridEnterPosition == undefined) token.MPgridEnterPosition = currentGridSpace;

    let enterPos = {
        x: currentGridSpace.x - (currentGridSpace.x - previousPosition.x)/2,
        y: currentGridSpace.y - (currentGridSpace.y - previousPosition.y)/2
    }
    let update = false;

    if (token.MPlastPosition.x - currentGridSpace.x >= gridSize ) {
        enterPos.x += gridSize/4;
        update = true;
    }
    else if (token.MPlastPosition.x - currentGridSpace.x <= -gridSize ) {
        enterPos.x -= gridSize/2;
        update = true;
    }

    if (token.MPlastPosition.y - currentGridSpace.y >= gridSize ) {
        enterPos.y += gridSize/2;
        update = true;
    }
    else if (token.MPlastPosition.y - currentGridSpace.y <= -gridSize ) {
        enterPos.y -= gridSize/2;
        update = true;
    }

    if (update) return enterPos;
    else return token.MPgridEnterPosition;
}

/**
 * Check for token collisions
 * @param {*} token 
 * @param {*} origin 
 * @param {*} destination 
 * @param {*} useTestPosition 
 * @param {*} previousPosition 
 * @returns 
 */
export function getTokenCollision(token, origin, destination, useTestPosition=false, previousPosition, debug) {
    const gridSize = canvas.dimensions.size;

    if (useTestPosition) {
        let dest = Object.assign({}, destination);
        
        //Define a position to test for wall collisions. Start at the center of the token
        let collisionTestPosition = {
            x: origin.x + gridSize/2,
            y: origin.y - gridSize/2
        }

        //Check which direction the token has moved, and add a quarter of the gridsize to the test position
        if (destination.x > collisionTestPosition.x)    {
            collisionTestPosition.x -= (0.5)*gridSize;
            dest.x += (token.document.width-1)*gridSize;
        }
        else collisionTestPosition.x -= (0.25)*gridSize;  
        if (destination.y > collisionTestPosition.y)    {
            collisionTestPosition.y += 0.5*gridSize;
            dest.y += (token.document.height-1)*gridSize;
        }
        else collisionTestPosition.y += 0.25*gridSize;

        debug.updateGridSpace(dest);
        debug.updateCollisionTestPosition(collisionTestPosition)

        return token.checkCollision(dest, {origin:collisionTestPosition});
    }

    return token.checkCollision(destination, {origin});
}

/**
 * Add a value to both X and Y coordinates
 * @param {*} coords 
 * @param {*} value 
 * @returns 
 */
export function addToCoordinates(coords, value) {
    return {
        x: coords.x + value,
        y: coords.y + value
    };
}

/**
 * Check for token collisions for the surrounding grid spaces
 * @param {*} token 
 * @param {*} coords 
 * @param {*} origin 
 * @returns 
 */
export function checkSurroundingGridCollision(token, coords, origin, debug) {
    const gridSize = canvas.dimensions.size;

    const movementVector = {
        x: coords.x+gridSize/2 - origin.x,
        y: coords.y+gridSize/2 - origin.y
    }

    const offsetOrigin = {
        x: origin.x,
        y: origin.y
    }

    debug.updateCollisionOffset(offsetOrigin);

    let collisions = {
        n: false,
        ne: false,
        e: false,
        se: false,
        s: false,
        sw: false,
        w: false,
        nw: false,
        moveX: false,
        moveY: false
    }

    if      (movementVector.x > 0) collisions.e = getTokenCollision(token, offsetOrigin, {x:offsetOrigin.x+gridSize,   y:offsetOrigin.y})
    else if (movementVector.x < 0) collisions.w = getTokenCollision(token, offsetOrigin, {x:offsetOrigin.x-gridSize,   y:offsetOrigin.y})
    if      (movementVector.y > 0) collisions.s = getTokenCollision(token, offsetOrigin, {x:offsetOrigin.x,            y:offsetOrigin.y+gridSize})
    else if (movementVector.y < 0) collisions.n = getTokenCollision(token, offsetOrigin, {x:offsetOrigin.x,            y:offsetOrigin.y-gridSize})

    if      (movementVector.x > 0 && movementVector.y > 0) collisions.se = getTokenCollision(token, offsetOrigin, {x:offsetOrigin.x+gridSize, y:offsetOrigin.y+gridSize})
    else if (movementVector.x > 0 && movementVector.y < 0) collisions.ne = getTokenCollision(token, offsetOrigin, {x:offsetOrigin.x+gridSize, y:offsetOrigin.y-gridSize})
    else if (movementVector.x < 0 && movementVector.y > 0) collisions.sw = getTokenCollision(token, offsetOrigin, {x:offsetOrigin.x-gridSize, y:offsetOrigin.y+gridSize})
    else if (movementVector.x < 0 && movementVector.y < 0) collisions.ne = getTokenCollision(token, offsetOrigin, {x:offsetOrigin.x-gridSize, y:offsetOrigin.y-gridSize})

    collisions.moveX = !collisions.e && !collisions.w && !collisions.se && !collisions.ne && !collisions.sw && !collisions.nw;
    collisions.moveY = !collisions.n && !collisions.s && !collisions.se && !collisions.ne && !collisions.sw && !collisions.nw;
    
    return collisions;
}

/**
 * Find the nearest empty space
 * @param {} coords 
 */
export function findNearestEmptySpace(token, coords, originPosition) {
    const spacer = canvas.scene.gridType === CONST.GRID_TYPES.SQUARE ? 1.41 : 1;
    //If space is already occupied
    if (findToken(compatibilityHandler('tokenCenter', token, coords.x, coords.y),(spacer * Math.min(compatibilityHandler('canvasWidth'), compatibilityHandler('canvasHeight')))/2,token) != undefined) {
        ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.SpaceOccupied"));
        let ray = new Ray({x: originPosition.x, y: originPosition.y}, {x: coords.x, y: coords.y});

        //Code below modified from _highlightMeasurement() in ruler class in core foundry  
        const nMax = Math.max(Math.floor(ray.distance / (spacer * Math.min(compatibilityHandler('canvasWidth'), compatibilityHandler('canvasHeight')))), 1);
        const tMax = Array.fromRange(nMax+1).map(t => t / nMax);

        // Track prior position
        let prior = null;
        let gridPositions = [];
        // Iterate over ray portions
        for ( let [i, t] of tMax.entries() ) {
            let {x, y} = ray.project(t);
         
            // Get grid position
            let [r0, c0] = (i === 0) ? [null, null] : prior;
            let [r1, c1] = compatibilityHandler('getGridOffset', x, y);
            if ( r0 === r1 && c0 === c1 ) continue;
            let [x1, y1] = compatibilityHandler('getTopLeftPoint', r1, c1);
            gridPositions.push({x: x1, y: y1})
            
            // Skip the first one
            prior = [r1, c1];
            if ( i === 0 ) continue;

            // If the positions are not neighbors, also highlight their halfway point
            if (!compatibilityHandler('testAdjacency', {i:r0, j:c0}, {i:r1, j:c1})) {
                let th = tMax[i - 1] + (0.5 / nMax);
                let {x, y} = ray.project(th);
                let [rh, ch] = compatibilityHandler('getGridOffset', x, y);
                let [xh, yh] = compatibilityHandler('getTopLeftPoint', rh, ch);
                gridPositions.splice(gridPositions.length-1, 0, {x: xh, y: yh})
            }
        }
        for (let i=gridPositions.length-1; i>=0; i--) {
            const position = gridPositions[i];
            const centeredPosition = compatibilityHandler('tokenCenter', token, position.x, position.y);
            if (getTokenCollision(token, compatibilityHandler('tokenCenter', token, coords.x, coords.y), centeredPosition)) {
                continue;
            }
            if (findToken(centeredPosition,(spacer * Math.min(compatibilityHandler('canvasWidth'), compatibilityHandler('canvasHeight')))/2,token) == undefined) {
                return position;
            }
        }
        return originPosition;
    }
    return coords;
}