import { ResolverService } from '../src/ResolverService'
import { DemoService, DemoServiceWithServiceInfo } from '../src/DemoService'
import { ResolverError } from '../src/ResolverError'

describe('ResolverService', () => {
  const resolverService = ResolverService.getInstance()
  let demoService: DemoService
  let demoServiceWithServiceInfo: DemoServiceWithServiceInfo

  beforeEach(function () {
    demoService = new DemoService()
    expect(demoService).toBeTruthy()
    resolverService.registerService(demoService)

    demoServiceWithServiceInfo = new DemoServiceWithServiceInfo()
    expect(demoServiceWithServiceInfo).toBeTruthy()
    resolverService.registerService(demoServiceWithServiceInfo)
  })

  afterEach(() => {
    resolverService.resetServices()
    resolverService.setLogger({ error: console.error })
  })

  test('registerService()', () => {
    expect(resolverService.serviceRegistry[ 'DemoService' ].service).toMatchSnapshot()
    // expect(() => resolverService.registerService(new DemoService())).toThrowError()
  })

  test('registerResolver()', () => {
    const clazz = resolverService.serviceRegistry[ 'DemoService' ]
    expect(clazz.resolvers).toMatchSnapshot()
  })

  test('composeServiceFunction()', () => {
    const add = resolverService.composeServiceFunction('DemoService', 'add')
    add({ howMany: 2 })
    add({ howMany: 8 })
    expect(demoService.count).toBe(10)
  })

  test('composeResolver() for sync function', async () => {
    const add = resolverService.composeResolver('DemoService', 'add')
    await add({}, { howMany: 3 }, {}, {})
    await add({}, { howMany: 5 }, {}, {})
    expect(demoService.count).toBe(8)
  })

  test('composeResolver() for async function (Promise)', async () => {
    const promiseToSubtract = resolverService.composeResolver('DemoService', 'promiseToSubtract')
    await promiseToSubtract({}, { howMany: 3 }, {}, {})
    await promiseToSubtract({}, { howMany: 5 }, {}, {})
    expect(demoService.count).toBe(-8)
  })

  test('composeResolver() with paramNames', async () => {
    const echo = resolverService.composeResolver('DemoService', 'echo')
    const output = await echo({}, { name: 'Alice', message: 'Wassup!' }, {}, {})
    expect(output).toMatchSnapshot()
  })

  test('makeResolvers()', () => {
    expect(resolverService.makeResolvers()).toMatchSnapshot()
  })

  test('makeResolvers() - resolvers are usable', async () => {
    const resolvers = resolverService.makeResolvers()

    const queryOutput = await resolvers.Query.echo({}, {
      name: 'Alice',
      message: 'Wassup!'
    }, {}, {})
    expect(queryOutput).toMatchSnapshot()

    const mutationOutput = await resolvers.Mutation.promiseToSubtract({}, { howMany: 10 }, {}, {})
    expect(mutationOutput).toBe(-10) // return value is correct
    expect(demoService.count).toBe(-10) // also affects underlying service state
  })

  test('composeResolver() functions that throw error', async () => {
    let logErrorCount = 0
    resolverService.setLogger({
      error: message => logErrorCount += 1
    })
    const throwSomeError = resolverService.composeResolver('DemoService', 'throwSomeError')
    const output = await throwSomeError({}, {}, {}, {})
    expect(output.error).toMatch(/Error processing resolver function \[DemoService.throwSomeError\]/)
    expect(logErrorCount).toBe(1)
  })

  test('getService() works', () => {
    expect(resolverService.getService(DemoService)).toBe(demoService)
  })

  test('getService() returns null if service not registered', () => {
    class NoInstanceService {
    }

    expect(resolverService.getService(NoInstanceService)).toBeNull()
  })

  test('getService() with ServiceInfo', () => {
    expect(resolverService.getService(DemoServiceWithServiceInfo)).toBe(demoServiceWithServiceInfo)
  })

  test('registerBeforeware() works', async () => {
    let trail: any[] = []

    resolverService.registerBeforeware((input, next) => {
      trail.push(input)
      next('beforeware 1 was called')
    })
    resolverService.registerBeforeware((input, next, prev) => {
      trail.push(prev)
      next('beforeware 2 was called')
    })

    const add = resolverService.composeResolver('DemoService', 'add')
    const three = await add({}, { howMany: 3 }, {}, {})
    expect(demoService.count).toBe(3)
    expect(three).toBe(3)
    expect(trail).toMatchSnapshot()
  })

  test('sample authorization beforeware', async () => {
    resolverService.setLogger({
      error: () => {
        // do nothin
      }
    })

    resolverService.registerBeforeware((input, next) => {
      throw new ResolverError('Unauthorized access')
    })

    const add = resolverService.composeResolver('DemoService', 'add')
    const unauthorized = await add({}, { howMany: 3 }, {}, {})

    // internal state not changed
    expect(demoService.count).toBe(0)
    expect(unauthorized).toEqual({ error: 'Unauthorized access' })
  })

  test('registerAfterware() works', async () => {
    const trail: any[] = []

    resolverService.registerAfterware((input, next, prev) => {
      trail.push('after-1')
      next(prev)
    })
    resolverService.registerAfterware((input, next, prev) => {
      trail.push('after-2')
      next(prev)
    })

    const add = resolverService.composeResolver('DemoService', 'add')
    const three = await add({}, { howMany: 3 }, {}, {})
    expect(demoService.count).toBe(3)
    expect(three).toBe(3)
    expect(trail).toMatchSnapshot()
  })

  test('ServiceInfo support', async () => {
    const service = resolverService.getService('CustomServiceName')
    expect(typeof service).toBe('object')

    const echo2 = resolverService.composeResolver('CustomServiceName', 'echo2')
    const output = await echo2({}, { name: 'Bob', message: 'Up! Up! Up!' }, {}, {})
    expect(output).toMatchSnapshot()
  })
})
