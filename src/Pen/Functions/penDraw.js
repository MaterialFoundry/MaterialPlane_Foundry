import { compatibilityHandler } from "../../Misc/compatibilityHandler.js";

let drawing;
let lastDrawing;
let newDrawing = false;
let drawingData;
let bar;
let drawingRotation;
let freehand = false;

/**
 * Functions related to drawing
 * @param {*} command 
 * @param {*} data 
 * @param {*} status 
 * @returns 
 */
export async function drawFunction(command, data, status, menu) {
    if (command == 'penIdle') {
        if (drawing != undefined && (drawing.type == compatibilityHandler('drawingTypes').POLYGON || drawing.type == compatibilityHandler('drawingTypes').FREEHAND) && newDrawing) {
            drawing._addPoint({x:data.x, y:data.y}, {snap:false, temporary:true});
            drawing.renderFlags.set({refreshShape: true});
        }
    }
    else if (command == 'penD') {
        if (status == 'click') {
            //Select drawing
            if (menu.selectedDrawingTool == 1) {
                drawing = getNearestDrawing(data);
                lastDrawing = drawing;
            }
            //Delete drawing
            else if (menu.selectedDrawingTool == 6) {
                drawing = getNearestDrawing(data);
                if (drawing != undefined) {
                    drawing.document.delete();
                    drawing = undefined;
                    lastDrawing = undefined;
                }
            }
            //Add point to the drawing
            else if (drawing != undefined && drawing.type == compatibilityHandler('drawingTypes').POLYGON && drawing.document.bezierFactor == 0 && newDrawing) {
                drawing._addPoint({x:data.x,y:data.y},false)
            }
            //Start drawing
            else {
                let tool = menu.selectedDrawingToolName;
                let drawingData = canvas.layers.filter(layer => layer.name == 'DrawingsLayer')[0]._getNewDrawingData({x:data.x,y:data.y})
                let type;
                freehand = false;
                if (tool == 'rect') type = compatibilityHandler('drawingTypes').RECTANGLE;
                else if (tool == 'ellipse') type = compatibilityHandler('drawingTypes').ELLIPSE;
                else if (tool == 'polygon') type = compatibilityHandler('drawingTypes').POLYGON;
                else if (tool == 'freehand') {
                    type = compatibilityHandler('drawingTypes').POLYGON;
                    ui.controls.controls.find(c => c.name == 'drawings').activeTool = 'freehand';
                    ui.controls.render(); 
                    freehand = true;
                }

                drawingData.shape.type = type;
                if (tool == 'freehand') drawingData.bezierFactor = 0.5;
                drawingData.fillColor = menu.colors[menu.selectedFillColor].hex;
                drawingData.fillType = menu.colors[menu.selectedFillColor].name == 'none' ? 0 : 1;
                drawingData.strokeColor = menu.colors[menu.selectedLineColor].hex;
                drawingData.strokeAlpha = menu.colors[menu.selectedLineColor].name == 'none' ? 0 : 1;
                drawingData.x = data.x;
                drawingData.y = data.y;
                drawingData.strokeAlpha = 1;
                drawingData.strokeWidth = 8;

                const document = new DrawingDocument(drawingData, {parent: canvas.scene});
                drawing = new Drawing(document);
                canvas.drawings.preview.addChild(drawing);
                drawing._addPoint({x:data.x, y:data.y},false)
                drawing.draw();
                
                newDrawing = true;
            }
        }
        else if (status == 'hold') {
            if (drawing == undefined || menu.selectedDrawing == 6) return;

            if (drawing.type == compatibilityHandler('drawingTypes').POLYGON && (!freehand || freehand && !newDrawing)) return;

            if (drawing.type == compatibilityHandler('drawingTypes').POLYGON && newDrawing) {          
                drawing._addPoint({x:data.x, y:data.y});
                drawing.refresh();
            }

            //Resize drawing
            else {
                const dx = data.x - drawing.x;
                const dy = data.y - drawing.y;

                drawing.document.shape.width = dx;
                drawing.document.shape.height = dy;
                drawing.refresh();
            }
            
        }
        else if (status == 'release') {
            if (drawing == undefined || menu.selectedDrawing == 6) return;
   
            if (drawing.type != compatibilityHandler('drawingTypes').POLYGON || drawing.document.bezierFactor > 0) {
                if (newDrawing) {
                    newDrawing = false;
                    canvas.drawings.preview.removeChild(drawing);
                    const cls = getDocumentClass('Drawing');
                    lastDrawing = await cls.create(drawing.document.toObject(false), {parent: canvas.scene});
                    drawing.destroy();
                    drawing == undefined;
                }
                else {   
                    drawing.document.update({width:drawing.shape.width, height:drawing.shape.height});
                    lastDrawing = drawing;
                    drawing.refresh();
                    drawing == undefined;
                }
            }
        }   
    }
    else if (command == 'penA') {
        if (status == 'click') {
            if (newDrawing && drawing.type == compatibilityHandler('drawingTypes').POLYGON) {
                newDrawing = false;
                canvas.drawings.preview.removeChild(drawing);
                const cls = getDocumentClass('Drawing');
                lastDrawing = await cls.create(drawing.document.toObject(false), {parent: canvas.scene});
                drawing == undefined;
            }
            else {
                drawing = getNearestDrawing(data);
                lastDrawing = drawing;
            }
        }
        else if (status == 'hold') {
            if (drawing == undefined || menu.selectedDrawing == 6) return;
            drawing.document.x = data.x - drawing.shape.width/2;
            drawing.document.y = data.y - drawing.shape.height/2;
            drawing.refresh();
        }
        else if (status == 'release') {
            if (drawing == undefined || menu.selectedDrawing == 6) return;
            drawing.document.update({x:drawing.x, y:drawing.y});
        }
    }
    else if (command == 'penB') {
        if (newDrawing && drawing.type == compatibilityHandler('drawingTypes').POLYGON) {
            if (status == 'click') {

            }
            return;
        }
        if (status == 'click') {
            drawing = getNearestDrawing(data);
            lastDrawing = drawing;
            drawingRotation = JSON.parse(JSON.stringify(drawing.shape.rotation));
            bar = {
                x0:data.x,
                x1:data.x2,
                y0:data.y,
                y2:data.y2,
                length:data.length,
                angle:data.angle
            }
        }
        else if (status == 'hold') {
            if (drawing == undefined || menu.selectedDrawing == 6) return;
            const angleChange = data.angle - bar.angle;
            drawing.document.x = data.x - drawing.shape.width/2;
            drawing.document.y = data.y - drawing.shape.height/2;

            if (!isNaN(angleChange)) {
                drawing.document.rotation = drawingRotation + angleChange;
            }
            drawing.refresh();
            
        }
        else if (status == 'release') {
            if (drawing == undefined || menu.selectedDrawing == 6) return;
            drawing.document.update({x:drawing.document.x, y:drawing.document.y, rotation:drawing.document.rotation})
        }  
    }
}

function getNearestDrawing(data) {
    let drawings = canvas.drawings.placeables;
    let nearestDrawing = undefined;
    let nearestDistance = 250;
    for (let drawing of drawings) {
        let dist;
        dist = Math.abs(drawing.x+drawing.document.shape.width/2-data.x) + Math.abs(drawing.y+drawing.document.shape.height/2-data.y);
        if (dist < canvas.dimensions.size*5 && dist < nearestDistance) {
            nearestDrawing = drawing;
            nearestDistance = dist;
        }
    }
    return nearestDrawing;
}