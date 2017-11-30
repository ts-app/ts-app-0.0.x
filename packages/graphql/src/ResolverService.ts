import { Middleware, MiddlewareFunction } from '@ts-app/common'
import { ResolverMiddlewareInput } from './ResolverMiddlewareInput'
import { ResolverError } from './ResolverError'
import { ResolverAuth } from './ResolverAuth'

let logError: (message?: any, ...optionalParams: any[]) => void = console.error
let _INSTANCE: ResolverService

export class ResolverService {
  private _serviceRegistry: {
    [className: string]: {
      service?: object
      resolvers: {
        [resolverName: string]: {
          descriptor: TypedPropertyDescriptor<Function>
          queryType: 'mutation' | 'query'
          paramNames: string[] | null
          auth: string[] | ResolverAuth
          name: string | null
        }
      }
    }
  }
  private beforewares: MiddlewareFunction<ResolverMiddlewareInput>[] = []
  private afterwares: MiddlewareFunction<ResolverMiddlewareInput>[] = []

  private constructor () {
    this._serviceRegistry = {}
  }

  static getInstance () {
    if (!_INSTANCE) {
      _INSTANCE = new ResolverService()
    }
    return _INSTANCE
  }

  /**
   * Register instance of service to handle resolver functions. There should only be one instance
   * of service class. Otherwise, it does not compute.
   *
   * @param {T} service service being registered
   * @param {string} className service name. Defaults to class name. WARNING: do not use this
   * parameter. It is here due to bad design/assumption. It should be removed.
   * @return {T} service being registered
   */
  registerService<T> (service: T, className = service.constructor.name): T {
    // --- support ServiceInfo
    if (typeof service.constructor.prototype.info === 'function') {
      const info = service.constructor.prototype.info
      className = info()[ 'serviceName' ]
    }

    if (className in this._serviceRegistry) {
      this._serviceRegistry[ className ].service = service
    } else {
      this._serviceRegistry[ className ] = { service, resolvers: {} }
    }

    return service
  }

  registerResolver (className: string, resolverName: string,
                    descriptor: TypedPropertyDescriptor<Function>, queryType: 'mutation' | 'query',
                    paramNames: string[] | null, auth: string[] | ResolverAuth, name: string | null) {
    let clazz = this._serviceRegistry[ className ]
    if (!clazz) {
      clazz = { resolvers: {} }
      this._serviceRegistry[ className ] = clazz
    }
    clazz.resolvers[ resolverName ] = { descriptor, queryType, paramNames, auth, name }
  }

  resetServices () {
    // leave "resolvers" alone. they are only set once (via @Resolver)

    // reset "service"
    Object.keys(this._serviceRegistry).map(className => {
      delete this._serviceRegistry[ className ].service
    })

    // reset before/after wares
    this.beforewares.length = 0
    this.afterwares.length = 0
  }

  /**
   * Returns a function that is binded to the service instance so that "this" works as expected.
   *
   * @param {string} className
   * @param {string} functionName
   * @return {any}
   */
  composeServiceFunction (className: string, functionName: string) {
    const descriptor = this._serviceRegistry[ className ].resolvers[ functionName ].descriptor
    const service = this._serviceRegistry[ className ].service
    const fn = descriptor.get ? descriptor.get() : descriptor.value
    return fn!.bind(service)
  }

  composeResolver (className: string, functionName: string, type: 'mutation' | 'query' = 'query', auth: string[] | ResolverAuth = [], resolverName: string = '') {
    const middleware = new Middleware<ResolverMiddlewareInput>([
      ...this.beforewares,
      this.createServiceFnMiddleware(className, functionName),
      ...this.afterwares
    ])

    // when resolver executes, it resolves the middleware
    return async (obj: any, args: any, context: any, info: any) => {
      try {
        const user = context.user || null
        return await middleware.resolve({
          obj, args, context, info,
          metadata: { className, functionName, resolverName, auth, type },
          user
        })
      } catch (e) {
        const now = Date.now()
        logError(`[${now}]`, e)
        if (e instanceof ResolverError) {
          return {
            error: e.message
          }
        } else {
          return {
            error: `Error processing resolver function [${className}.${functionName}] [${now}]`
          }
        }
      }
    }
  }

  makeResolvers () {
    const queryResolvers: { [resolverName: string]: any } = {}
    const mutationResolvers: { [resolverName: string]: any } = {}

    Object.keys(this._serviceRegistry).map(className => {
      const { resolvers, service } = this.serviceRegistry[ className ]
      if (service) {
        Object.keys(resolvers).map(key => {
          const { queryType, auth, name } = resolvers[ key ]
          // use custom resolver name if specified, else use decorated function's name
          const resolverName = name ? name : key
          if (queryType === 'mutation') {
            if (resolverName in mutationResolvers) {
              throw new Error(`Mutation resolver [${resolverName}] must be unique`)
            }
            mutationResolvers[ resolverName ] = this.composeResolver(className, key, 'query', auth, resolverName)
          } else {
            if (resolverName in queryResolvers) {
              throw new Error(`Query resolver [${resolverName}] must be unique`)
            }
            queryResolvers[ resolverName ] = this.composeResolver(className, key, 'mutation', auth, resolverName)
          }
        })
      }
    })

    return {
      Query: queryResolvers,
      Mutation: mutationResolvers
    }
  }

  setLogger ({ error }: { error: (message?: any, ...optionalParams: any[]) => void }) {
    logError = error
  }

  getService<T extends Object> (serviceType: Function | string): T | null {
    let serviceName

    if (typeof serviceType === 'string') {
      serviceName = serviceType
    } else if (typeof serviceType.prototype.info === 'function') {
      // --- support ServiceInfo
      serviceName = serviceType.prototype.info()[ 'serviceName' ]
    } else {
      serviceName = serviceType.name
    }

    // const serviceName = typeof serviceType === 'string' ? serviceType : serviceType.name
    const serviceObj = this._serviceRegistry[ serviceName ]
    if (serviceObj && serviceObj.service) {
      return serviceObj.service as T
    } else {
      return null
    }
  }

  registerBeforeware (before: MiddlewareFunction<ResolverMiddlewareInput>) {
    this.beforewares.push(before)
  }

  registerAfterware (after: MiddlewareFunction<ResolverMiddlewareInput>) {
    this.afterwares.push(after)
  }

  private createServiceFnMiddleware (className: string, functionName: string): MiddlewareFunction<ResolverMiddlewareInput> {
    // service function that performs business logic
    const serviceFn = this.composeServiceFunction(className, functionName)

    const resolver = this._serviceRegistry[ className ].resolvers[ functionName ]
    const { paramNames } = resolver
    if (paramNames) {
      // middleware transform args from object to array based on paramNames
      return ({ obj, args, context, info }, next) => {
        // convert args (object) to as array, pass to serviceFn as spread parameters
        const params = paramNames.map(name => args[ name ])
        next(serviceFn(...params))
      }
    } else {
      // middleware just pass args to serviceFn (it is expected to take a single object parameter)
      return ({ obj, args, context, info }, next) => {
        next(serviceFn(args))
      }
    }
  }

  get serviceRegistry () {
    return this._serviceRegistry
  }
}
