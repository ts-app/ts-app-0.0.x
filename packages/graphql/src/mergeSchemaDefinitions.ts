import { SchemaDefinition } from './SchemaDefinition'
import { mergeTypeDefs } from './mergeTypeDefs'

/**
 *
 * Merge an array of SchemaDefinition and return IExecutableSchemaDefinition (from Apollo) that can
 * be used as an input for makeExecutableSchema().
 *
 * It extracts contents from schema definition's "dependencies" to be returned as part of the
 * IExecutableSchemaDefinition. This allows reusing SchemaDefinition when specified as
 * "dependencies".
 *
 * @param {SchemaDefinition[]} definitions
 * @return {{typeDefs: string; resolvers: {Query: {}; Mutation: {}}}}
 */
export const mergeSchemaDefinitions = (definitions: SchemaDefinition[]) => {
  let typeDefs = ''
  let mergedResolvers = {
    Query: {},
    Mutation: {}
  }

  // flatten dependencies for all definitions
  const flatDependencies: SchemaDefinition[] = definitions.map(d => {
    if (d.dependencies) {
      return Object.keys(d.dependencies).map(name => d.dependencies![ name ])
    } else {
      return []
    }
  }).reduce((prev, current) => prev.concat(current), [])

  // resolve all definitions as "dependencies" plus provided "definitions"
  const allDefinitions = [ ...flatDependencies, ...definitions ]

  // perform merge
  allDefinitions.map(d => {
    // --- (simple) merge for typeDefs
    if (d.typeDefs) {
      if (typeDefs.length === 0) {
        typeDefs = d.typeDefs
      } else {
        typeDefs = mergeTypeDefs([ typeDefs, d.typeDefs ])
      }
    }

    if (d.resolvers) {
      mergedResolvers = {
        ...mergedResolvers,
        ...d.resolvers
      }

      if (d.resolvers.Query) {
        mergedResolvers = {
          ...mergedResolvers,
          Query: {
            ...mergedResolvers.Query,
            ...d.resolvers.Query
          }
        }
      }

      if (d.resolvers.Mutation) {
        mergedResolvers = {
          ...mergedResolvers,
          Mutation: {
            ...mergedResolvers.Mutation,
            ...d.resolvers.Mutation
          }
        }
      }
    }
  })

  return {
    typeDefs,
    resolvers: mergedResolvers
  }
  // tslint:disable-next-line
}
