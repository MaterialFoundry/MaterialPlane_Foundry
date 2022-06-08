import { moduleName, irRemote } from "../../MaterialPlane.js";

export class IRremote {
    constructor() { 
        this.lastCode = {
            protocol: '',
            code: ''
        };
        this.timeStamps = [];
        this.argumentsEnabled = undefined;
    }

    newCode(data) {
        this.lastCode = data;
        if (document.getElementById('MaterialPlane_Config') != undefined) {
            document.getElementById('mpLastIrProtocol').value = data.protocol;
            document.getElementById('mpLastIrCode').value = data.code;

            for (let i=0; i<999; i++) {
                let config = document.getElementById("mpIrCode-"+i);
                if (config == null) break;
                if (data.code == config.value) config.style.color="green";
                else config.style.color="";
            }
        }

        if (this.argumentsEnabled == undefined) {
            let argumentsEnabled = false;
            let furnace = game.modules.get("furnace");
            if (furnace != undefined && furnace.active && compatibleCore("0.8.1")==false) argumentsEnabled = true;
            else {
                let advancedMacros = game.modules.get("advanced-macros");
                if (advancedMacros != undefined && advancedMacros.active) argumentsEnabled = true;
            }
            this.argumentsEnabled = argumentsEnabled;
        }
        
        const codes = game.settings.get(moduleName,'remoteSetup')
        for (let i=0; i<codes.length; i++) { 
            const code = codes[i];
            if (code.protocol == data.protocol && code.code == data.code) {
                if (this.timeStamps[i] != undefined && Date.now() - this.timeStamps[i] < code.delay) return;
                this.timeStamps[i] = Date.now();
                const macro = game.macros.get(code.macro);
                if (macro == undefined) return;
                if (this.argumentsEnabled == false || code.argument == '') macro.execute();
                else {
                    let chatData = {
                        user: game.user._id,
                        speaker: ChatMessage.getSpeaker(),
                        content: "/'" + macro.name + "' " + code.argument
                    };
                    ChatMessage.create(chatData, {});
                }
            }
        }
            
    }

    getLastCode() {
        return this.lastCode;
    }
}