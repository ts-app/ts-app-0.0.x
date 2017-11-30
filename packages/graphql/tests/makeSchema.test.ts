import { makeExecutableSchema } from 'graphql-tools'
import { mergeSchemaDefinitions } from '../src/mergeSchemaDefinitions'
import { demoSchemaDefinition } from '../src/demoSchemaDefinition'

describe('makeSchema', async () => {
  test('can make schema', async () => {
    const demo = demoSchemaDefinition()
    const merged = mergeSchemaDefinitions([ demo ])
    const schema = makeExecutableSchema(merged)
    expect(schema).toMatchSnapshot()
  })
})
