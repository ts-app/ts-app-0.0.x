import { loadFile } from '@ts-app/common'
import { DemoService } from './DemoService'
import { ResolverService } from './ResolverService'
import { standardSchemaDefinition } from './standardSchemaDefinition'
import { SchemaDefinition } from './SchemaDefinition'

export const demoSchemaDefinition = (): SchemaDefinition => {
  const resolver = ResolverService.getInstance()
  resolver.registerService(new DemoService())
  const typeDefs = loadFile(`${__dirname}/demoSchema.graphqls`)
  const resolvers = resolver.makeResolvers()
  const standard = standardSchemaDefinition()

  return {
    typeDefs,
    resolvers,
    dependencies: {
      standard
    }
  }
}
