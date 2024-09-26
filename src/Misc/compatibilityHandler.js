import { compatibleCore } from "./misc.js";

let isV12 = false;

function selectMP(selected, options) {
    const escapedValue = RegExp.escape(Handlebars.escapeExpression(selected));
    const rgx = new RegExp(` value=[\"']${escapedValue}[\"\']`);
    const html = options.fn(this);
    return html.replace(rgx, "$& selected");
}

export function compatibilityInit() {
    isV12 = compatibleCore('12');

    /**
     * This is to prevent the handlebar compatibility warning in forms by temporarily registering a custom handlebar. When v11 support is dropped, replace all {{#selectMP}} instances with {{#selectOptions}}
     */
    if (isV12)           Handlebars.registerHelper('selectMP', selectMP);
    else                 Handlebars.registerHelper('selectMP', Handlebars.helpers.select);
}

export function compatibilityHandler(id, ...args) {
    if (id == 'mergeObject')                return mergeObj(args);
    else if (id == 'tokenCenter')           return tokenCenter(args[0], args[1], args[2]);
    else if (id == 'gridCenter')            return gridCenter(args[0], args[1]);
    else if (id == 'initializeSources')     return initializeSources(args[0]);
    else if (id == 'canvasWidth')           return canvasWidth();
    else if (id == 'canvasHeight')          return canvasHeight();
    else if (id == 'getGridOffset')         return getGridOffset(args[0], args[1]);
    else if (id == 'getTopLeftPoint')       return getTopLeftPoint(args[0], args[1]);
    else if (id == 'testAdjacency')         return testAdjacency(args[0], args[1]);
    else if (id == 'measureDistance')       return measureDistance(args[0], args[1], args[2]);
    else if (id == 'gridSize')              return gridSize();
    else if (id == 'drawingTypes')          return drawingTypes();
    else if (id == 'snappedPoint')          return snappedPoint(args[0]);
}

function mergeObj(args) {
    if (isV12)   return foundry.utils.mergeObject(args[0], args[1], args[2]);
    else         return mergeObject(args[0], args[1], args[2]);
}

function tokenCenter(token, x, y) {
    if (isV12)  return token.getCenterPoint({x, y});
    else        return token.getCenter(x,y);
}

function gridCenter(x, y) {
    if (isV12)  return canvas.grid.getCenterPoint({x, y});
    else        {
        let center = canvas.grid.getCenter(x, y);
        return {x: center[0], y: center[1]};
    }
}

function initializeSources(token) {
    if (isV12)  token.initializeSources();
    else        token.updateSource({noUpdateFog: false});
}

function canvasWidth() {
    if (isV12)  return canvas.grid.sizeX;
    else        return canvas.grid.w;
}

function canvasHeight() {
    if (isV12)  return canvas.grid.sizeY;
    else        return canvas.grid.h;
}

function getGridOffset(x, y) {
    if (isV12)  {
        const offset = canvas.grid.getOffset({x,y});
        return [offset.i, offset.j];
    }
    else return canvas.grid.grid.getGridPositionFromPixels(x, y);
}

function getTopLeftPoint(x, y) {
    if (isV12)  {
        const topLeftPoint = canvas.grid.getTopLeftPoint({i:x, j:y});
        return [topLeftPoint.x, topLeftPoint.y];
    }
    else        return canvas.grid.grid.getPixelsFromGridPosition(x, y);
}

function testAdjacency(coords1, coords2) {
    if (isV12)  return canvas.grid.testAdjacency(coords1, coords2);
    else        return canvas.grid.isNeighbor(coords1.i, coords1.j, coords2.i, coords2.j);
}

function measureDistance(origin, destination, options) {
    if (isV12)  return canvas.grid.measurePath([origin, destination]).distance;
    else        return canvas.grid.measureDistance(origin, destination, options);
}

function gridSize() {
    if (isV12)  return canvas.grid.size;
    else        return canvas.grid.grid.options.dimensions.distance;
}

function drawingTypes() {
    if (isV12)  return Drawing.SHAPE_TYPES;
    else        return CONST.DRAWING_TYPES;
}

function snappedPoint(position) {
    if (isV12)  return canvas.grid.getSnappedPoint(position, {mode:0});
    else        return canvas.grid.getSnappedPosition(position.x, position.y, canvas.templates.gridPrecision);
}
