import { GraphQLScalarType, Kind } from 'graphql'
import { SchemaDefinition } from './SchemaDefinition'

export const standardSchemaDefinition = (): SchemaDefinition => {
  // http://dev.apollodata.com/tools/graphql-tools/scalars.html
  const resolvers = {
    Date: new GraphQLScalarType({
      name: 'Date',
      description: 'Date custom scalar type',
      parseValue (value) {
        return new Date(value) // value from the client
      },
      serialize (value) {
        return value.getTime() // value sent to the client
      },
      parseLiteral (ast) {
        if (ast.kind === Kind.INT) {
          return parseInt(ast.value, 10) // ast value is always in string format
        }
        return null
      }
    })
  }

  const typeDefs = 'scalar Date'

  return {
    resolvers,
    typeDefs
  }
}
