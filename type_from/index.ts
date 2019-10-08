import Blockly from 'blockly'
import {findOptionByValue, OptionTuple} from './options'
import {extractPrefixedTypes, filterNonPrefixedTypes} from './types_filter'
import {modifyTypes} from './modify_types'
import {parseFromExpression} from './parser'

// Block extension to update type checking on inputs or the output based on a field or input within the block
//
// Use the 'from <field/input_name>' type in the block-factory to declare that an input, output or variable type should
// be obtained from the given field or input. This will be encoded as 'From:NAME' in the block definition.
//
// And add the 'type_from' extension to the block.
//
// An optional higher type modifier can be attached after the name, eg: 'From:NAME+Many' or 'From:NAME-Many'
// this will cause the given higher type ('Many' in this example) to be added or stripped from the resolved types,
// and an wildcard instance of the higher type (eg. 'Many:*') will also be added/removed from the type list.
// It will not modify already prefixed types...
//
// So with NAME+Many, a type of [Foo] will become [Many:Foo, Many:*].
//
// There is also a modifier that return the types with and without the higher types, but with no wildcard type,
// this is expressed as: 'From:NAME^Many', and is used when one input must accept the same types as another.
// For an example, see the 'many_create_with' block.
//
// A field may supply the type via a getType() method, or if it has a getOptions() method, it will find the
// option tuple matching the value of the field and use the third item in the tuple as an array of valid types,
// this makes it compatible with field_fetching_dropdown.

// Override setCheck & connect_ on all connections to propagate changes to the target connections via listeners

// This is used to expose some private internals of the Blockly.Connection without having to cast to any everywhere
type ConnectionInternal = Blockly.Connection & {
    targetConnection: ConnectionInternal | null
    check_: string[] | null
    connect_: (this: ConnectionInternal, childConnection: ConnectionInternal) => void
    _connectedListeners: ((this: ConnectionInternal) => void)[]
    canConnectWithReason_: (this: ConnectionInternal, target: any) => number
    checkType_: (this: ConnectionInternal, otherConnection: ConnectionInternal) => boolean
}

function callListeners(connection: ConnectionInternal | null) {
    if (connection && connection._connectedListeners && connection._connectedListeners.length) {
        const sourceBlock = connection.getSourceBlock()

        console.group(`Call listeners for connection on ${sourceBlock.type} (${sourceBlock.id})`)

        connection._connectedListeners.forEach(fn => fn.call(connection))

        console.groupEnd()
    }
}

const connectionProto = Blockly.Connection.prototype as ConnectionInternal

const originalSetCheck = connectionProto.setCheck

connectionProto.setCheck = function (this: ConnectionInternal, check: any) {
    const prevCheck = '' + this.check_
    originalSetCheck.call(this, check)

    if (prevCheck !== '' + this.check_) {
        callListeners(this.targetConnection)
    }

    return this
}

/**
 * Add a check to allow wildcard higher-order types to match.
 * Currently, this is done in one direction.
 * The `otherConnection` may accept a higher order type (such as `Many:*` or `Foo:*`), and any type in `this` block's
 * type array that starts with the higher order type will be accepted.
 *
 * However, if `this` connection returns a wildcard type and the `otherConnection` requires a strict type, such as
 * `Many:String`, then the check will fail and the blocks will not connect.
 */
const originalCheckType = connectionProto.checkType_
connectionProto.checkType_ = function (otherConnection: ConnectionInternal) {
    const blocklyProvidedTypeChecking = originalCheckType.call(this, otherConnection)
    const otherCheck = otherConnection.check_
    const thisCheck = this.check_
    if (thisCheck && otherCheck && !blocklyProvidedTypeChecking) {
        //Order of connections is arbitrary, so we have to check both ways
        return accountForWildCardTypes(thisCheck, otherCheck) || accountForWildCardTypes(otherCheck, thisCheck)
    }
    return blocklyProvidedTypeChecking
}

/**
 * Running the regex on every check was creating performance problems, so... CACHEING!
 */
const higherTypeRegex = /([A-Za-z]*):\*/
const higherTypeCache: { [name: string]: string } = {}
const findHigherType = (type: string) => {
    const typeCheckCacheElement = higherTypeCache[type]
    if (typeCheckCacheElement === undefined || typeCheckCacheElement === null) {
        const match = type.match(higherTypeRegex)
        if (match && match[1]) {
            higherTypeCache[type] = match[1]
        } else {
            higherTypeCache[type] = ""
        }
    }
    return higherTypeCache[type]
}

const accountForWildCardTypes = (firstCheck: string[], secondCheck: string[]) => {
    const regexResults = secondCheck
        .filter(check => !!check) //somehow, undefined can creep into the typelist, which breaks things. WTF??
        .map(findHigherType)
    const anyMatch = regexResults.filter(higherType =>
        higherType && firstCheck.find(type => type.startsWith(higherType))
    )
    return anyMatch.length > 0
}


