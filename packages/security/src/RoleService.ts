import { Role } from './Role'
import { FindWithCursor } from '@ts-app/mongo'
import { User } from '@ts-app/common'

export const RoleServiceConstants = {
  GLOBAL: '_global_'
}

/**
 * This service allows assignment of roles to users for authorization purposes. It also provides
 * functions to check roles assigned to user, based on groups.
 *
 * Credits: This interface was heavily inspired by alanning/roles-npm.
 */
export interface RoleService {
  /**
   * Add users to specified roles, optionally specifying a group. If group name is not specified,
   * roles are assigned to RoleServiceConstants.GLOBAL group.
   */
  addUsersToRoles (input: {
    userIds: string | string[], roles: string | string[],
    group?: string
  }): Promise<{ error?: string }>

  /**
   * Create specified role name.
   */
  createRole (input: { name: string }): Promise<{ error?: string, id: string }>

  /**
   * Delete specified role name.
   *
   * If role is in use, service output error with appropriate message will be returned.
   */
  removeRole (input: { name: string }): Promise<{ error?: string }>

  /**
   * Get user's groups where user has role(s) assigned. RoleServiceConstants.GLOBAL will be omitted.
   *
   * If role is specified, restrict groups returned to those with specified role assigned.
   */
  getGroupsForUser (input: { userId: string, role?: string }): Promise<{ error?: string, groups?: string[] }>

  /**
   * Find roles with option to filter, limit and perform pagination on results.
   */
  findRolesWithCursor (input?: { q?: string, limit?: number, cursor?: string }): Promise<FindWithCursor<Role>>

  /**
   * Get roles assigned to user, optionally restricting specifying a group. Roles assigned to
   * RoleServiceConstants.GLOBAL will be included.
   *
   * If group name is not specified, all roles including those assigned to
   * RoleServiceConstants.GLOBAL are returned.
   */
  getRolesForUser (input: { userId: string, group?: string }): Promise<{ error?: string, roles?: string[] }>

  /**
   * Get users with specified role(s).
   */
  getUsersInRoles (input: { roles: string | string[], group?: string, limit?: number, cursor?: string }): Promise<FindWithCursor<User>>

  /**
   * Unassign user(s) from specified role(s).
   */
  removeUsersFromRoles (input: {
    userIds: string | string[], roles: string | string[],
    group?: string
  }): Promise<{ error?: string }>

  /**
   * Remove all assigned roles from specified user(s).
   */
  removeUsersFromAllRoles (input: { userIds: string | string[] }): Promise<{ error?: string }>

  /**
   * Returns true if user is assigned to one or more of the specified rule(s). This can be further
   * restricted based on group name.
   */
  userIsInRoles (input: { userId: string, roles: string | string[], group?: string }): Promise<boolean>
}
