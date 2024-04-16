import { findToken } from "../../IRtoken/tokenHelpers.js";

/**
 * Actions related to targeting
 * @param {*} command 
 * @param {*} data 
 * @param {*} status 
 * @returns 
 */
export function targetFunction(command,data,status) {
    //Clear all targets
    if (command == 'penA' && status == 'click') {
        for (let token of game.user.targets) {
            token.setTarget(false);
        }
    }
    //Target token
    if (command == 'penD' && status == 'click') {
        const token = findToken(data, undefined, undefined, 'target');
        if (token == undefined) return;
        
        token.setTarget(!token.isTargeted,{releaseOthers:false});
    }
}