import { MongoService } from '@ts-app/mongo'
import { SchemaDefinition, standardSchemaDefinition, ResolverService } from '@ts-app/graphql'
import { MongoSecurityService } from './MongoSecurityService'
import { MongoRoleService } from './MongoRoleService'
import { loadFile, User } from '@ts-app/common'
import { mergeTypeDefs, ResolverError } from '@ts-app/graphql'

/**
 * Returns a SchemaDefinition object that provides support for access authorization and user
 * account management.
 *
 * The schema definition contains:
 *
 * - role.graphql from this package
 * - security.graphql from this package
 * - defines standardSchemaDefinition from @ts-app/graphql as a dependency
 *
 * @param {MongoService} mongoService
 * @return SchemaDefinition
 */
export const securitySchemaDefinition = ({ mongoService }: { mongoService: MongoService }): SchemaDefinition => {
  const resolver = ResolverService.getInstance()
  const roleService = new MongoRoleService({ mongoService })
  resolver.registerService(roleService)
  resolver.registerService(new MongoSecurityService({ mongoService, roleService }))

  // perform authorization checks @Resolver({auth}) is a "function"
  resolver.registerBeforeware(async (input, next, prev) => {
    if (typeof input.metadata.auth === 'function') {
      const auth = input.metadata.auth

      if (auth(input)) {
        next(prev)
      } else {
        throw new ResolverError('Unauthorized access!')
      }
    } else {
      next(prev)
    }
  })

  // perform authorization check if @Resolver({auth}) is a string array
  resolver.registerBeforeware(async (input, next, prev) => {
    const roles = input.metadata.auth
    const user: User = input.context.user

    if (Array.isArray(roles) && roles.length > 0) {
      if (!user) {
        throw new ResolverError('Unauthenticated access!')
      }

      const authorized = await
        roleService.userIsInRoles({
          userId: user.id,
          roles
        })
      if (authorized) {
        // authorized to access restricted resource
        next(prev)
      } else {
        throw new ResolverError('Unauthorized access!')
      }
    } else {
      // will not check if metadata.auth is no an array (of string)
      next(prev)
    }
  })

  const typeDefs = mergeTypeDefs([
    loadFile(`${__dirname}/role.graphqls`),
    loadFile(`${__dirname}/security.graphqls`) ])

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
