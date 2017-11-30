/**
 * Function called to process input and return output via the next() function when
 * Middleware.resolve() is called.
 *
 * @param {I} input passed to the middleware function
 * @param {(output?: O, options?: {resolved: boolean}) => void} next function is called to pass control to the next middleware
 * function, optionally passing in output data. To stop the middleware from further processing,
 * return  resolved=true
 * @param {O} prev output data from previous middleware or null if this is the first middleware
 * function
 */
export type MiddlewareFunction<I, O = any> = (input: I, next: (output?: O, options?: { resolved: boolean }) => void, prev?: O) => void
