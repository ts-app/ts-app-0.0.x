import { User } from '@ts-app/common'
import { ResolverAuth } from './ResolverAuth'

/**
 * ResolverMiddlewareInput wraps a <a href="https://www.apollographql.com/docs/graphql-tools/resolvers.html">resolver function's parameters</a> values with additional information:
 *
 * <ul>
 * <li>user - User object if logged in.</li>
 * <li> metadata - Resolver metadata that contains these properties (based on the decorated resolver function):
 *  <ul>
 *    <li>className - Resolver function's class name.</li>
 *    <li>functionName - Resolvers function's name </li>
 *    <li>resolverName - Resolver name</li>
 *    <li>type - 'mutation' or 'query' type</li>
 *    <li>auth - String array of roles authorized to access this resolver. Empty array allows access by any authenticated user. Advanced authorization function can be specified here by using {@link ResolverAuth}.
 * </li>
 * </ul>
 */
export type ResolverMiddlewareInput = {
  obj: any, args: any, context: any, info: any
  user?: User
  metadata: {
    className: string
    functionName: string
    resolverName: string
    type: 'mutation' | 'query'
    auth: string[] | ResolverAuth
  }
}
