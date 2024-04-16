let rulerActive = false;
let rulerOrigin = {x: 0, y: 0}
let ruler;
let holdTime;

/**
 * Actions related to the ruler
 * @param {*} command 
 * @param {*} data 
 * @param {*} status 
 */
export function rulerFunction(command,data,status) {
    //Update ruler position
    if (command == 'penIdle') {
        if (ruler == undefined || !rulerActive) return;
        ruler.measure(data);
    }
    //Start ruler/add new waypoint
    else if (command == 'penD') {
        if (status == 'click') {
            if (rulerActive && ruler != undefined) {
                ruler._addWaypoint({x:data.x, y:data.y});
                rulerOrigin = {x:data.x, y:data.y};
            }
            else {
                rulerActive = true;
                if (ruler != undefined) ruler.clear();
                ruler = new Ruler(game.user);
                canvas.controls.rulers.addChild(ruler);

                ruler.clear();
                ruler._state = Ruler.STATES.STARTING;
                ruler._addWaypoint({x:data.x, y:data.y});
            }
        } 
    }

    //Undo last waypoint
    else if (command == 'penA') {
        if (status == 'click') {
            if (rulerActive) {
                const lastSegment = ruler.segments.pop();
                if (lastSegment != undefined) ruler._removeWaypoint(lastSegment.ray.A);
            }
            else {
                ruler.clear();
                ruler = undefined;
                rulerActive = false;
            }
        }
        else if (status == 'hold' && rulerActive && Date.now() - holdTime >= 500) {
            if (rulerActive) {
                ruler.clear();
                ruler = undefined;
                rulerActive = false;
            }
        }
    }
    
    //Clear ruler
    else if (command == 'penB') {
        if (status == 'click' || status == 'release') {
            if (rulerActive) {
                ruler.clear();
                ruler = undefined;
                rulerActive = false;
            }
        }
    }
}