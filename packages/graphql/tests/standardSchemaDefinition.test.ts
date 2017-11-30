import { standardSchemaDefinition } from '../src/standardSchemaDefinition'

describe('standardSchemaDefinition', () => {
  test('works', () => {
    const {
      resolvers, typeDefs
    } = standardSchemaDefinition()

    expect(resolvers).toMatchSnapshot()
    expect(typeDefs).toMatchSnapshot()
  })
})
