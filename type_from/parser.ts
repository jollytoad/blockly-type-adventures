import {TypeFrom} from './types'

export const parseFromExpression = (expr: string): TypeFrom =>
    (expr.match(/^([^-+^]+)(?:([-+^])(.*))?/) || []).slice(1) as TypeFrom
