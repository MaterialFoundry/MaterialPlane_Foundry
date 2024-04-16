
import { moduleName } from "../../../MaterialPlane.js";
import { IRtoken } from "../../IRtoken/IRtoken.js";
import { findToken } from "../../IRtoken/tokenHelpers.js";

let selectedToken;
let irToken;
let bar = {};

export function initializeTokenFunction() {
    irToken = new IRtoken;
}

/**
     * Actions related to tokens: Moving, rotating and delecting
     * @param {*} command 
     * @param {*} data 
     * @param {*} status 
     */
export function tokenFunction(command,data,status) {
    //Move token
    if (command == 'penD'){
        //Search for token
        if (status == 'click') {
            checkTokenClick(data);
        }
        //Perform token movement
        else if (status == 'hold') {
            irToken.update(data.rawCoords,{x:data.x, y:data.y},false)
        }  
        //Release token
        else if (status == 'release') {
            irToken.update(data.rawCoords,{x:data.x, y:data.y},false)
            irToken.dropIRtoken();
        }
    }

    //Deselect token
    else if (command == 'penA'){
        if (status == 'click') {
            checkTokenClick(data,true);
        }
    }

    //Rotate token
    else if (command == 'penB') {
        if (status == 'click') {
            checkTokenClick(data);
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
        else if (status == 'hold') {
            const angleChange = data.angle - bar.angle;
            if (command == 'penB') {
                bar = {
                    x0:data.x,
                    x1:data.x2,
                    y0:data.y,
                    y2:data.y2,
                    length:data.length,
                    angle:data.angle
                }
            } else {
                bar.angle = data.angle;
            }
            
            let forceNew = false;
            if (command == 'penB') irToken.update(data.rawCoords,{x:data.x, y:data.y},forceNew);
            else irToken.update(bar.rawCoords,{x:bar.x0, y:bar.y0},forceNew,false);
            irToken.token.document.rotation += angleChange;
            irToken.token.refresh();
            if (game.settings.get(moduleName,'movementMethod') == 'live') irToken.token.updateSource({noUpdateFog: false});
        }
        else if (status == 'release') {
            irToken.dropIRtoken(false);
        }  
    }
}

function checkTokenClick(data, forceRelease=false) {
    const token = findToken(data);
    if (token == undefined) {
        for (let t of canvas.tokens.controlled)
            t.release();
    }
    else if (forceRelease) {
        token.release();
    }
    else {
        if (token._controlled) token.release();
        else {
            token.control({releaseOthers:false});
            selectedToken = token;
        }
    }
}