// https://github.com/Microsoft/TypeScript/issues/13965
export class ResolverError extends Error {
  // tslint:disable-next-line
  __proto__: Error

  constructor (message: string) {
    const trueProto = new.target.prototype
    super(message)

    // Alternatively use Object.setPrototypeOf if you have an ES6 environment.
    this.__proto__ = trueProto
  }
}
