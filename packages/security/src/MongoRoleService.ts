import { RoleService, RoleServiceConstants } from './RoleService'
import { Role } from './Role'
import { ObjectId } from 'mongodb'
import { FindWithCursor, MongoService } from '@ts-app/mongo'
import { escapeRegex, User } from '@ts-app/common'
import { Resolver, ServiceInfo, userIdMatchParam } from '@ts-app/graphql'
import { DefaultRoles } from './DefaultRoles'

/**
 * Concept & implementation based on alanning/roles-npm
 */
export class MongoRoleService implements RoleService, ServiceInfo {
  private mongoService: MongoService

  constructor ({ mongoService }: { mongoService: MongoService }) {
    this.mongoService = mongoService
  }

  info (): { serviceName: string; } {
    return {
      serviceName: 'RoleService'
    }
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ], type: 'mutation' })
  async addUsersToRoles ({ userIds, roles, group = RoleServiceConstants.GLOBAL }: {
    userIds: string | string[], roles: string | string[], group?: string
  }): Promise<{ error?: string }> {
    if (!userIds || !roles || !group) {
      return { error: 'Invalid arguments for addUsersToRoles()' }
    }

    const _userIds = typeof userIds === 'string' ? [ userIds ] : userIds
    const _roles = typeof roles === 'string' ? [ roles ] : roles
    let _group = group

    if (_group) {
      if (_group.startsWith('$')) {
        return { error: 'Group cannot start with \'$\'' }
      }
      _group = _group.replace(/\./g, '_')
    }

    const rolesWithGroup = _roles.map(role => ({ role, group: _group }))

    // --- create missing roles in roles collection
    const cursor = await this.mongoService.cursor<Role>('roles', { name: { $in: _roles } })
    const matchingRolesInDb = await cursor.toArray()
    const rolesNotInDb = _roles.filter(roleName => !matchingRolesInDb.find(roleInDb => roleInDb.name === roleName))
    for (const roleName of rolesNotInDb) {
      const createRole = await this.createRole({ name: roleName })
      if (!createRole) {
        return { error: `Error creating role [${roleName}]` }
      }
    }

    await cursor.close()

    // --- assign roles to users collection
    const Users = await this.mongoService.collection('users')
    const updateMany = await Users.updateMany(
      {
        _id: { $in: _userIds.map(id => new ObjectId(id)) }
      },
      {
        $addToSet: {
          roles: {
            $each: rolesWithGroup
          }
        }
      }
    )

    if (updateMany.result.ok === 1) {
      return {}
    } else {
      return { error: 'Error adding users to roles' }
    }
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ], type: 'mutation' })
  async createRole ({ name }: { name: string }): Promise<{ error?: string, id: string }> {
    const id = await this.mongoService.create('roles', { name })
    return { id }
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ], type: 'mutation' })
  async removeRole ({ name }: { name: string }): Promise<{ error?: string }> {
    const userWithRole = await this.mongoService.get('users',
      {
        'roles.role': name
      },
      { fields: { _id: 1 } }
    )

    if (userWithRole) {
      return { error: `Role [${name}] is in use` }
    } else {
      await this.mongoService.remove('roles', { name })
      return {}
    }
  }

  @Resolver({ auth: userIdMatchParam('userId') })
  async getGroupsForUser ({ role, userId }: { userId: string, role?: string }): Promise<{ error?: string, groups?: string[] }> {
    let filter

    if (role) {
      filter = {
        _id: new ObjectId(userId),
        'roles.role': role
      }
    } else {
      filter = { _id: new ObjectId(userId) }
    }

    const user = await this.mongoService.get<User>('users', filter, {
      fields: {
        'roles': 1
      }
    })

    if (!user) {
      if (role) {
        return { error: `Error getting groups for user [${userId}] with role [${role}]` }
      } else {
        return { error: `Error getting groups for user [${userId}]` }
      }
    } else if (role) {
      const roles = user.roles || []
      const groupNames = roles.filter(currentRole => (currentRole.role === role && currentRole.group !== RoleServiceConstants.GLOBAL))
        .map(currentRole => {
          return currentRole.group
        })

      return { groups: Array.from(new Set(groupNames)) }
    } else {
      const roles = user.roles || []
      const groupNames = roles.filter(currentRole => (currentRole.group !== RoleServiceConstants.GLOBAL))
        .map(currentRole => currentRole.group)

      return { groups: Array.from(new Set(groupNames)) }
    }
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ] })
  findRolesWithCursor (input: { q?: string, limit?: number, cursor?: string } = {}): Promise<FindWithCursor<Role>> {
    const { q, limit, cursor } = input
    let filter = {}
    if (q && q.trim().length > 0) {
      filter = {
        $or: [
          { name: { $regex: `^${escapeRegex(q)}`, $options: 'i' } },
          { name: { $regex: `${escapeRegex(q)}$`, $options: 'i' } }
        ]
      }
    }

    return this.mongoService.findWithCursor<Role>('roles', filter, limit, cursor)
  }

  @Resolver({ auth: userIdMatchParam('userId'), name: 'userRoles' })
  async getRolesForUser ({ userId, group }: { userId: string, group?: string }): Promise<{ error?: string, roles?: string[] }> {
    let filter
    if (!group) {
      filter = { _id: new ObjectId(userId) }
    } else {
      filter = {
        _id: new ObjectId(userId),
        'roles.group': { $in: [ RoleServiceConstants.GLOBAL, group ] }
      }
    }

    const user = await this.mongoService.get<User>('users', filter, {
      fields: {
        'roles': 1
      }
    })

    if (!user) {
      return { error: `Error getting roles for user [${userId}]` }
    } else if (user.roles) {
      // user with roles
      const roles = user.roles
        .filter(currentRole => {
          // filter for global groups
          // if groups is specified, filter by current role's group
          return currentRole.group === RoleServiceConstants.GLOBAL || !group || currentRole.group === group
        })
        .map(currentRole => currentRole.role)

      return { roles: Array.from(new Set(roles)) }
    } else {
      // user without roles
      return { roles: [] }
    }
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ] })
  async getUsersInRoles ({ group, roles, limit, cursor }: {
    roles: string | string[], group?: string, limit?: number, cursor?: string
  }): Promise<FindWithCursor<User>> {
    const _roles = typeof roles === 'string' ? [ roles ] : roles
    const _groups = group ? [ group, RoleServiceConstants.GLOBAL ] : [ RoleServiceConstants.GLOBAL ]

    let filter
    if (group) {
      filter = {
        roles: {
          $all: [
            { $elemMatch: { role: { $in: _roles }, group: { $in: _groups } } }
          ]
        }
      }
    } else {
      filter = {
        'roles.role': { $in: _roles }
      }
    }
    return this.mongoService.findWithCursor<User>('users', filter, limit, cursor)
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ], type: 'mutation' })
  async removeUsersFromRoles ({ userIds, roles, group }: {
    userIds: string | string[], roles: string | string[], group?: string
  }): Promise<{ error?: string }> {
    const _userIds = typeof userIds === 'string' ? [ userIds ] : userIds
    const _roles = typeof roles === 'string' ? [ roles ] : roles
    const filter = {
      _id: { $in: _userIds.map(id => new ObjectId(id)) }
    }
    const update = {
      $pull: {
        roles: {
          role: { $in: _roles }
        }
      }
    }

    const collection = await this.mongoService.collection('users')
    const updateMany = await collection.updateMany(filter, update)

    if (updateMany.result.ok === 1) {
      return {}
    } else {
      return { error: `Error removing role(s) ${_roles} for user(s) ${_userIds}` }
    }

    // TODO: unused roles from collection('roles')
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ], type: 'mutation' })
  async removeUsersFromAllRoles ({ userIds }: { userIds: string | string[] }): Promise<{ error?: string }> {
    const _userIds = typeof userIds === 'string' ? [ userIds ] : userIds
    const filter = {
      _id: { $in: _userIds.map(id => new ObjectId(id)) }
    }
    const update = {
      $unset: { roles: '' }
    }

    const collection = await this.mongoService.collection('users')
    const updateMany = await collection.updateMany(filter, update)

    if (updateMany.result.ok === 1) {
      return {}
    } else {
      return { error: `Error removing all roles for user(s) ${_userIds}` }
    }
  }

  @Resolver({ auth: userIdMatchParam('userId') })
  async userIsInRoles ({ userId, roles, group }: { userId: string, roles: string | string[], group?: string }): Promise<boolean> {
    try {
      const _role = typeof roles === 'string' ? [ roles ] : roles
      const _groups = group ? [ group, RoleServiceConstants.GLOBAL ] : [ RoleServiceConstants.GLOBAL ]

      const filter = {
        _id: new ObjectId(userId),
        roles: {
          $all: [
            { $elemMatch: { role: { $in: _role }, group: { $in: _groups } } }
          ]
        }
      }

      const findWithCursor = await this.mongoService.findWithCursor<User>('users', filter)
      return findWithCursor.docs.length > 0
    } catch (e) {
      // whenever error happens, return as user not in role
      console.error(e)
      return false
    }
  }
}
