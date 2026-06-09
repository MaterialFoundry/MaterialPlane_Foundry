import { moduleName, routingLibEnabled } from "../../MaterialPlane.js";
import { debug } from "../Misc/misc.js";
import { compatibilityHandler } from "../Misc/compatibilityHandler.js";
import { comparePositions } from "./tokenHelpers.js";

let routingLibNotificationTimer = 0;

/**
 * Draws a ruler between the token's origin position and current position
 */
export class DragRuler {
    active = false;
    token = undefined;
    ruler = undefined;
    previousPosition = {x: 0, y: 0};
    origin = undefined;
    path = [];
    lastSegmentOrigin;
    pathFinderSegments = [];
    pathFinderSegmentsPrevious = [];
    pathFinderStart = {};

    constructor() {}

    /**
     * Start the ruler
     * @param {*} token 
     * @param {*} position 
     * @returns 
     */
    async start(token, position) {
        if (game.settings.get(moduleName,'tokenRuler').mode == 'disabled') return;

        if (this.ruler != undefined) this.end();

        this.token = token;
        this.origin = position;
        
        this.previousPosition = position;

        this.ruler = await compatibilityHandler.ruler.draw();
    }

    /**
     * Handle token/ruler movement
     * @param {*} position 
     * @returns 
     */
    async move(position) {
        const rulerSettings = game.settings.get(moduleName,'tokenRuler');
        if (rulerSettings.mode == 'disabled') return;

        debug('ruler', `move, position=(x,y) = ${position.x}, ${position.y}`);

        //If the position of the ruler's endpoint has not changed, return
        if (comparePositions(this.previousPosition, position)) return;
        this.previousPosition = position;

        if (this.path[0] == undefined) {
            this.path[0] = this.origin;
            compatibilityHandler.ruler.clear(this.ruler);
            compatibilityHandler.ruler.setStartState(this.ruler);
            compatibilityHandler.ruler.addWaypoint(this.ruler, this.origin);
            //this.ruler.clear();
            //this.ruler._state = Ruler.STATES.STARTING;
            //this.ruler._addWaypoint(this.origin);
        }

        if (rulerSettings.mode == 'follow') {
            const segments = this.ruler.segments;
    
            if (this.path.length > 2 && comparePositions(position,this.path[this.path.length-2])) {
                if (this.path.length > 1) {
                    this.path.pop();
                    if (segments !== undefined) {
                        const lastSegment = segments[segments.length-1];
                        if (comparePositions(position,lastSegment.ray.A)) {
                            compatibilityHandler.ruler.removeWaypoint(this.ruler, position);
                            //this.ruler._removeWaypoint(position);
                            this.lastSegmentOrigin = position;
                        }
                    }
                }
            }
            else this.path.push(position);
            
            if (segments !== undefined) {
                const lastSegment = segments[segments.length-1];
                let origin = this.lastSegmentOrigin;
                if (origin == undefined) origin = lastSegment.ray.A;
                const destination = position;
                const distance = canvas.grid.measurePath([origin, destination]).distance;
                const slope = origin.x != destination.x && origin.y != destination.y;
    
                if (slope && distance > 5) {
                    compatibilityHandler.ruler.addWaypoint(this.ruler, this.path[this.path.length-3]);
                    compatibilityHandler.ruler.addWaypoint(this.ruler, position);
                    //this.ruler._addWaypoint(this.path[this.path.length-3]);
                    //this.ruler._addWaypoint(position);
                    this.lastSegmentOrigin = position;
                }
            } 
        }

        else if (rulerSettings.mode == 'pathfinding') {
            const pathfindingDistance = game.settings.get(moduleName,'tokenRuler').distance * canvas.grid.size;

            if (!routingLibEnabled) {
                if (Date.now() - routingLibNotificationTimer > 10000) {
                    ui.notifications.warn("Material Plane: "+game.i18n.localize("MaterialPlane.Notifications.RoutingLib"));
                    routingLibNotificationTimer = Date.now();
                }
                return;
            }

            //variable to store all segments in
            let pathSegments = [];

            //push all previously locked segments
            for (let segment of this.pathFinderSegments) pathSegments.push(segment);

            //set the starting coordinate of the pathfinder
            if (this.pathFinderStart.x == undefined) this.pathFinderStart = this.origin;

            if (pathfindingDistance != 0) {
                //calculate the distance between the current position and the last locked segment
                const distanceFromLastLocked = canvas.grid.measurePath([position, this.pathFinderStart]).distance;

                //if this distance is small enough remove the last segment from storage and set the starting coordinate. This allows backtracking
                if (distanceFromLastLocked <= pathfindingDistance) {
                    const lastSegment = this.pathFinderSegments[this.pathFinderSegments.length-1];
                    if (lastSegment != undefined) {
                        const coordsArr = canvas.grid.grid.getPixelsFromGridPosition(lastSegment.y, lastSegment.x);
                        this.pathFinderStart = {x: coordsArr[0], y: coordsArr[1]};
                        this.pathFinderSegments.pop();
                    }
                }
    
                //for all segments that were calculated in the previous pathfinding calculation
                for (let i=0; i<this.pathFinderSegmentsPrevious.length; i++) {
                    const segment = this.pathFinderSegmentsPrevious[i];
                    const offset = canvas.grid.getOffset({x: segment.y,y: segment.x});
                    const coordsArr = [offset.i, offset.j];
                    const coords = {x: coordsArr[0], y: coordsArr[1]};

                    //calculate the distance between the segment and the current position
                    const distance = canvas.grid.measurePath([coords, position]).distance;
    
                    //if the distance is large enough, store all segments up until this point
                    if (distance > pathfindingDistance) {
                        this.pathFinderStart = coords;
                        for (let j=0; j<i; j++) {
                            this.pathFinderSegments.push(this.pathFinderSegmentsPrevious[j])
                            pathSegments.push(this.pathFinderSegmentsPrevious[j]);
                        }
                    } 
                }
            }
            
            //calculate the new path, starting from the last locked segment
            const startOffset = canvas.grid.getOffset(this.pathFinderStart);
            const from = [startOffset.i, startOffset.j];
            const endOffset = canvas.grid.getOffset(position);
            const to = [endOffset.i, endOffset.j];
            debug('ruler', `calculating ${from[1]}, ${from[0]}, to ${to[1]}, ${to[0]}`);
            const path = await routinglib.calculatePath({x:from[1],y:from[0]}, {x:to[1],y:to[0]});
            this.pathFinderSegmentsPrevious = path.path;

            this.ruler.clear();

            //push new pathfinder segments to locked segments
            for (let segment of path.path) pathSegments.push(segment);

            //add waypoints to ruler
            for (let segment of pathSegments) {
                const topLeftPoint = canvas.grid.getTopLeftPoint({i:segment.x, j:segment.y});
                const coordsArr = [topLeftPoint.x, topLeftPoint.y];
                const pos = {x: coordsArr[0], y: coordsArr[1]};
                this.ruler._addWaypoint(pos);
                debug('ruler', `segment is ${pos.x}, ${pos.y}`);
            }
        }
        compatibilityHandler.ruler.measure(this.ruler, position, this.path);
        //this.ruler.measure(position);
    }

    /**
     * Handle the stopping of the ruler
     */
    end() {
        this.token = undefined;
        compatibilityHandler.ruler.clear(this.ruler);
        //this.ruler.clear();
        this.ruler = undefined;
        this.previousPosition = {x: 0, y: 0};
        this.path = [];
        this.lastSegmentOrigin = undefined;
        this.pathFinderStart = {};
        this.pathFinderSegments = [];
        this.pathFinderSegmentsPrevious = [];
    }

    /**
     * On token drop
     */
    tokenDrop() {
        const rulerSettings = game.settings.get(moduleName,'tokenRuler');
        if (rulerSettings.mode != 'disabled' && rulerSettings.stop == 'tokenDrop') this.end();
    }
}
