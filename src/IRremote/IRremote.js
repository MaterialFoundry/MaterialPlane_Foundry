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
        if (document.getElementById('MPirRemoteSetup') != undefined) {
            document.getElementById('MP_lastRemoteProtocol').value = data.protocol;
            document.getElementById('MP_lastRemoteCode').value = data.code;
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

export class remoteSetup extends FormApplication {
    constructor(data, options) {
        super(data, options);
        this.codes = [];
        this.update = false;
    }
  
    /**
     * Default Options for this FormApplication
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "MPirRemoteSetup",
            title: "Material Plane: IR Remote Setup",
            template: "./modules/MaterialPlane/templates/remoteSetup.html",
            height: "auto"
        });
    }
  
    /**
     * Provide data to the template
     */
    getData() {
        
       this.codes = game.settings.get(moduleName,'remoteSetup');
       let irCodes = [];
       let iteration = 0;
       for (let code of this.codes) {
           irCodes.push({
            iteration,
            name:       code.name,
            protocol:   code.protocol,
            code:       code.code,
            macro:      code.macro,
            argument:   code.argument,
            delay:      code.delay
           });
           iteration++;
       }
        return {
            lastCode: irRemote.getLastCode().code,
            lastProtocol: irRemote.getLastCode().protocol,
            irCodes,
            macros: game.macros
        } 
    }
  
    /**
     * Update on form submit
     * @param {*} event 
     * @param {*} formData 
     */
    async _updateObject(event, formData) {
 
    }
  
    activateListeners(html) {
        super.activateListeners(html);
        
        const name = html.find("input[name='name']");
        const protocol = html.find("input[name='protocol']");
        const code = html.find("input[name='code']");
        const macro = html.find("select[name='macro']");
        const argument = html.find("input[name='argument']");
        const delay = html.find("input[name='delay']");
        const setDataBtn = html.find("button[name='setData']");
        const deleteBtn = html.find("button[name='delete']");
        const addBtn = html.find("button[name='add']");

        name.on("change", (event) => {
            const id = event.currentTarget.id.replace('remoteName-','');
            this.codes[id].name = event.currentTarget.value;
            this.updateSettings(this.codes);
        });

        protocol.on("change", (event) => {
            const id = event.currentTarget.id.replace('remoteProtocol-','');
            this.codes[id].protocol = event.currentTarget.value;
            this.updateSettings(this.codes);
        });

        code.on("change", (event) => {
            const id = event.currentTarget.id.replace('remoteCode-','');
            this.codes[id].code = event.currentTarget.value;
            this.updateSettings(this.codes);
        });

        macro.on("change", (event) => {
            const id = event.currentTarget.id.replace('remoteMacro-','');
            this.codes[id].macro = event.currentTarget.value;
            this.updateSettings(this.codes);
        });

        argument.on("change", (event) => {
            const id = event.currentTarget.id.replace('remoteArgument-','');
            this.codes[id].argument = event.currentTarget.value;
            this.updateSettings(this.codes);
        });

        delay.on("change", (event) => {
            const id = event.currentTarget.id.replace('remoteDelay-','');
            this.codes[id].delay = event.currentTarget.value;
            this.updateSettings(this.codes);
        });

        setDataBtn.on("click", (event)=>{
            const id = event.currentTarget.id.replace('remoteSetData-','');
            this.codes[id].protocol = document.getElementById("MP_lastRemoteProtocol").value;
            this.codes[id].code = document.getElementById("MP_lastRemoteCode").value;
            document.getElementById(`remoteProtocol-${id}`).value = document.getElementById("MP_lastRemoteProtocol").value;
            document.getElementById(`remoteCode-${id}`).value = document.getElementById("MP_lastRemoteCode").value;
            this.updateSettings(this.codes);
        });

        deleteBtn.on("click", (event)=>{
            const id = event.currentTarget.id.replace('remoteDelete-','');
            this.codes.splice(id,1);
            this.updateSettings(this.codes, true);
        });

        addBtn.on("click",(event)=>{
            this.codes.push({
                name:'',
                protocol:'',
                code:'',
                macro: undefined,
                argument: '',
                delay:250
            })
            this.updateSettings(this.codes, true);
        });
    }

    async updateSettings(settings,render=false) {
        await game.settings.set(moduleName,'remoteSetup',settings);
        if (render) {
            this.update = true;
            this.render(true);
        }
    }

  }