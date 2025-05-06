import { compatibilityHandler } from "../../Misc/compatibilityHandler.js";

let rulerActive = false;
let rulerOrigin = {x: 0, y: 0}
let ruler;
let holdTime;
let path = [];

/**
 * Actions related to the ruler
 * @param {*} command 
 * @param {*} data 
 * @param {*} status 
 */
export async function rulerFunction(command,data,status) {
    //Update ruler position
    if (command == 'penIdle') {
        if (ruler == undefined || !rulerActive) return;
        compatibilityHandler.ruler.measure(ruler, {x:data.x, y:data.y}, path);
        //ruler.measure(data);
    }
    //Start ruler/add new waypoint
    else if (command == 'penD') {
        if (status == 'click') {
            if (rulerActive && ruler != undefined) {
                compatibilityHandler.ruler.addWaypoint(ruler, {x:data.x, y:data.y});
                //ruler._addWaypoint({x:data.x, y:data.y});
                rulerOrigin = {x:data.x, y:data.y};
                path.push({x:data.x, y:data.y});
            }
            else {
                rulerActive = true;
                if (ruler != undefined) compatibilityHandler.ruler.clear(ruler);
                
                ruler = await compatibilityHandler.ruler.draw();
                compatibilityHandler.ruler.clear(ruler);
                compatibilityHandler.ruler.setStartState(ruler);
                compatibilityHandler.ruler.addWaypoint(ruler, {x:data.x, y:data.y});
                path.push({x:data.x, y:data.y});
                //ruler = new Ruler(game.user);
                //canvas.controls.rulers.addChild(ruler);

                //ruler.clear();
                //ruler._state = Ruler.STATES.STARTING;
                //ruler._addWaypoint({x:data.x, y:data.y});
            }
        } 
    }

    //Undo last waypoint
    else if (command == 'penA') {
        if (status == 'click') {
            if (rulerActive) {
                const lastSegment = ruler.segments?.pop();
                if (lastSegment != undefined) compatibilityHandler.ruler.removeWaypoint(ruler, lastSegment.ray.A);
                //if (lastSegment != undefined) ruler._removeWaypoint(lastSegment.ray.A);
                path.pop();
            }
            else {
                compatibilityHandler.ruler.clear(ruler);
                path = [];
                //ruler.clear();
                ruler = undefined;
                rulerActive = false;
            }
        }
        else if (status == 'hold' && rulerActive && Date.now() - holdTime >= 500) {
            if (rulerActive) {
                compatibilityHandler.ruler.clear(ruler);
                path = [];
                //ruler.clear();
                ruler = undefined;
                rulerActive = false;
            }
        }
    }
    
    //Clear ruler
    else if (command == 'penB') {
        if (status == 'click' || status == 'release') {
            if (rulerActive) {
                compatibilityHandler.ruler.clear(ruler);
                path = [];
                //ruler.clear();
                ruler = undefined;
                rulerActive = false;
            }
        }
    }
}