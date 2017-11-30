import { SchemaInfo } from './SchemaInfo'

export const getQueryInfo = function (schemaInfo: SchemaInfo) {
  const {
    schema, resolvers: {
      Query, Mutation
    }
  } = schemaInfo

  const resolverQueries = Object.keys(Query)
  const typeDefQueries = Object.keys(schema.getQueryType().getFields())
  const queriesWithoutResolver = typeDefQueries.filter(q => !resolverQueries.includes(q))

  const resolverMutations = Object.keys(Mutation)
  const mutationType = schema.getMutationType()
  const typeDefMutations = Object.keys(mutationType ? mutationType.getFields() : [])
  const mutationsWithoutResolvers = typeDefMutations.filter(m => !resolverMutations.includes(m))

  return { typeDefQueries, typeDefMutations, queriesWithoutResolver, mutationsWithoutResolvers }
}
