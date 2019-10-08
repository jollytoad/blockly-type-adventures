import {modifyTypes} from './modify_types'

describe('modifyTypes', () => {

    describe('+ modifier', () => {

        it('wraps simple types with the given higher type, but does not add a higher type of any', () => {

            expect(modifyTypes(['SimpleType'], '+', 'HigherType').sort())
                .toEqual(['HigherType:SimpleType'])

        })

        it('leaves existing higher types alone', () => {

            expect(modifyTypes(['SimpleType', 'Foo:Bar'], '+', 'HigherType').sort())
                .toEqual(['HigherType:SimpleType', 'Foo:Bar'].sort())

        })

        it('wraps multiple types', () => {

            expect(modifyTypes(['Foo', 'Bar'], '+', 'HigherType').sort())
                .toEqual(['HigherType:Foo', 'HigherType:Bar'].sort())

        })

        it('removes duplicate types', () => {

            expect(modifyTypes(['Foo', 'Foo'], '+', 'HigherType').sort())
                .toEqual(['HigherType:Foo'])

            expect(modifyTypes(['HigherType:Foo', 'Foo'], '+', 'HigherType').sort())
                .toEqual(['HigherType:Foo'])

            expect(modifyTypes(['HigherType:Foo', 'HigherType:Foo'], '+', 'HigherType').sort())
                .toEqual(['HigherType:Foo'])

        })
    })

    describe('- modifier', () => {

        it('unwraps any simple type with the given higher type and removes the higher type of any', () => {

            expect(modifyTypes(['HigherType:SimpleType', 'HigherType:*'], '-', 'HigherType'))
                .toEqual(['SimpleType'])

        })

        it('leaves other higher types alone', () => {

            expect(modifyTypes(['HigherType:SimpleType', 'Foo:Bar'], '-', 'HigherType').sort())
                .toEqual(['SimpleType', 'Foo:Bar'].sort())

        })

        it('unwraps multiple types', () => {

            expect(modifyTypes(['HigherType:Foo', 'HigherType:Bar'], '-', 'HigherType').sort())
                .toEqual(['Foo', 'Bar'].sort())

        })

        it('removes duplicate types', () => {

            expect(modifyTypes(['HigherType:Foo', 'HigherType:Foo'], '-', 'HigherType').sort())
                .toEqual(['Foo'].sort())

            expect(modifyTypes(['Foo', 'Foo'], '-', 'HigherType').sort())
                .toEqual(['Foo'].sort())

            expect(modifyTypes(['HigherType:Foo', 'Foo'], '-', 'HigherType').sort())
                .toEqual(['Foo'].sort())

        })

    })

    describe('^ modifier', () => {

        it('produces wrapped and unwrapped simple types', () => {

            expect(modifyTypes(['HigherType:Foo', 'HigherType:Bar'], '^', 'HigherType').sort())
                .toEqual(['HigherType:Foo', 'HigherType:Bar', 'Foo', 'Bar'].sort())

            expect(modifyTypes(['Foo', 'Bar'], '^', 'HigherType').sort())
                .toEqual(['HigherType:Foo', 'HigherType:Bar', 'Foo', 'Bar'].sort())

            expect(modifyTypes(['HigherType:Foo', 'Bar'], '^', 'HigherType').sort())
                .toEqual(['HigherType:Foo', 'HigherType:Bar', 'Foo', 'Bar'].sort())

        })

        it('removes the higher type of any', () => {

            expect(modifyTypes(['HigherType:Foo', 'HigherType:*'], '^', 'HigherType').sort())
                .toEqual(['HigherType:Foo', 'Foo'].sort())

        })

        it('removes duplicate types', () => {

            expect(modifyTypes(['HigherType:Foo', 'HigherType:Foo'], '^', 'HigherType').sort())
                .toEqual(['HigherType:Foo', 'Foo'].sort())

            expect(modifyTypes(['Foo', 'Foo'], '^', 'HigherType').sort())
                .toEqual(['HigherType:Foo', 'Foo'].sort())

            expect(modifyTypes(['HigherType:Foo', 'Foo'], '^', 'HigherType').sort())
                .toEqual(['HigherType:Foo', 'Foo'].sort())

        })
    })

})