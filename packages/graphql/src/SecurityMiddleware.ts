import { Request, Response, NextFunction } from 'express'

/**
 * An express middleware that performs authentication via JWT and optionally authorization only
 * users with specific role.
 */
export interface SecurityMiddleware {
  /**
   * Returns a middleware that performs authentication and authorization.
   *
   * @param {string[]} roles Used to support auth at express level
   * @return {(req: Request, res: Response, next: e.NextFunction) => void}
   */
  middleware (roles?: string[]): (req: Request, res: Response, next: NextFunction) => void
}
