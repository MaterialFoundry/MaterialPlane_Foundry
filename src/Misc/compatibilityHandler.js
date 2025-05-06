import { compatibleCore } from "./misc.js";
import { moduleName, configDialog } from "../../MaterialPlane.js";

export class compatibilityHandler {
    static isV13 = false;

    static init() { this.isV13 = compatibleCore('13'); }

    static createConfigButton(enableModule) {
        if (this.isV13) {
                Hooks.on("renderSidebar", (app) => {
                    if (document.getElementById('mpConfigSection')) return;
                    const section = document.createElement('section');
                    section.setAttribute('class', 'mpConfig flexcol');
                    section.setAttribute('id', 'mpConfigSection');

                    const title = document.createElement('h4');
                    title.setAttribute('class', 'divider');
                    title.innerHTML = 'Material Plane';
                    section.appendChild(title);

                    const button = document.createElement('button');
                    button.innerHTML = game.i18n.localize("MaterialPlane.Config.Title");
                    button.addEventListener("click",event => {
                        configDialog.setConfigOpen(true);
                        configDialog.render(true);
                    });
                    section.appendChild(button);

                    const settingsTab = Array.from(document.getElementById('sidebar-content').children).find(c => c.id === 'settings');
                    const gameSettingsSection = Array.from(settingsTab.children).find(s => s.className === 'settings flexcol')
                    gameSettingsSection.after(section);
                });
        }
        else {
            Hooks.on("renderSidebarTab", (app, html) => {
                enableModule = game.user.id == game.settings.get(moduleName,'ActiveUser');
                if (!enableModule && !game.user.isGM) return;
            
                if (app.options.id == 'settings') {
                    const popOut = app.popOut ? "_PopOut" : "";
                    const label = $(
                        `<div id="MP-section">
                        <h2>Material Plane</h2>
            
                        <button id="MaterialPlane_ConfigBtn${popOut}" title="Material Plane Configuration">
                            <i></i> ${game.i18n.localize("MaterialPlane.Config.Title")}
                        </button>
                        </div>
                        `
                    );
                    const setupButton = html.find("div[id='settings-game']");
                    setupButton.after(label);
                    
                    document.getElementById(`MaterialPlane_ConfigBtn${popOut}`).addEventListener("click",event => {
                        configDialog.setConfigOpen(true);
                        configDialog.render(true);
                    });
                }
            });
        }

    }

    static playersElement() {
        if (this.isV13) {

        }
        else {
            return document.getElementsByClassName("players-mode")[0];
        }
    }

    static ruler = {
        isV13: compatibilityHandler.isV13,

        draw: () => {
            if (this.isV13) {
                return canvas.controls.drawRuler(game.user);
            }
            else {
                const ruler = new Ruler(game.user);
                canvas.controls.rulers.addChild(ruler);
                return ruler;
            }
        },

        addWaypoint: (ruler, coords) => {
            if (this.isV13) return;
            else {
                ruler._addWaypoint(coords);
            }
        },

        removeWaypoint: (ruler, coords) => {
            if (this.isV13) return;
            else {
                ruler._removeWaypoint(coords);
            }
        },

        measure: (ruler, coords, path) => {
            if (this.isV13) {
                let rulerPath = structuredClone(path);
                rulerPath.push(coords);
                for (let c of rulerPath) c.elevation = 0;
                ruler.path = rulerPath;
            }
            else {
                ruler.measure(coords);
            }
        },

        clear: (ruler) => {
            if (this.isV13) ruler.reset();
            else ruler.clear();
        },

        setStartState: (ruler) => {
            if (this.isV13) return;
            ruler._state = Ruler.STATES.STARTING;
        }
    }

    static controls = {
        isV13: compatibilityHandler.isV13,

        activeControl: () => {
            if (this.isV13) {
                let controlName = ui.controls.control.name;
                if (controlName === 'tokens') controlName = 'token';
                else if (controlName === 'templates') controlName = 'measure';
                return controlName;
            }
            else return ui.controls.activeControl;
        },

        activateControl: (controlName, toolName) => {
            if (this.isV13) {
                if (controlName === 'token') controlName = 'tokens';
                else if (controlName === 'measure') controlName = 'templates';
                const control = Object.values(ui.controls.controls).find(c => c.name == controlName);
                let tool;
                if (toolName) {
                    tool = Object.values(control.tools).find(t => t.name == toolName);
                }
                ui.controls.activate({control: control.name, tool: tool?.name});
            }
            else {
                const control = ui.controls.controls.find(c => c.name == controlName);
                ui.controls.initialize({layer:control.layer});
                canvas.layers.find(l => l.options.name == control.layer).activate();
                if (toolName)
                    ui.controls.controls.find(c => c.name == controlName).activeTool = toolName;
                ui.controls.render(); 
            }
        }
    }

    static terminateTokenAnimation(token) {
        if (this.isV13) {}
        else CanvasAnimation.terminateAnimation(token.animationName);
    }

    static drawingClass() {
        if (this.isV13) return foundry.canvas.placeables.Drawing;
        else return Drawing;
    }
}
