import { moduleName } from "../../../MaterialPlane.js";

export function macroFunction(command, coordinates, status, data, menu) {
    const macros = game.settings.get(moduleName,'penMacros').filter(m => m.m == menu.selectedMacro && m.button == command && m.mode == status && (m.penId == '' || m.penId == data.id));

    for (let macro of macros) {
        const selectedMacro = game.macros.get(macro.macro);
        if (selectedMacro == undefined) continue;

        let argument = JSON.parse(macro.args || "{}")
        try {
            selectedMacro.execute({
                button: command,
                buttonMode: status,
                coordinates: {x: coordinates.x, y: coordinates.y},
                coordinates2: {x: coordinates.x2, y: coordinates.y2},
                angle: coordinates.angle,
                length: coordinates.length,
                id: data.id,
                raw: data.irPoints,
                ...argument,
            });
        } catch (err) {
            console.error(err)
        }
        
    }
}