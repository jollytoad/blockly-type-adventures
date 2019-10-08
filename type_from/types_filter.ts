
export const extractPrefixedTypes = (prefix: string, types: string[]): string[] =>
    types.filter(type => type.startsWith(prefix))
        .map(type => type.substring(prefix.length))

export const filterPrefixedTypes = (prefix: string, types: string[]): string[] =>
    types.filter(type => type.startsWith(prefix))

export const filterNonPrefixedTypes = (prefix: string, types: string[]): string[] =>
    types.filter(type => !type.startsWith(prefix))
