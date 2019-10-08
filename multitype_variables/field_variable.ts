import Blockly from 'blockly'

/**
 * Initialize this field based on the given XML.
 * @param {!Element} fieldElement The element containing information about the
 *    variable field's state.
 */
Blockly.FieldVariable.prototype.fromXml = function (fieldElement) {
    var id = fieldElement.getAttribute('id')!
    var variableName = fieldElement.textContent!
    // 'variabletype' should be lowercase, but until July 2019 it was sometimes
    // recorded as 'variableType'.  Thus we need to check for both.
    var variableType = fieldElement.getAttribute('variabletype') ||
        fieldElement.getAttribute('variableType') || ''

    var types = variableType.split(',').sort()

    var variable = Blockly.Variables.getOrCreateVariablePackage(
        this.workspace_, id, variableName, types as any)

    var existingType = Array.isArray(variable.type) ? (variable.type as string[]).slice().sort().join(',') : variable.type

    // This should never happen :)
    if (types.join(',') !== existingType) {
        throw Error('Serialized variable type with id \'' +
            variable.getId() + '\' had type "' + variable.type + '" and ' +
            'does not match variable field that references it: ' +
            Blockly.Xml.domToText(fieldElement) + '.')
    }

    this.setValue(variable.getId())
}

/**
 * Check whether the given variable type is allowed on this field.
 * @param {string|Array<string>} type The type (or types) to check.
 * @return {boolean} True if the type (or one of the types) is in the list of allowed types.
 * @private
 */
Blockly.FieldVariable.prototype.typeIsAllowed_ = function (type) {
    var typeList = this.getVariableTypes_()
    if (!typeList) {
        return true // If it's null, all types are valid.
    }

    var types = Array.isArray(type) ? type : [type]

    // Find any intersection in the type lists.
    for (var i = 0; i < types.length; i++) {
        if (typeList.indexOf(types[i]) != -1) {
            return true
        }
    }

    return false
}

/**
 * Parse the optional arguments representing the allowed variable types and the
 * default variable type.
 * @param {Array.<string>=} opt_variableTypes A list of the types of variables
 *     to include in the dropdown.  If null or undefined, variables of all types
 *     will be displayed in the dropdown.
 * @param {string|Array<string>=} opt_defaultType The type of the variable to create if this
 *     field's value is not explicitly set.  Defaults to ''.
 * @private
 */
Blockly.FieldVariable.prototype.setTypes_ = function (opt_variableTypes,
                                                      opt_defaultType) {
    // If you expected that the default type would be the same as the only entry
    // in the variable types array, tell the Blockly team by commenting on #1499.
    var defaultTypes = Array.isArray(opt_defaultType) ? opt_defaultType : [opt_defaultType || '']
    var variableTypes = null
    // Set the allowable variable types.  Null means all types on the workspace.
    if (opt_variableTypes == null || opt_variableTypes == undefined) {
        variableTypes = null
    } else if (Array.isArray(opt_variableTypes)) {
        variableTypes = opt_variableTypes
        // Make sure the default type is valid.
        var isInArray = false
        // Find any intersection in the type lists.
        loop:
            for (var i = 0; i < variableTypes.length; i++) {
                for (var j = 0; j < defaultTypes.length; j++) {
                    if (variableTypes[i].indexOf(defaultTypes[j]) != -1) {
                        isInArray = true
                        break loop
                    }
                }
            }
        if (!isInArray) {
            throw new Error('Invalid default type \'' + defaultTypes + '\' in ' +
                'the definition of a FieldVariable')
        }
    } else {
        throw new Error('\'variableTypes\' was not an array in the definition of ' +
            'a FieldVariable')
    }
    // Only update the field once all checks pass.
    this.defaultType_ = opt_defaultType || ''
    this.variableTypes = variableTypes
}

/**
 * Return a sorted list of variable names for variable dropdown menus.
 * Include a special option at the end for creating a new variable name.
 * @return {!Array.<string>} Array of variable names.
 * @this {Blockly.FieldVariable}
 */
// @ts-ignore
Blockly.FieldVariable.dropdownCreate = function (this: Blockly.FieldVariable) {
    if (!this.variable_) {
        throw new Error('Tried to call dropdownCreate on a variable field with no' +
            ' variable selected.')
    }
    var name = this.getText()
    var variableModelList: Blockly.VariableModel[] = []
    if (this.workspace_) {
        var variableTypes = this.getVariableTypes_()
        // Get a copy of the list, so that adding rename and new variable options
        // doesn't modify the workspace's list.
        for (var i = 0; i < variableTypes.length; i++) {
            var variableType = variableTypes[i]
            var variables = this.workspace_.getVariablesOfType(variableType)
            variableModelList = variableModelList.concat(variables)
        }
    }
    variableModelList.sort(Blockly.VariableModel.compareByName)

    var options = []
    for (var i = 0, prevId = null; i < variableModelList.length; i++) {
        var id = variableModelList[i].getId()
        if (id !== prevId) {
            // Set the UUID as the internal representation of the variable.
            options.push([variableModelList[i].name, id])
            prevId = id
        }
    }
    options.push([Blockly.Msg['RENAME_VARIABLE'], Blockly.RENAME_VARIABLE_ID])
    if (Blockly.Msg['DELETE_VARIABLE']) {
        options.push(
            [
                Blockly.Msg['DELETE_VARIABLE'].replace('%1', name),
                Blockly.DELETE_VARIABLE_ID
            ]
        )
    }

    return options
}

declare module 'blockly' {
    interface FieldVariable {
        variable_: Blockly.VariableModel
        workspace_: Blockly.Workspace
        defaultType_: string | string[]

        typeIsAllowed_(type: string): boolean

        getVariableTypes_(): string[]

        setTypes_(variableTypes?: string[] | null, defaultType?: string | string[] | null): void
    }
}