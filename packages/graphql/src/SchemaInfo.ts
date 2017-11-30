import { GraphQLSchema } from 'graphql'

export type SchemaInfo = {
  resolvers: { Query: {}; Mutation: {} }
  schema: GraphQLSchema
  typeDefs: string
}
