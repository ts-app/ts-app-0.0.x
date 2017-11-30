import { MongoService } from '@ts-app/mongo'
import { SecurityService } from '../src/SecurityService'
import { RoleService } from '../src/RoleService'
import { MongoRoleService } from '../src/MongoRoleService'
import { MongoSecurityService } from '../src/MongoSecurityService'
import { User } from '@ts-app/common'
import arrayContaining = jasmine.arrayContaining

describe('MongoRoleService', async () => {
  const localUrl = 'mongodb://localhost:27017'
  let mongoService: MongoService
  let roleService: RoleService
  let securityService: SecurityService

  beforeEach(async () => {
    mongoService = new MongoService(localUrl)
    roleService = new MongoRoleService({ mongoService })
    securityService = new MongoSecurityService({ mongoService, roleService })

    try {
      await mongoService.dropCollection('users')
      await mongoService.dropCollection('roles')
    } catch {
      // it's ok
    }
  })

  afterEach(async () => {
    const db = await mongoService.db()
    return db.close()
  })

  /**
   * Create test fixtures. Tests in this file perform assertions based these test fixtures.
   *
   * WARNING: Changing these data WILL affect test assertions.
   *
   * THINK & ANALYZE carefully before changing this function.
   *
   */
  const createTestFixtures = async () => {
    const signUp = await securityService.signUp({ email: 'user1@test.com', password: '123' })
    expect(signUp.user!.id.length).toBe(24)
    const userId1 = signUp.user!.id

    const user2 = await securityService.signUp({ email: 'user2@test.com', password: '123' })
    expect(user2.user!.id.length).toBe(24)
    const userId2 = user2.user!.id

    const user3 = await securityService.signUp({ email: 'user3@test.com', password: '123' })
    expect(user3.user!.id.length).toBe(24)
    const userId3 = user3.user!.id

    expect((await roleService.addUsersToRoles({
      userIds: userId1, roles: [ 'user', 'superuser' ]
    })).error).toBeFalsy()

    expect((await roleService.addUsersToRoles({
      userIds: userId1, roles: [ 'user', 'superuser', 'admin' ], group: 'site 1'
    })).error).toBeFalsy()

    expect((await roleService.addUsersToRoles({
      userIds: userId1, roles: [ 'user', 'admin' ], group: 'site 2'
    })).error).toBeFalsy()
    expect((await roleService.addUsersToRoles({
      userIds: userId1, roles: [ 'user', 'superuser', 'admin' ], group: 'site 3'
    })).error).toBeFalsy()
    expect((await roleService.addUsersToRoles({
      userIds: userId1, roles: [ 'superuser' ], group: 'site 4'
    })).error).toBeFalsy()
    expect((await roleService.addUsersToRoles({
      userIds: userId2, roles: [ 'user', 'superuser', 'superadmin', 'god' ]
    })).error).toBeFalsy()
    expect((await roleService.addUsersToRoles({
      userIds: userId2, roles: [ 'user', 'superuser', 'admin' ], group: 'site 1'
    })).error).toBeFalsy()
    expect((await roleService.addUsersToRoles({
      userIds: userId2, roles: [ 'user', 'admin' ], group: 'site 2'
    })).error).toBeFalsy()
    expect((await roleService.addUsersToRoles({
      userIds: userId2, roles: [ 'user', 'superuser', 'admin' ], group: 'site 3'
    })).error).toBeFalsy()

    expect((await roleService.addUsersToRoles({
      userIds: userId3, roles: [ 'user' ]
    })).error).toBeFalsy()
    expect((await roleService.addUsersToRoles({
      userIds: userId3, roles: [ 'user', 'admin', 'superadmin' ], group: 'site 1'
    })).error).toBeFalsy()
    expect((await roleService.addUsersToRoles({
      userIds: userId3, roles: [ 'user' ], group: 'site 2'
    })).error).toBeFalsy()
    expect((await roleService.addUsersToRoles({
      userIds: userId3, roles: [ 'user', 'admin', 'god' ], group: 'site 3'
    })).error).toBeFalsy()

    return { userId1, userId2, userId3 }
  }

  test('addUsersToRoles()', async () => {
    const { userId1, userId2, userId3 } = await createTestFixtures()

    let user = await mongoService.get<User>('users', userId1)
    expect(user!.roles).toMatchSnapshot()

    user = await mongoService.get<User>('users', userId2)
    expect(user!.roles).toMatchSnapshot()

    user = await mongoService.get<User>('users', userId3)
    expect(user!.roles).toMatchSnapshot()
  })

  test('deleteRole()', async () => {
    await createTestFixtures()

    let removeRole = await roleService.removeRole({ name: 'superadmin' })
    expect(removeRole.error).toBe('Role [superadmin] is in use')

    const create = await roleService.createRole({ name: 'unused-role' })
    expect(create.error).toBeFalsy()
    expect(create.id.length).toBe(24)

    removeRole = await roleService.removeRole({ name: 'unused-role' })
    expect(removeRole.error).toBeFalsy()
  })

  test('getGroupsForUser()', async () => {
    const { userId1, userId2 } = await createTestFixtures()

    let groups = await roleService.getGroupsForUser({ userId: userId1 })
    expect(groups.error).toBeFalsy()
    expect(groups.groups!.length).toBe(4)
    expect(groups.groups).toEqual(arrayContaining([ 'site 1', 'site 2', 'site 3', 'site 4' ]))

    groups = await roleService.getGroupsForUser({ userId: userId2, role: 'superuser' })
    expect(groups.error).toBeFalsy()
    expect(groups.groups!.length).toBe(2)
    expect(groups.groups).toEqual(arrayContaining([ 'site 1', 'site 3' ]))
  })

  test('getGroupsForUser() with invalid role', async () => {
    // craete userId1
    const { userId1 } = await createTestFixtures()

    // userId1 does not have "superadmin" role
    const groups = await roleService.getGroupsForUser({ userId: userId1, role: 'superadmin' })
    expect(groups.error).toMatch(`Error getting groups for user [${userId1}] with role [superadmin]`)
  })

  test('getGroupsForUser() with invalid user', async () => {
    const userId = '012345678912'
    const groups = await roleService.getGroupsForUser({ userId })
    expect(groups.error).toBe(`Error getting groups for user [${userId}]`)
  })

  test('findRolesWithCursor()', async () => {
    await createTestFixtures()

    const roles = await roleService.findRolesWithCursor()
    expect(roles.cursor.length).toBe(24)

    const roleNames = roles.docs.map(role => role.name)
    expect(roleNames.length).toBe(5)
    expect(roleNames).toEqual(arrayContaining([ 'user', 'superuser', 'superadmin', 'admin', 'god' ]))
  })

  test('findRolesWithCursor() with query', async () => {
    await createTestFixtures()

    const roles = await roleService.findRolesWithCursor({ q: 'sU' })
    const roleNames = roles.docs.map(role => role.name)
    expect(roleNames.length).toBe(2)
    expect(roleNames).toEqual(arrayContaining([ 'superuser', 'superadmin' ]))
  })

  test('getRolesForUser()', async () => {
    const { userId1, userId2, userId3 } = await createTestFixtures()

    let user = await roleService.getRolesForUser({ userId: userId1 })
    expect(user.error).toBeFalsy()
    expect(user.roles!.length).toBe(3)
    expect(user.roles).toEqual(arrayContaining([ 'user', 'superuser', 'admin' ]))

    user = await roleService.getRolesForUser({ userId: userId2, group: 'unknown site' })
    expect(user.error).toBeFalsy()
    expect(user.roles).toEqual(arrayContaining([ 'user', 'superuser', 'superadmin' ]))

    user = await roleService.getRolesForUser({ userId: userId3, group: 'site 3' })
    expect(user.error).toBeFalsy()
    expect(user.roles!.length).toBe(3)
    expect(user.roles).toEqual(arrayContaining([ 'user', 'admin', 'god' ]))
  })

  test('getUsersInRole()', async () => {
    await createTestFixtures()

    let users = await roleService.getUsersInRoles({ roles: 'god' })
    let { docs } = users
    expect(docs.length).toBe(2)
    let emails = docs.map(user => user.emails[ 0 ].email)
    expect(emails).toEqual(arrayContaining([ 'user2@test.com', 'user3@test.com' ]))

    users = await roleService.getUsersInRoles({ roles: 'superadmin', group: 'site 1' })
    docs = users.docs
    expect(docs.length).toBe(2)
    emails = docs.map(user => user.emails[ 0 ].email)
    expect(emails).toEqual(arrayContaining([ 'user2@test.com', 'user3@test.com' ]))

    users = await roleService.getUsersInRoles({ roles: 'superadmin', group: 'site 2' })
    docs = users.docs
    expect(docs.length).toBe(1)
    emails = docs.map(user => user.emails[ 0 ].email)
    expect(emails).toEqual(arrayContaining([ 'user2@test.com' ]))

    users = await roleService.getUsersInRoles({ roles: 'superadmin', group: 'site x' })
    docs = users.docs
    expect(docs.length).toBe(1)
    emails = docs.map(user => user.emails[ 0 ].email)
    expect(emails).toEqual(arrayContaining([ 'user2@test.com' ]))
  })

  test('removeUsersFromRoles() - remove "def" from user1 but not user2', async () => {
    const { userId1, userId2 } = await createTestFixtures()

    let user = await roleService.getRolesForUser({ userId: userId1 })
    expect(user.roles!.length).toBe(3)
    expect(user.roles).toEqual(arrayContaining([ 'user', 'superuser', 'admin' ]))

    let removeUsersFromRoles = await roleService.removeUsersFromRoles({
      userIds: userId1, roles: 'user'
    })
    expect(removeUsersFromRoles.error).toBeFalsy()

    user = await roleService.getRolesForUser({ userId: userId1 })
    expect(user.roles!.length).toBe(2)
    expect(user.roles).toEqual(arrayContaining([ 'superuser', 'admin' ]))

    user = await roleService.getRolesForUser({ userId: userId2 })
    expect(user.roles!.length).toBe(5)
    expect(user.roles).toEqual(arrayContaining([ 'user', 'superuser', 'superadmin', 'god', 'admin' ]))

    removeUsersFromRoles = await roleService.removeUsersFromRoles({
      userIds: userId2, roles: [ 'user', 'god', 'admin', 'no match' ]
    })
    expect(removeUsersFromRoles.error).toBeFalsy()

    user = await roleService.getRolesForUser({ userId: userId2 })
    expect(user.roles!.length).toBe(2)
    expect(user.roles).toEqual(arrayContaining([ 'superuser', 'superadmin' ]))
  })

  test('removeUsersFromAllRoles()', async () => {
    const { userId1, userId2, userId3 } = await createTestFixtures()

    const removeUsersFromAllRoles = await roleService.removeUsersFromAllRoles({ userIds: [ userId1, userId2, userId3 ] })
    expect(removeUsersFromAllRoles.error).toBeFalsy()

    let user = await roleService.getRolesForUser({ userId: userId1 })
    expect(user.error).toBeFalsy()
    expect(user.roles!.length).toBe(0)

    user = await roleService.getRolesForUser({ userId: userId2 })
    expect(user.error).toBeFalsy()
    expect(user.roles!.length).toBe(0)

    user = await roleService.getRolesForUser({ userId: userId3 })
    expect(user.error).toBeFalsy()
    expect(user.roles!.length).toBe(0)
  })

  test('userIsInRoles()', async () => {
    const { userId1, userId2, userId3 } = await createTestFixtures()

    expect((await roleService.userIsInRoles(
      { userId: userId1, roles: 'superuser', group: 'site 2' }))).toBe(true)
    expect((await roleService.userIsInRoles(
      { userId: userId1, roles: 'admin', group: 'site 2' }))).toBe(true)
    expect((await roleService.userIsInRoles(
      { userId: userId1, roles: 'admin' }))).toBe(false)
    expect((await roleService.userIsInRoles(
      { userId: userId1, roles: 'admin', group: 'site 2' }))).toBe(true)

    expect((await roleService.userIsInRoles(
      { userId: userId2, roles: 'god' }))).toBe(true)
    expect((await roleService.userIsInRoles(
      { userId: userId2, roles: 'god', group: 'site 2' }))).toBe(true)
    expect((await roleService.userIsInRoles(
      { userId: userId2, roles: 'god', group: 'any site' }))).toBe(true)
    expect((await roleService.userIsInRoles(
      { userId: userId2, roles: 'admin' }))).toBe(false)
    expect((await roleService.userIsInRoles(
      { userId: userId2, roles: 'admin', group: 'any site' }))).toBe(false)
    expect((await roleService.userIsInRoles(
      { userId: userId2, roles: 'admin', group: 'site 2' }))).toBe(true)

    expect((await roleService.userIsInRoles(
      { userId: userId3, roles: 'admin' }))).toBe(false)
    expect((await roleService.userIsInRoles(
      { userId: userId3, roles: [ 'admin', 'god' ] }))).toBe(false)
    expect((await roleService.userIsInRoles(
      { userId: userId3, roles: [ 'admin', 'god' ], group: 'site 1' }))).toBe(true)
    expect((await roleService.userIsInRoles(
      { userId: userId3, roles: [ 'admin', 'god' ], group: 'site 2' }))).toBe(false)
    expect((await roleService.userIsInRoles(
      { userId: userId3, roles: [ 'admin', 'god' ], group: 'site 3' }))).toBe(true)
  })
})
