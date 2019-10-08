import {parseFromExpression} from './parser'

describe('parseFromExpression', () => {

    test.each`

        expr         | result

        ${''}        | ${[]}
        ${'+'}       | ${[]}
        ${'-'}       | ${[]}
        ${'^'}       | ${[]}
        ${'+Type'}   | ${[]}
        ${'-Type'}   | ${[]}
        ${'^Type'}   | ${[]}
        ${'IN'}      | ${['IN', undefined, undefined]}
        ${'IN+'}     | ${['IN', '+', '']}
        ${'IN-'}     | ${['IN', '-', '']}
        ${'IN^'}     | ${['IN', '^', '']}
        ${'IN+Type'} | ${['IN', '+', 'Type']}
        ${'IN-Type'} | ${['IN', '-', 'Type']}
        ${'IN^Type'} | ${['IN', '^', 'Type']}

    `('expression $expr', ({expr, result}) => {
        expect(parseFromExpression(expr)).toEqual(result)
    })
})
