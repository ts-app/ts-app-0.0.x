import { Resolver } from './Resolver'
import { ServiceInfo } from './ServiceInfo'
import { ResolverMiddlewareInput } from './ResolverMiddlewareInput'

export class DemoService {
  private anotherNumber: number = 123

  constructor (public count: number = 0) {
  }

  @Resolver({ paramNames: [ 'name', 'message' ] })
  echo (name: string, message: string) {
    return `Hello, ${name}! Message is "${message}"`
  }

  @Resolver({ type: 'mutation' })
  add ({ howMany = 1 }: { howMany?: number }) {
    this.count += howMany
    return this.count
  }

  @Resolver({ type: 'mutation' })
  async promiseToSubtract ({ howMany = 1 }: { howMany?: number }): Promise<number> {
    return new Promise<number>(resolve => {
      setTimeout(() => {
        this.count -= howMany
        resolve(this.count)
      }, 1)
    })
  }

  justUseAnotherNumber () {
    return this.anotherNumber * 3
  }

  @Resolver()
  throwSomeError () {
    throw new Error('simulated error')
  }

  @Resolver()
  resolverInfo (param: { title: string }, resolverParam?: ResolverMiddlewareInput) {
    const metadata = JSON.stringify(resolverParam![ 'metadata' ], null, 2)
    const user = JSON.stringify(resolverParam![ 'user' ], null, 2)
    const obj = JSON.stringify(resolverParam![ 'obj' ], null, 2)
    const info = JSON.stringify(resolverParam![ 'info' ], null, 2)
    const args = JSON.stringify(resolverParam![ 'args' ], null, 2)
    return {
      title: param.title,
      metadata, user, obj, info, args
    }
  }

  @Resolver()
  resolverInfoWithoutParam (dummy?: any, resolverParam?: ResolverMiddlewareInput) {
    // resolverParam is still the second argument so place a dummy parameter first.

    const metadata = JSON.stringify(resolverParam![ 'metadata' ], null, 2)
    const user = JSON.stringify(resolverParam![ 'user' ], null, 2)
    const obj = JSON.stringify(resolverParam![ 'obj' ], null, 2)
    const info = JSON.stringify(resolverParam![ 'info' ], null, 2)
    const args = JSON.stringify(resolverParam![ 'args' ], null, 2)
    return {
      metadata, user, obj, info, args
    }
  }
}

export class DemoServiceWithServiceInfo implements ServiceInfo {
  info (): { serviceName: string } {
    return {
      serviceName: 'CustomServiceName'
    }
  }

  @Resolver({ paramNames: [ 'name', 'message' ] })
  echo2 (name: string, message: string) {
    return `Hello, ${name}! Message is "${message}" - from echo2`
  }
}
