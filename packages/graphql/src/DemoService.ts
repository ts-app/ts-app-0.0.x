import { Resolver } from './Resolver'
import { ServiceInfo } from './ServiceInfo'

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
