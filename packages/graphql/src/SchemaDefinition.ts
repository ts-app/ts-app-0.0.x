import { GraphQLFieldResolver, GraphQLScalarType } from 'graphql'

export type IResolverObject = {
  [key: string]: GraphQLFieldResolver<any, any>
}

export interface Resolvers {
  [key: string]: (() => any) | IResolverObject | GraphQLScalarType
}

/**
 * SchemaDefinition is similar to IExecutableSchemaDefinition (Apollo) but contains an optional
 * "dependencies" where dependent schema definitions can be specified.
 *
 * TODO: transitive dependencies not implemented!
 */
export type SchemaDefinition = {
  typeDefs?: string,
  resolvers?: Resolvers,
  dependencies?: {
    [dependencyName: string]: {
      typeDefs?: string,
      resolvers?: Resolvers
    }
  }
}
