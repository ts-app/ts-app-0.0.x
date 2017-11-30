import { ResolverMiddlewareInput } from './ResolverMiddlewareInput'

/**
 * This function is used to restrict user's access to process only the user's records.
 *
 * For example, a user is only allowed to update his/her own user profile or clear own shopping
 * cart. It works by matching current user's ID against a specified GraphQL query parameter name.
 *
 * Returns a @Resolver({auth:}) function that authorize access to if user ID matches the named
 * GraphQL query argument.
 *
 * @param {string} paramName Match current user ID against this GraphQL parameter name
 */
export const userIdMatchParam = (paramName: string) =>
  (input: ResolverMiddlewareInput): boolean =>
    !!(input.user && input.user.id === input.args[ paramName ])
