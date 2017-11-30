import { Middleware } from '../src/Middleware'
import { MiddlewareFunction } from '../src/MiddlewareFunction'

type Input = { amount: number }
type Output = string

describe('Middleware', () => {
  test('resolve() without middleware function', async () => {
    expect(await new Middleware().resolve({})).toBeUndefined()
  })

  test('resolve() single middleware function', async () => {
    const m = new Middleware<Input>([
      (input, next) => next(input.amount * 123)
    ])

    expect(await m.resolve({ amount: 50 })).toBe(6150)
  })

  test('resolve() two middleware functions, get prev value, set next value', async () => {
    const addAmount: MiddlewareFunction<Input, Output> = (param, next) => {
      param.amount += 5
      next('from to add')
    }
    const asyncMultipleAmount: MiddlewareFunction<Input, Output> = (param, next, prev) => {
      // got prev value from middlewareToAdd
      expect(prev).toBe('from to add')

      setTimeout(() => {
        param.amount *= 3
        next(`Amount is ${param.amount}`)
      }, 0)
    }

    const middleware = new Middleware<Input>([
      addAmount,
      asyncMultipleAmount
    ])

    const param = { amount: 10 }
    const output = await middleware.resolve(param)
    expect(param.amount).toBe(45)
    expect(output).toBe('Amount is 45')
  })

  test('prev value with multiple middleware functions', async () => {
    const m = new Middleware<Input>([
      (input, next, prev) => {
        expect(prev).toBeUndefined()
        next(123)
      },
      (input, next, prev) => {
        expect(prev).toBe(123)
        next(456)
      },
      (input, next, prev) => {
        expect(prev).toBe(456)
        next(789)
      }
    ])

    const resolved = await m.resolve({ amount: 10 })
    expect(resolved).toBe(789)
  })

  test('async middleware function', async () => {
    const m = new Middleware<Input>([
      (input, next, prev) => {
        expect(prev).toBeUndefined()
        next(123)
      },
      async (input, next, prev) => {
        expect(prev).toBe(123)
        setTimeout(() => next(456), 0)
      },
      (input, next, prev) => {
        expect(prev).toBe(456)
        next(789)
      }
    ])

    const resolved = await m.resolve({ amount: 10 })
    expect(resolved).toBe(789)
  })

  test('middleware throws error', async () => {
    // once a middleware throws error, it must be handled by resolve()
    // should we allow subsequent middleware to be called? maybe, but it gets complicated. let's not.
    const middleware = new Middleware<Input>([
      (input, next) => next(123),
      () => {
        throw new Error('Simulated error')
      },
      () => fail('Should not reach this line')
    ])

    try {
      await middleware.resolve({ amount: 10 })
      fail('Should not reach this line')
    } catch (e) {
      // handle error
      expect(e).toEqual(new Error('Simulated error'))
    }
  })

  test('async middleware throws error', async () => {
    // once a middleware throws error, it must be handled by resolve()
    // should we allow subsequent middleware to be called? maybe, but it gets complicated. let's not.
    const middleware = new Middleware<Input>([
      (input, next) => next(123),
      async () => {
        throw new Error('Simulated error')
      },
      () => fail('Should not reach this line')
    ])

    try {
      await middleware.resolve({ amount: 10 })
      fail('Should not reach this line')
    } catch (e) {
      // handle error
      expect(e).toEqual(new Error('Simulated error'))
    }
  })

  test('middleware function can prevent calling subsequent functions', async () => {
    const flow: string[] = []

    const m = new Middleware<Input>([
      (input, next, prev) => {
        flow.push('first')
        next(123)
      },
      (input, next, prev) => {
        flow.push('second')
        next(456, { resolved: true })
      },
      (input, next, prev) => {
        flow.push('third')
        next(789)
      }
    ])

    const resolved = await m.resolve({ amount: 10 })
    expect(resolved).toBe(456)
    expect(flow).toMatchSnapshot()
  })
})
