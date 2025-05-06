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
        if (drawing != undefined && (drawing.type == compatibilityHandler.drawingClass().SHAPE_TYPES.POLYGON || drawing.type == compatibilityHandler.drawingClass().SHAPE_TYPES.FREEHAND) && newDrawing) {
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
            else if (drawing != undefined && drawing.type == compatibilityHandler.drawingClass().SHAPE_TYPES.POLYGON && drawing.document.bezierFactor == 0 && newDrawing) {
                drawing._addPoint({x:data.x,y:data.y},false)
            }
            //Start drawing
            else {
                let tool = menu.selectedDrawingToolName;

                let type;
                freehand = false;
                if (tool == 'rect') type = compatibilityHandler.drawingClass().SHAPE_TYPES.RECTANGLE;
                else if (tool == 'ellipse') type = compatibilityHandler.drawingClass().SHAPE_TYPES.ELLIPSE;
                else if (tool == 'polygon') type = compatibilityHandler.drawingClass().SHAPE_TYPES.POLYGON;
                else if (tool == 'freehand') {
                    type = compatibilityHandler.drawingClass().SHAPE_TYPES.POLYGON;
                    compatibilityHandler.controls.activateControl('drawings', 'freehand');
                    freehand = true;
                }

                const drawingData = {
                    shape: {
                        type: type,
                        width: 10,
                        height: 10,
                        points: tool === 'polygon' || tool === 'freehand' ? [0,0,1,0] : undefined
                    },
                    x: data.x,
                    y: data.y,
                    bezierFactor: tool === 'freehand' ? 0.5 : 0,
                    fillType:  menu.colors[menu.selectedFillColor].name === 'none' ? CONST.DRAWING_FILL_TYPES.NONE : CONST.DRAWING_FILL_TYPES.SOLID,
                    fillColor: menu.colors[menu.selectedFillColor].hex,
                    strokeColor: menu.colors[menu.selectedLineColor].hex
                }

                let drawings = await canvas.scene.createEmbeddedDocuments('Drawing', [
                    DrawingDocument.fromSource(drawingData)
                ]);

                drawing = canvas.drawings.placeables.find(d => d.id === drawings[0]._id);
                drawing._fixedPoints = [0,0]

                newDrawing = true;
            }
        }
        else if (status == 'hold') {
            if (drawing == undefined || menu.selectedDrawing == 6) return;

            if (drawing.type == compatibilityHandler.drawingClass().SHAPE_TYPES.POLYGON && (!freehand || freehand && !newDrawing)) return;

            if (drawing.type == compatibilityHandler.drawingClass().SHAPE_TYPES.POLYGON && newDrawing) {          
                drawing._addPoint({x:data.x, y:data.y});
                drawing.refresh();
            }

            //Resize drawing
            else {
                let dx = data.x - drawing.x;
                let dy = data.y - drawing.y;
                if (dx < 10) dx = 10;
                if (dy < 10) dy = 10;
                drawing.document.update({shape:{width:dx,height:dy}})
            }
            
        }
        else if (status == 'release') {
            if (drawing == undefined || menu.selectedDrawing == 6) return;
   
            if (drawing.type != compatibilityHandler.drawingClass().SHAPE_TYPES.POLYGON || drawing.document.bezierFactor > 0) {
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
            if (newDrawing && drawing.type == compatibilityHandler.drawingClass().SHAPE_TYPES.POLYGON) {
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
        if (newDrawing && drawing.type == compatibilityHandler.drawingClass().SHAPE_TYPES.POLYGON) {
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