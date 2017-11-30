import { mergeSchemaDefinitions } from '../src/mergeSchemaDefinitions'
import { SchemaDefinition } from '../src/SchemaDefinition'
import { standardSchemaDefinition } from '../src/standardSchemaDefinition'

describe('mergeSchemaDefinition', () => {
  test('simple merge', () => {
    const sd1: SchemaDefinition = {
      typeDefs: `
type Query {
  query1: String
}

type Mutation {
  mutation1: String
}
`,
      resolvers: {
        Query: {
          query1: () => 'query value'
        },
        Mutation: {
          mutation1: () => 'mutation value'
        }
      },
      dependencies: {
        standard: standardSchemaDefinition()
      }
    }
    const sd2: SchemaDefinition = {
      typeDefs: `
type Query {
  sd2Query1: Int
}

type Mutation {
  sd2Mutation1: Boolean
}
`,
      resolvers: {
        Query: {
          sd2Query1: () => 123
        },
        Mutation: {
          sd2Mutation1: () => true
        }
      }
    }

    const merged = mergeSchemaDefinitions([ sd1, sd2 ])
    expect(merged).toMatchSnapshot()
  })
})
