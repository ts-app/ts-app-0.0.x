import { GraphQLFieldResolver, GraphQLScalarType } from 'graphql'

export type IResolverObject = {
  [key: string]: GraphQLFieldResolver<any, any>
}

export interface Resolvers {
  [key: string]: (() => any) | IResolverObject | GraphQLScalarType
}

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
