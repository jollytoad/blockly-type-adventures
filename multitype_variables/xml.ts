import Blockly from 'blockly'

/**
 * Decode an XML list of variables and add the variables to the workspace.
 * @param {!Element} xmlVariables List of XML variable elements.
 * @param {!Blockly.Workspace} workspace The workspace to which the variable
 *     should be added.
 */
Blockly.Xml.domToVariables = function (xmlVariables, workspace) {
    for (var i = 0, xmlChild; xmlChild = xmlVariables.children[i]; i++) {
        if (xmlChild.nodeType != Blockly.utils.dom.Node.ELEMENT_NODE) {
            continue  // Skip text nodes.
        }
        var type = xmlChild.getAttribute('type')
        var id = xmlChild.getAttribute('id')!
        var name: string = xmlChild.textContent!

        var types = type && type.indexOf(',') > -1 ? type.split(',').sort() : type

        workspace.createVariable(name, types as any, id)
    }
}
