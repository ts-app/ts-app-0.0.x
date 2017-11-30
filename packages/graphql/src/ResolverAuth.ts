import { ResolverMiddlewareInput } from './ResolverMiddlewareInput'

export type ResolverAuth = (input: ResolverMiddlewareInput) => boolean
