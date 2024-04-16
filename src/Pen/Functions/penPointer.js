import { MovingAverage } from "../../Misc/misc.js";

let canvasAverage = {
    x: new MovingAverage(10),
    y: new MovingAverage(10),
    scale: new MovingAverage(10)
}

let canvasPosition = {};
let canvasMoveOrigin = {x:0,y:0};
let bar = {};

/**
     * Actions related to the canvas: clicking, panning and zooming
     * @param {*} command 
     * @param {*} data 
     * @param {*} status 
     */
export function pointerFunction(command, data, status) {
    //Click canvas elements
    if (command == 'penD' && status == 'click') {
        //Scale coordinates
        const x = data.rawCoords.x / 4096 * window.innerWidth;
        const y = data.rawCoords.y / 4096 * window.innerHeight;

        //Look for a clickeable element
        let element = document.elementFromPoint(x,y)
        if (element != null && element.id != 'board') {
            element.click();
        }
        //Else, check for doors
        else {
            checkDoorClick(data);
        }
    }
    //Pan
    else if (command == 'penA'){
        //Start pan
        if (status == 'click') {
            canvasPosition = JSON.parse(JSON.stringify(canvas.scene._viewPosition));
            canvasMoveOrigin = {x:data.x, y:data.y};
            canvasAverage.x.reset();
            canvasAverage.y.reset();
        }
        //Continue pan
        else if (status == 'hold') {
            const x = canvasAverage.x.newValue(data.x);
            const y = canvasAverage.y.newValue(data.y);
            
            const moved = {
                x: canvasMoveOrigin.x - x,
                y: canvasMoveOrigin.y - y
            }

            canvas.animatePan({x: canvasPosition.x + moved.x, y: canvasPosition.y + moved.y, duration: 50})
        }
    }
    
    //Zoom
    else if (command == 'penB') {
        //Start zoom
        if (status == 'click') {
            canvasPosition = JSON.parse(JSON.stringify(canvas.scene._viewPosition));
            canvasAverage.scale.reset();

            bar = {
                x0:data.x,
                x1:data.x2,
                y0:data.y,
                y2:data.y2,
                length:data.length,
                angle:data.angle,
                rawCoords: data.rawCoords
            }
        }
        //Continue zoom
        else if (status == 'hold') {
            const angle = canvasAverage.scale.newValue(bar.angle-data.angle);
            canvas.animatePan({scale: canvasPosition.scale + angle*0.02, duration:50});
        }
    } 
}

function checkDoorClick(data) {
    const doors = canvas.walls.doors;
    for (let door of doors) {
        const position = door.doorControl.position;
        const hitArea = door.doorControl.hitArea;

        if (Math.abs(data.x - position.x - hitArea.width/2) <= hitArea.width/2 && Math.abs(data.y - position.y - hitArea.height/2) <= hitArea.height/2) {
            const event = {
                button: 0,
                stopPropagation: event => {return;}
            }
            door.doorControl._onMouseDown(event);
        }
    }
}