import { Role } from './Role'
import { FindWithCursor } from '@ts-app/mongo'
import { User } from '@ts-app/common'

export const RoleServiceConstants = {
  GLOBAL: '_global_'
}

/**
 * Service to manage user access via roles and groups.
 *
 */
export interface RoleService {
  /**
   * Add users to specified roles, optionally specifying a group. If group name is not specified,
   * roles are assigned to RoleServiceConstants.GLOBAL group.
   *
   * @param {{userIds: (string | string[]); roles: (string | string[]); group?: string}} input
   * @return {Promise<{error?: string}>}
   */
  addUsersToRoles (input: {
    userIds: string | string[], roles: string | string[],
    group?: string
  }): Promise<{ error?: string }>

  /**
   * Create specified role name.
   *
   * @param {{name: string}} input
   * @return {Promise<{error?: string; id: string}>}
   */
  createRole (input: { name: string }): Promise<{ error?: string, id: string }>

  /**
   * Delete specified role name.
   *
   * If role is in use, service output error with appropriate message will be returned.
   *
   * @param {{name: string}} input
   * @return {Promise<{error?: string}>}
   */
  removeRole (input: { name: string }): Promise<{ error?: string }>

  /**
   * Get user's groups where user has role(s) assigned. RoleServiceConstants.GLOBAL will be omitted.
   *
   * If role is specified, restrict groups returned to those with specified role assigned.
   *
   * @param {{userId: string; role?: string}} input
   * @return {Promise<{error?: string; groups?: string[]}>}
   */
  getGroupsForUser (input: { userId: string, role?: string }): Promise<{ error?: string, groups?: string[] }>

  findRolesWithCursor (input?: {
    q?: string, limit?: number,
    cursor?: string
  }): Promise<FindWithCursor<Role>>

  /**
   * Get roles assigned to user, optionally restricting specifying a group. Roles assigned to
   * RoleServiceConstants.GLOBAL will be included.
   *
   * If group name is not specified, all roles including those assigned to
   * RoleServiceConstants.GLOBAL are returned.
   *
   * @param {string} userId
   * @param {string} group
   * @return {Promise<{error?: string; roles?: string[]}>}
   */
  getRolesForUser (input: { userId: string, group?: string }): Promise<{ error?: string, roles?: string[] }>

  getUsersInRoles (input: {
    roles: string | string[], group?: string, limit?: number,
    cursor?: string
  }): Promise<FindWithCursor<User>>

  removeUsersFromRoles (input: {
    userIds: string | string[], roles: string | string[],
    group?: string
  }): Promise<{ error?: string }>

  removeUsersFromAllRoles (input: { userIds: string | string[] }): Promise<{ error?: string }>

  /**
   * Returns true if user is assigned to one or more of the specified rule(s). This can be further
   * restricted based on group name.
   *
   * @param {{userId: string; roles: (string | string[]); group?: string}} input
   * @return {Promise<boolean>}
   */
  userIsInRoles (input: { userId: string, roles: string | string[], group?: string }): Promise<boolean>
}
