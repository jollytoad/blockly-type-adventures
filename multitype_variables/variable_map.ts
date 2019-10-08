import Blockly from 'blockly'

/**
 * Rename the given variable by updating its name in the variable map.
 * @param {!Blockly.VariableModel} variable Variable to rename.
 * @param {string} newName New variable name.
 * @package
 */
Blockly.VariableMap.prototype.renameVariable = function (variable, newName) {
    var types: string[] = Array.isArray(variable.type) ? variable.type : [variable.type]
    Blockly.Events.setGroup(true)
    try {
        for (var i = 0; i < types.length; i++) {
            var type = types[i]
            var conflictVar = this.getVariable(newName, type)
            var blocks = this.workspace.getAllBlocks(false)
            // The IDs may match if the rename is a simple case change (name1 -> Name1).
            if (!conflictVar || conflictVar.getId() == variable.getId()) {
                this.renameVariableAndUses_(variable, newName, blocks)
            } else {
                this.renameVariableWithConflict_(variable, newName, conflictVar, blocks)
            }
        }
    } finally {
        Blockly.Events.setGroup(false)
    }
}

/**
 * Create a variable with a given name, optional type(s), and optional ID.
 * @param {string} name The name of the variable. This must be unique across
 *     variables and procedures.
 * @param {string|Array<string>=} opt_type The type of the variable like 'int' or 'string'.
 *     Does not need to be unique. Field_variable can filter variables based on
 *     their type. This will default to '' which is a specific type.
 * @param {string=} opt_id The unique ID of the variable. This will default to
 *     a UUID.
 * @return {Blockly.VariableModel} The newly created variable.
 */
Blockly.VariableMap.prototype.createVariable = function (name, opt_type, opt_id) {
    var variable = this.getVariable(name, opt_type)
    if (variable) {
        if (opt_id && variable.getId() != opt_id) {
            throw Error('Variable "' + name + '" is already in use and its id is "' +
                variable.getId() + '" which conflicts with the passed in ' +
                'id, "' + opt_id + '".')
        }
        // The variable already exists and has the same ID.
        return variable
    }
    if (opt_id && this.getVariableById(opt_id)) {
        throw Error('Variable id, "' + opt_id + '", is already in use.')
    }
    opt_id = opt_id || Blockly.utils.genUid()
    opt_type = opt_type || ''

    variable = new Blockly.VariableModel(this.workspace, name, opt_type, opt_id)
    this.addVariable_(variable)
    return variable
}

/**
 * Add the variable to the maps by its type
 * @param {Blockly.VariableModel} variable
 * @private
 */
Blockly.VariableMap.prototype.addVariable_ = function (variable) {
    var types: string[] = Array.isArray(variable.type) ? variable.type : [variable.type]
    for (var i = 0; i < types.length; i++) {
        var type = types[i]
        // If opt_type is not a key, create a new list.
        if (!this.variableMap_[type]) {
            this.variableMap_[type] = [variable]
        } else {
            // Else append the variable to the preexisting list.
            this.variableMap_[type].push(variable)
        }
    }
}

/* Begin functions for variable deletion. */

/**
 * Delete a variable.
 * @param {!Blockly.VariableModel} variable Variable to delete.
 */
Blockly.VariableMap.prototype.deleteVariable = function (variable) {
    if (this.removeVariable_(variable)) {
        Blockly.Events.fire(new Blockly.Events.VarDelete(variable))
    }
}

/**
 * Remove the variable from the maps by its type
 * @param {Blockly.VariableModel} variable
 * @return {boolean} True if the variable was removed from at least one of the maps
 * @private
 */
Blockly.VariableMap.prototype.removeVariable_ = function (variable) {
    var types = Array.isArray(variable.type) ? variable.type : [variable.type]
    var removed = false
    for (var i = 0; i < types.length; i++) {
        var type = types[i]
        var variableList = this.variableMap_[type]
        for (var j = 0, tempVar; tempVar = variableList[j]; j++) {
            if (tempVar.getId() == variable.getId()) {
                variableList.splice(j, 1)
                removed = true
                break
            }
        }
    }
    return removed
}

/**
 * Find the variable by the given name and type and return it.  Return null if
 *     it is not found.
 * @param {string} name The name to check for.
 * @param {string|Array<string>=} opt_type The type of the variable.  If not provided it
 *     defaults to the empty string, which is a specific type.
 * @return {Blockly.VariableModel} The variable with the given name, or null if
 *     it was not found.
 */
// @ts-ignore - this method is incorrectly defined without a null in its return type
Blockly.VariableMap.prototype.getVariable = function (name, opt_type) {
    var types = Array.isArray(opt_type) ? opt_type : [opt_type || '']
    for (var i = 0; i < types.length; i++) {
        var type = types[i]
        var list = this.variableMap_[type]
        if (list) {
            for (var j = 0, variable; variable = list[j]; j++) {
                if (Blockly.Names.equals(variable.name, name)) {
                    return variable
                }
            }
        }
    }
    return null
}

/**
 * Find the variable by the given ID and return it. Return null if it is not
 *     found.
 * @param {string} id The ID to check for.
 * @return {Blockly.VariableModel} The variable with the given ID.
 */
// @ts-ignore - this method is incorrectly defined without a null in its return type
Blockly.VariableMap.prototype.getVariableById = function (id) {
    var keys = Object.keys(this.variableMap_)
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        for (var j = 0, variable; variable = this.variableMap_[key][j]; j++) {
            if (variable.getId() == id) {
                return variable
            }
        }
    }
    return null
}

/**
 * Return all variables of all types.
 * @return {!Array.<!Blockly.VariableModel>} List of variable models.
 */
Blockly.VariableMap.prototype.getAllVariables = function () {
    var variable_ids: Record<string, boolean> = {}
    var all_variables: Blockly.VariableModel[] = []
    var keys = Object.keys(this.variableMap_)
    for (var i = 0; i < keys.length; i++) {
        var variables = this.variableMap_[keys[i]]
        for (var j = 0; j < variables.length; j++) {
            var variable = variables[j]
            if (!variable_ids[variable.getId()]) {
                all_variables.push(variable)
                variable_ids[variable.getId()] = true
            }
        }
    }
    return all_variables
}


// EXTENSION (to allow changing of a variable type)

/**
 * Change the type of the given variable by moving it to the appropriate variable map.
 * @param {!Blockly.VariableModel} variable Variable to change.
 * @param {string|Array<string>=} opt_type New type for the variable.
 */
Blockly.VariableMap.prototype.changeVariableType = function (variable, opt_type) {
    var oldType = variable.type
    var newType = opt_type || ''

    if (String(oldType) !== String(newType)) {
        this.removeVariable_(variable)

        // @ts-ignore - cannot override definition of type to be: string | string[]
        variable.type = newType

        this.addVariable_(variable)

        // TODO: consider firing a variable event? may need to be a new event type...
        // Blockly.Events.fire(new Blockly.Events.VarTypeChanged(variable, oldType, newType))
    }
}

declare module 'blockly' {
    interface VariableMap {
        variableMap_: Record<string, Blockly.VariableModel[]>

        renameVariableAndUses_(variable: Blockly.VariableModel, newName: string, blocks: Blockly.Block[]): void
        renameVariableWithConflict_(variable: Blockly.VariableModel, newName: string, conflictVar: Blockly.VariableModel, blocks: Blockly.Block[]): void

        addVariable_(variable: Blockly.VariableModel): void
        removeVariable_(variable: Blockly.VariableModel): boolean

        changeVariableType(variable: Blockly.VariableModel, type: string | string[]): void
    }
}
