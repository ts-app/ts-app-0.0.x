import { ResolverService } from './ResolverService'
import { ResolverMiddlewareInput } from './ResolverMiddlewareInput'

type CustomAuth = (input: ResolverMiddlewareInput) => boolean

type ResolverParam = {
  type?: 'mutation' | 'query'
  paramNames?: string[] | null
  name?: string
  auth?: string[] | CustomAuth
}

export const Resolver = function ({ type = 'query', paramNames = null, name = null, auth = [] }: ResolverParam = {}) {
  return function (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
    const resolverService = ResolverService.getInstance()
    let className = target.constructor.name

    // --- support ServiceInfo
    const info = target[ 'info' ]
    if (typeof info === 'function') {
      className = info()[ 'serviceName' ]
    }

    resolverService.registerResolver(className, propertyKey, descriptor, type, paramNames, auth, name)
    return descriptor.value
  }
}
