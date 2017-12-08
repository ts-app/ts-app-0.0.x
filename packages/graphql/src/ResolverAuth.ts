import { ResolverMiddlewareInput } from './ResolverMiddlewareInput'

/**
 * Custom authorization function.
 *
 */
export type ResolverAuth = (input: ResolverMiddlewareInput) => boolean
