import { compatibleCore } from "../../Misc/misc.js";

let template;
let newTemplate = false;
let bar;

/**
 * Template related actions
 * @param {*} command 
 * @param {*} data 
 * @param {*} status 
 * @returns 
 */
export function templateFunction(command,data,status, menu) {
    if (command == 'penD') {
        if (status == 'click') {
            //Select template
            if (menu.selectedTemplate == 1) {
                template = getNearestTemplate(data);
            }
            //Delete template
            else if (menu.selectedTemplate == 6) {
                template = getNearestTemplate(data);
                if (template != undefined) {
                    template.document.delete();
                    template = undefined;
                }
            }

            //Draw new template
            else {
                let tool = menu.selectedTemplateName;

                const snappedPosition = canvas.grid.getSnappedPosition(data.x, data.y, canvas.templates.gridPrecision);

                const templateData = {
                    user: game.user.id,
                    t: tool,
                    x: snappedPosition.x,
                    y: snappedPosition.y,
                    distance: 1,
                    direction: 0,
                    fillColor: game.user.color || "#FF0000"
                };

                // Apply some type-specific defaults
                const defaults = CONFIG.MeasuredTemplate.defaults;
                if ( tool === "cone") templateData["angle"] = defaults.angle;
                else if ( tool === "ray" ) templateData["width"] = (defaults.width * canvas.dimensions.distance);

                const doc = new MeasuredTemplateDocument(templateData, {parent: canvas.scene});

                template = new MeasuredTemplate(doc);
                
                canvas.templates.preview.addChild(template);
                template.draw();

                newTemplate = true;
            }
        }
        //Set size of template
        else if (status == 'hold') {
            if (template == undefined || menu.selectedTemplate == 6) return;
            const dx = data.x - template.x;
            const dy = data.y - template.y;
            const length = Math.round(Math.sqrt(dx*dx + dy*dy)*canvas.dimensions.distance/canvas.dimensions.size);
            const angle = 90-Math.atan2(dx,dy)*180/Math.PI;
            template.document.distance = length;
            template.document.direction = angle;
            template.refresh();
        }
        //Release template
        else if (status == 'release') {
            if (template == undefined || menu.selectedTemplate == 6) return;
            if (newTemplate) {
                menu.setSelected(1,true)
                newTemplate = false;
                template.controlIcon.visible = false;
                template._destroy();
                canvas.templates.preview.removeChild(template);
                const cls = getDocumentClass('MeasuredTemplate');
                return cls.create(template.document.toObject(false), {parent: canvas.scene});
            }
            else {
                template.document.update({distance:template.document.distance,direction:template.document.direction});
            }  
                
        }   
    }
    else if (command == 'penA') {
        if (status == 'click')
            template = getNearestTemplate(data);
        else if (status == 'hold') {
            if (template == undefined || menu.selectedTemplate == 6) return;
            template.document.x = data.x;
            template.document.y = data.y;

            if (compatibleCore('11.0'))
                template.renderFlags.set({refreshPosition:true, refreshGrid:true})
            else {
                template.refresh();
                template.highlightGrid();
            }
        }
        else if (status == 'release') {
            if (template == undefined || menu.selectedTemplate == 6) return;
            const snappedPosition = canvas.grid.getSnappedPosition(data.x, data.y, canvas.templates.gridPrecision);
            template.document.update({x:snappedPosition.x,y:snappedPosition.y});
        }
    }
    else if (command == 'penB') {
        if (status == 'click') {
            template = getNearestTemplate(data);
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
            if (template == undefined || menu.selectedTemplate == 6) return;
            const angleChange = data.angle - bar.angle;
            bar = {
                x0:data.x,
                x1:data.x2,
                y0:data.y,
                y2:data.y2,
                length:data.length,
                angle:data.angle
            }
            
            if (!isNaN(angleChange)) template.document.direction += angleChange;
            template.document.x = data.x;
            template.document.y = data.y;
            
            template.refresh();
            template.highlightGrid();
        }
        else if (status == 'release') {
            if (template == undefined || menu.selectedTemplate == 6) return;
            const snappedPosition = canvas.grid.getSnappedPosition(data.x, data.y, canvas.templates.gridPrecision);
            template.document.update({x:snappedPosition.x,y:snappedPosition.y,direction:template.document.direction});
        }  
    }
}

function getNearestTemplate(data) {
    let templates = canvas.templates.placeables;
    let nearestTemplate = undefined;
    let nearestDistance = 10000;
    for (let template of templates) {
        const dist = Math.abs(template.x-data.x) + Math.abs(template.y-data.y)
        if (dist < canvas.dimensions.size*5 && dist < nearestDistance) {
            nearestTemplate = template;
            nearestDistance = dist;
        }
    }
    return nearestTemplate;
}