import { mergeTypeDefs } from '../src/mergeTypeDefs'
import { parse, buildASTSchema } from 'graphql'

describe('mergeTypeDefs', () => {
  test('no Query/Mutation (only scalar types)', () => {
    const merged = mergeTypeDefs([ 'scalar Date', 'scalar Book' ])
    expect(merged).toMatchSnapshot()
  })

  test('scalar with query', () => {
    const schema1 = `scalar Date`

    const schema2 = `type Query {
      echo(name: String): String
    }`

    const merged = mergeTypeDefs([ schema1, schema2 ])
    expect(merged).toMatchSnapshot()
  })

  test('nothing to merge scenario', () => {
    const schema1 = `type Query {
      echo(name: String): String
    }
    scalar Book
type Mutation {}`

    const schema2 = `scalar Date`

    const merged = mergeTypeDefs([ schema1, schema2 ])
    expect(merged).toMatchSnapshot()
  })

  test('simple merge', () => {
    const schema1 = `type Query {
echo(name: String): String
    }
type Mutation {
reset: Boolean
}`

    const schema2 = `type Query {
hello: String
    }`

    const merged = mergeTypeDefs([ schema1, schema2 ])
    expect(merged).toMatchSnapshot()
  })

  test('typical scenario', () => {
    const schema1 = `scalar Date
type Query {
  echo (name: String!, message: String!): String
}

type Mutation {
  add (howMany: Int): Int
}
`
    const schema2 = `type Query {
    users(q: String): UsersPayload
}

type UsersPayload {
    error: Date
    username: [String]
    # from "schema1"
    sampleDate: Date
}

type Mutation {
    createUser(username: String): Boolean
}

scalar Time`

    const merged = mergeTypeDefs([ schema1, schema2 ])
    expect(merged).toMatchSnapshot()

    // verify merged type definition can be parsed as AST
    const value = parse(merged)
    const ast = buildASTSchema(value)
    expect(ast.getQueryType()).toMatchSnapshot()
    expect(ast.getMutationType()).toMatchSnapshot()
  })
})
