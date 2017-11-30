import { MiddlewareFunction } from './MiddlewareFunction'

/**
 * A middleware/filter pattern. Current implementation works like a filter where every registered
 * middleware function will be executed when resolve() is called.
 *
 * Filter: https://en.wikipedia.org/wiki/Intercepting_filter_pattern
 * Middleware: https://dzone.com/articles/understanding-middleware-pattern-in-expressjs
 *
 */
export class Middleware<I, O = any> {
  constructor (private middlewares: MiddlewareFunction<I, O>[] = []) {
  }

  use (...middlewares: MiddlewareFunction<I, O>[]) {
    this.middlewares.push(...middlewares)
  }

  resolve (param: I) {
    const middlewares = [ ...this.middlewares ].reverse()
    const current = middlewares.pop()
    return this.next(param, middlewares, current)
  }

  private async next (param: I, middlewares: MiddlewareFunction<I, O>[], currentMiddlewareFn?: MiddlewareFunction<I, O>, prev?: O): Promise<any> {
    if (currentMiddlewareFn) {
      return new Promise((resolve, reject) => {
        const next = (prevOutput?: O, options?: { resolved: boolean }) => {
          if (options && options.resolved === true) {
            // stop calling subsequent middleware function
            resolve(prevOutput)
          } else {
            // call next middleware function
            const middlewareFn = middlewares.pop()
            this.next(param, middlewares, middlewareFn, prevOutput).then(resolve).catch(reject)
          }
        }
        const fn: any = currentMiddlewareFn(param, next, prev)

        // if middleware function is a promise, catch exception and reject from outer promise
        if (typeof fn === 'object' && typeof fn.then === 'function') {
          fn.catch(reject)
        }
      })
    } else {
      return prev
    }
  }
}
