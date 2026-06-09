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
     * Handle token ruler for the findMovementPath case.
     * @param {Object} position.  Contains x and y canvas value of desired end point of ruler.
     * @param {boolean} draw_ruler: Whether the ruler should be drawn, or just the calculations performed.
     *        This is used in tokenDropDrop() to calculate a path in case the ruler mode is not set to findMovementPath
     *
     */
    async findMovementPath(position, draw_ruler=true) {
        // The position values passed to the ruler are center points on the space.  But findMovementPath()
        // uses top left, the ruler uses top left, token is top left, so easier to just have everything
        // use that as the reference coordinates.
        const gridSize = canvas.dimensions.size;
        const newpos = {x: position.x - gridSize/2, y: position.y - gridSize/2, snapped: true};
        const tok = this.token;
        let unreachableWaypoints = [];
        let segments = [];

        if (tok == undefined) return;

        debug('ruler', `findMovementPath calculating path from ${tok.x}, ${tok.y} to ${newpos.x}, ${newpos.y}`);

        const pathJob = tok.findMovementPath([{x: tok.x, y: tok.y}, newpos], {preview: true, history:true});
        let waypoints = await pathJob.promise;

        // By default, findMovementPath() will return a path as far as it can.  Other modules may change this
        // behavior and return all or nothing, so handle that scenario.  Wayfinder seems to just return a single
        // waypoint if there is no path - that of the token itself.  It is still desirable to draw the dashed
        // (unreachable) line in this case.
        if (waypoints === undefined || waypoints.length < 2) {
            debug('ruler', `findMovementPath did not find path from ${tok.x}, ${tok.y} to ${newpos.x}, ${newpos.y}`);
            this.path = [];
            unreachableWaypoints = tok.document.getCompleteMovementPath([{x: tok.x, y: tok.y}, newpos]);
        } else {
            this.path = waypoints;

            // The ruler needs to have every space as a waypoint to be drawn correctly, so use
            // getCompleteMovementPath() to do that.
            for (let i = 1; i < waypoints.length; i++) {
                let intermediateWaypoints = tok.document.getCompleteMovementPath([waypoints[i - 1], waypoints[i]]);

                let intermediateSegments = intermediateWaypoints.map(obj => ({
                    ...obj,
                    checkpoint: false,
                    intermediate: true
                }));

                // The first and last segment need some special handling in order for the ruler to be drawn correctly.
                intermediateSegments[0].checkpoint = true;
                intermediateSegments[0].intermediate = false;
                // Last segment also is not intermediate
                intermediateSegments[intermediateSegments.length - 1].intermediate = false;
                segments.push(...intermediateSegments);
            }
            /**
             * If the final point in the path calculated does not match the final desired coordinates,
             * something must be blocking the path.  Calculate a path from that to final desired
             * space and put that in unreachableWaypoints.  By default, foundry draws that as
             * a dashed line.
             */
            unreachableWaypoints = [];
            const lastWaypoint = segments.at(-1);

            if (!comparePositions(newpos, lastWaypoint)) {
                debug('ruler', `Path is blocked, last waypoint is ${lastWaypoint.x}, ${lastWaypoint.y}, target is ${newpos.x}, ${newpos.y}`);

                lastWaypoint.snapped = true;
                unreachableWaypoints = tok.document.getCompleteMovementPath([lastWaypoint, newpos]);
            }
        }

        // If not drawing the ruler, do not need to deal with the unreachableWaypoints, as none of the data
        // below is stored in the ruler.
        if (!draw_ruler) return;

        /**
         * Now the distance between all those points needs to be calculated.  Need to merge the results
         * from measureMovementPath() and the waypoints.  It seems odd to calculate the distance for the
         * unreachable waypoints, but that is what the standard ruler (mouse drag) does, so follow that
         * behavior.  Want to do only one measurement call so that it can properly take into account
         * any special movement rules (every other diagonal counting 2, which some game systems do)
         */
        const dist = tok.measureMovementPath([...segments, ...unreachableWaypoints]);
        this.pathFinderSegments = segments.map((wp, idx) =>
            ({...wp, cost: dist.waypoints[idx].backward?.cost}));

        let unreachableWPDist = [];
        if (unreachableWaypoints.length > 0) {
            // Like the planned waypoints, the final waypoint needs different checkpoint & intermediate values.
            // Since these are unreachable, it should be a straight line.
            unreachableWPDist = unreachableWaypoints.map((wp, idx) =>
                ({
                    ...wp,
                    cost: dist.waypoints[idx + segments.length].backward?.cost,
                    checkpoint: false,
                    elevation: 0,
                    intermediate: true
                }))

            // If none of the planned movement is reachable, then the entire ruler is unreachable waypoints.
            // In that case, need to set these values so it is properly used as a starting point.
            if (segments.length == 0) {
                unreachableWPDist[0].checkpoint = true;
                unreachableWPDist[0].intermediate = false;
            }

            unreachableWPDist[unreachableWaypoints.length - 1].checkpoint = true;
            unreachableWPDist[unreachableWaypoints.length - 1].intermediate = false;
        }
        /**
         * This is using the token's ruler property, which is a bit different from how the rest of this file deals
         * with it (using the canvas ruler).  This works for V13, not sure how well it would work on older
         * versions of foundry (foundry API documentation does not detail when changes are made to the API)
         * While each ruler is associated with a specific foundry user, test seems to show that multiple rulers
         * can still be displayed at the same time.
         */
        let plannedMovement={};
        plannedMovement[game.user.id] = {history: tok.document.movementHistory, hidden: false, searching:false,
                unreachableWaypoints:unreachableWPDist, foundPath: this.pathFinderSegments};
        tok.ruler.refresh({passedWaypoints: [], pendingWaypoints: [], plannedMovement: plannedMovement});
        tok.ruler.visible = true;
        tok.ruler.draw();
    }

    /**
     * Handle token/ruler movement
     * @param {Object} position.  Contains x and y canvas positions.
     */
    async move(position) {
        const rulerSettings = game.settings.get(moduleName,'tokenRuler');
        if (rulerSettings.mode == 'disabled') return;

        debug('ruler', `move ruler to ${position.x}, ${position.y}`);

        //If the position of the ruler's endpoint has not changed, return
        if (comparePositions(this.previousPosition, position)) return;
        this.previousPosition = position;

        /**
         * The logic if using findMovementPath is different enough from the rest in
         * this function that it is cleaner to just put it in its own function
         */
        if (rulerSettings.mode == 'findMovementPath') {
            this.findMovementPath(position, true);
            return
        }


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
        const rulerSettings = game.settings.get(moduleName,'tokenRuler');

        if (rulerSettings.mode === 'findMovementPath') {
            this.token.ruler.clear();
            this.path = [];
            this.token = undefined;
            this.ruler = undefined;
            return;
        }

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
