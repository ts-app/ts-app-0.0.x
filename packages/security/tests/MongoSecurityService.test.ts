import { MongoService } from '@ts-app/mongo'
import { MongoSecurityService } from '../src/MongoSecurityService'
import { SecurityService } from '../src/SecurityService'
import { Profile, User } from '@ts-app/common'
import { RoleService } from '../src/RoleService'
import { MongoRoleService } from '../src/MongoRoleService'

describe('MongoSecurityService', async () => {
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
    } catch {
      // ignore if cannot drop collection
    }
  })

  afterEach(async () => {
    const db = await mongoService.db()
    return db.close()
  })

  const createTestFixtures = async (): Promise<User> => {
    const signUp = await securityService.signUp({ email: 'test@test.com', password: 'abc123' })
    expect(signUp.error).toBeFalsy()
    expect(signUp.user!.id.length).toBe(24)
    return signUp.user!
  }

  test('user sign up & login with email/password (via bcrypt)', async () => {
    const user = await createTestFixtures()

    const loginWithEmailPassword = await securityService.loginWithEmailPassword({
      email: 'test@test.com',
      password: 'abc123'
    })
    expect(loginWithEmailPassword.error).toBeFalsy()

    const accessToken: any = (securityService as MongoSecurityService).verifyToken(loginWithEmailPassword.accessToken!)
    expect(accessToken.userId).toBe(user.id)

    const refreshToken: any = (securityService as MongoSecurityService).verifyToken(loginWithEmailPassword.refreshToken!)
    expect(refreshToken.userId).toBe(user.id)
  })

  test('user sign up & login with user ID (via JWT)', async () => {
    const user = await createTestFixtures()

    const loginWithUserId = await securityService.loginWithUserId(user.id)
    return expect(loginWithUserId.user).toMatchObject(user)
  })

  test('getProfile()', async () => {
    const user = await createTestFixtures()
    const sampleProfile: Profile = {
      name: 'aaa',
      email: 'aaa@bbb.com',
      avatarUrl: 'http://aaa'
    }

    let getProfile = await securityService.getProfile({ id: user.id })
    expect(getProfile).toMatchSnapshot()

    await securityService.setProfile({ id: user.id, profile: sampleProfile })
    getProfile = await securityService.getProfile({ id: user.id })
    expect(getProfile).toMatchObject(sampleProfile)

    const updatedProfile: Profile = { name: 'bbb', email: 'bbb@bbb.com' }
    await securityService.setProfile({ id: user.id, profile: updatedProfile })
    getProfile = await securityService.getProfile({ id: user.id })
    expect(getProfile).toMatchObject(updatedProfile)
  })

  test('setProfile() and updateProfile()', async () => {
    const user = await createTestFixtures()
    const sampleProfile: Profile = {
      name: 'aaa',
      email: 'aaa@bbb.com',
      avatarUrl: 'http://aaa'
    }

    await securityService.setProfile({ id: user.id, profile: sampleProfile })
    let getProfile = await securityService.getProfile({ id: user.id })
    expect(getProfile).toMatchObject(sampleProfile)

    // perform partial profile update
    await securityService.updateProfile({
      id: user.id,
      profile: {
        email: 'ccc@bbb.com'
      }
    })
    getProfile = await securityService.getProfile({ id: user.id })
    expect(getProfile).toMatchObject({
      ...sampleProfile,
      email: 'ccc@bbb.com'
    })
  })

  test('user()', async () => {
    const user = await createTestFixtures()
    const retrievedUser = await securityService.user(user.id)
    expect(retrievedUser.user!).toMatchObject(user)
  })

  test('user() with invalid user ID', async () => {
    const retrievedUser = await securityService.user('012345678912')
    expect(retrievedUser).toMatchSnapshot()
  })

  test('seedUsers()', async () => {
    const seedUsers = await securityService.seedUsers()
    expect(seedUsers.error).toBeFalsy()

    // users created
    const users = await securityService.users({ limit: 100 })
    expect(users.docs.length).toBe(21)

    // can login as admin, can get access token
    let login = await securityService.loginWithEmailPassword({
      email: 'admin@test.local',
      password: 'testAdmin'
    })
    expect(login.error).toBeFalsy()
    expect(login.accessToken!.length).toBeGreaterThan(0)

    // can login as test user
    login = await securityService.loginWithEmailPassword({
      email: 'user1@test.local',
      password: 'testUser'
    })
    expect(login.error).toBeFalsy()
    expect(login.accessToken!.length).toBeGreaterThan(0)
  })

  test('seedUsers() cannot seed twice', async () => {
    const seedUsers = await securityService.seedUsers()
    expect(seedUsers.error).toBeFalsy()

    const reseedUsers = await securityService.seedUsers()
    expect(reseedUsers.error).toBeTruthy()
  })

  test('users()', async () => {
    const seedUsers = await securityService.seedUsers()
    expect(seedUsers.error).toBeFalsy()

    const admin = await securityService.users({ q: 'admi' })
    expect(admin.docs.length).toBe(1)

    const users = await securityService.users({ q: 'use' })
    expect(users.docs.length).toBe(10)
    expect(users.cursor).toBeTruthy()

    const users11to20 = await securityService.users({ q: 'use', cursor: users.cursor })
    expect(users11to20.docs.length).toBe(10)
    expect(users11to20.cursor).toBeTruthy()

    const users21to30 = await securityService.users({ q: 'use', cursor: users11to20.cursor })
    expect(users21to30.cursor).toBeFalsy()
    expect(users21to30.docs.length).toBe(0)
  })

  test('deleteUser()', async () => {
    const user = await createTestFixtures()
    expect(await securityService.removeUser(user.id)).toBe(1)
    // delete again...
    expect(await securityService.removeUser(user.id)).toBe(0)
  })

  test('seedUsers(true) will force delete', async () => {
    const seedUsers = await securityService.seedUsers()
    expect(seedUsers.error).toBeFalsy()

    const reseedUsers = await securityService.seedUsers({ force: true })
    expect(reseedUsers.error).toBeFalsy()
  })

  test('reset()', async () => {
    // create test user
    await createTestFixtures()

    // cannot reset if admin@test.local does not exist
    let reset = await securityService.reset()
    expect(reset.error).toBe('Pre-requisite to reset not met')

    // seed test user (admin@test.local)
    const seed = await securityService.seedUsers({ force: true })
    expect(seed.error).toBeFalsy()

    // reset database (a system with admin@test.local is seen as a test system, so allow reset())
    reset = await securityService.reset()
    expect(reset.error).toBeFalsy()
  })

  test('seedUsers() - create roles', async () => {
    const seedUsers = await securityService.seedUsers()
    expect(seedUsers.error).toBeFalsy()

    const adminLogin = await securityService.loginWithEmailPassword({
      email: 'admin@test.local',
      password: 'testAdmin'
    })
    let { userId } = (securityService as MongoSecurityService).verifyToken(adminLogin.accessToken!)
    let roles = await roleService.getRolesForUser({ userId })
    expect(roles).toMatchObject({ roles: [ 'Administrator' ] })

    let userLogin = await securityService.loginWithEmailPassword({
      email: 'user1@test.local',
      password: 'testUser'
    })
    userId = (securityService as MongoSecurityService).verifyToken(userLogin.accessToken!).userId
    roles = await roleService.getRolesForUser({ userId })
    expect(roles).toMatchObject({ roles: [ 'User' ] })
  })
})
