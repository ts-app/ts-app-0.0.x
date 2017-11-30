import { ResolverMiddlewareInput } from './ResolverMiddlewareInput'

/**
 * This function is used to enable/disable access to GraphQL resolver based on specified environment
 * variable to be set to '1'.
 *
 * @param {string} name Environment variable name
 * @return {(input: ResolverMiddlewareInput) => boolean}
 */
export const environmentVariableIsSet = (name: string) => {
  const authorized = process.env[ name ] === '1'

  return (input: ResolverMiddlewareInput): boolean => authorized
// tslint:disable-next-line
}
