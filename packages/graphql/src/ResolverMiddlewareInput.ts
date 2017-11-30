import { User } from '@ts-app/common'
import { ResolverAuth } from './ResolverAuth'

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