const originalConnect = connectionProto.connect_

connectionProto.connect_ = function (childConnection: ConnectionInternal) {
    const prevConnection = this.targetConnection
    originalConnect.call(this, childConnection)

    if (prevConnection !== this.targetConnection) {
        callListeners(this)
    }
}

export function type_from(this: Blockly.BlockSvg) {
    console.group(`type_from extension on ${this.type} (${this.id})`)

    // Check for a 'From:' type on the output connection check
    initConnection(this, this.outputConnection as ConnectionInternal, 'output')

    // Check for a 'From:' type on all input connections checks
    this.inputList.forEach(input => initConnection(this, input.connection as ConnectionInternal, input.name))

    // Check for a 'From:' type on all variable fields
    this.inputList.forEach(input =>
        input.fieldRow.forEach(field => {
            if (field.referencesVariables()) {
                initVariable(this, field as Blockly.FieldVariable)
            }
        })
    )

    console.groupEnd()
}

function initConnection(block: Blockly.BlockSvg, connection: ConnectionInternal | null, debugName: string): void {
    if (connection) {
        onUpdateOfFromSource(block, connection.check_ || [], types => {

            connection!.setCheck(types)

        }, `connection '${debugName}'`)
    }
}

function initVariable(block: Blockly.BlockSvg, field: Blockly.FieldVariable) {
    if (field.variableTypes) {
        const hasFrom = onUpdateOfFromSource(block, field.variableTypes || [], types => {

            console.debug(`Update ${block.type} (${block.id}) variable '${field.getText()}' type to:`, types)

            if (types && types.length) {
                const variable = field.getVariable()
                if (variable) {
                    (variable.workspace as any).variableMap_.changeVariableType(variable, types)
                }
                field.variableTypes = types

                // TODO: Should probably trigger some update here!
            }
        }, `variable '${field.getText()}'`)

        // Clear variableTypes on initialisation to prevent initial type checks from throwing an error
        if (hasFrom && !(block.workspace as Blockly.WorkspaceSvg).isFlyout) {
            field.variableTypes = null
        }
    }
}

export function onUpdateOfFromSource(block: Blockly.BlockSvg, types: string[], action: (types: string[] | null) => void, debugName: string) {
    const sources = extractPrefixedTypes('From:', types)

    if (sources.length) {
        const regularTypes = filterNonPrefixedTypes('From:', types)

        console.debug(`Listen on ${block.type} (${block.id}) to update ${debugName} from:`, sources)

        if ((block.workspace as Blockly.WorkspaceSvg).isFlyout) {
            // Don't update checking for blocks flyout, but set it to allow any if no regular types are given
            action(regularTypes.length ? regularTypes : null)
        } else {
            sources.forEach(source => {
                // NOTE: The first element in the following destructured array is the match of the entire expression,
                // we don't need this, so it is ignored.
                const [name, typeModifier, genericType] = parseFromExpression(source)

                if (name) {
                    const field = block.getField(name)

                    if (field) {
                        onSetValue(field, () => {
                            const resolvedTypes = [...regularTypes, ...modifyTypes(getTypes(field), typeModifier, genericType)]

                            // Fallback to any type if we resolve to no types
                            action(resolvedTypes.length ? resolvedTypes : null)
                        })
                    } else {
                        const input = block.getInput(name)

                        if (input) {
                            onConnect(input.connection as ConnectionInternal, targetConnection => {
                                const check = targetConnection && targetConnection.check_ || []

                                const resolvedTypes = [...regularTypes, ...modifyTypes(check, typeModifier, genericType)]

                                // Fallback to any type if we resolve to no types
                                action(resolvedTypes.length ? resolvedTypes : null)
                            })
                        }
                    }
                }
            })
        }

        return true
    }
    return false
}

function onSetValue(field: Blockly.Field, action: (value: string) => void) {
    const originalSetValue = field.setValue

    field.setValue = function (this: Blockly.Field, value: string) {
        originalSetValue.call(this, value)
        action.call(this, value)
    }
}

function onConnect(connection: ConnectionInternal, action: (childConnection: ConnectionInternal | null) => void) {
    connection._connectedListeners = connection._connectedListeners || []

    connection._connectedListeners.push(function () {
        action(this.targetConnection as ConnectionInternal | null)
    })

    action(connection.targetConnection as ConnectionInternal | null)
}

function getTypes(field: Blockly.Field): string[] {
    if ((field as any).getTypes) {
        return (field as any).getTypes()
    }

    // TODO: the field should probably be responsible for doing this and providing via getTypes()
    if ((field as any).getOptions) {
        const options: OptionTuple[] = (field as any).getOptions()

        const option = findOptionByValue(options, field.getValue())

        if (option && option[2]) {
            return option[2] as string[]
        }
    }

    return []
}

Blockly.Extensions.register('type_from', type_from)
