import {TypeModifier} from './types'

export const modifyTypes =
    (types: string[], typeModifier?: TypeModifier, higherType?: string): string[] => {
        if (typeModifier && higherType) {
            const higherTypes = withHigherTypes(types, higherType);
            switch (typeModifier) {
                case '+':
                    return higherTypes.length === 0 ? [`${higherType}:*`] : removeDuplicates(higherTypes)
                case '-':
                    return removeDuplicates(withoutHigherTypes(types, higherType))
                case '^':
                    return removeWildHigherTypes(removeDuplicates([...higherTypes, ...withoutHigherTypes(types, higherType)]), higherType)
            }
        }
        return types
    }

/**
 * Wrap any simple types with the given higher type
 * eg. ["Thing", "Stuff"] becomes ["Many:Thing", "Many:Stuff"] given "Many" as the higher type
 */
const withHigherTypes =
    (types: string[], higherType: string): string[] =>
        types
            .map(type =>
                type.includes(':') ? type : higherType + ':' + type
            )

/**
 * Find any prefixed types and ensure that the prefix is removed from the types.
 * eg. ["Many:*", "Many:Thing", "Foo:Thing", "Bar"] becomes ["Thing", "Bar"]
 */
const withoutHigherTypes =
    (types: string[], higherType: string): string[] =>
        types
            .reduce((newTypes, type) => {
                const [prefix, suffix] = type.split(':')
                if (prefix === higherType) {
                    if (suffix !== '*') {
                        newTypes.push(suffix)
                    }
                    // NOTE: we discard 'higherType:*'
                } else {
                    newTypes.push(type)
                }
                return newTypes
            }, [] as string[])

/**
 * Remove duplicate types
 */
const removeDuplicates =
    (types: string[]): string[] =>
        types
            .sort()
            .filter((type, i, ts) => i === 0 || type !== ts[i - 1])

/**
 * Remove higher type of any
 * eg. ["Many:*", "Many:Thing", "Foo"] becomes ["Many:Thing", "Foo"]
 */
const removeWildHigherTypes =
    (types: string[], higherType: string): string[] =>
        types
            .filter(type => type !== `${higherType}:*`)
