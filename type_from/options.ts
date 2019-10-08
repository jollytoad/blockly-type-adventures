// Extension to the standard Blockly dropdown data options to allow options to specify a set of types
export type OptionTuple = [string, string] | [string, string, string[]]

export function findOptionByValue(options: OptionTuple[], valueOrOption: string | OptionTuple | undefined): OptionTuple | undefined {
    const value = valueOrOption && (Array.isArray(valueOrOption) ? valueOrOption[1] : valueOrOption)
    return value && options.find(option => option[1] === value) || undefined
}
