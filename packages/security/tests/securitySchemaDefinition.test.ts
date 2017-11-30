import { ApolloFetch, createApolloFetch } from 'apollo-fetch'
import {
  mergeSchemaDefinitions,
  SchemaDefinition,
  ResolverService,
  serveSchema
} from '@ts-app/graphql'
import { Server } from 'http'
import gql from 'graphql-tag'
import { MongoService } from '@ts-app/mongo'
import { securitySchemaDefinition } from '../src/securitySchemaDefinition'
import { makeExecutableSchema } from 'graphql-tools'
import { MongoSecurityService } from '../src/MongoSecurityService'

describe('securitySchemaDefinition', async () => {
  const localUrl = 'mongodb://localhost:27017'
  let security: SchemaDefinition
  let mongoService: MongoService
  const resolverService = ResolverService.getInstance()
  let server: Server
  let fetch: ApolloFetch

  beforeAll(async () => {
    mongoService = new MongoService(localUrl)
    security = securitySchemaDefinition({ mongoService })
    const merged = mergeSchemaDefinitions([ security ])
    server = await serveSchema({ schema: makeExecutableSchema(merged) })
    fetch = createApolloFetch({ uri: 'http://localhost:3000/graphql' })
  })

  afterAll(async () => {
    // shutdown graphql
    await new Promise(resolve => server.close(resolve))
    resolverService.resetServices()

    // shutdown services
    const db = await mongoService.db()
    await db.close()
  })

  beforeEach(async () => {
    try {
      await mongoService.dropCollection('users')
      await mongoService.dropCollection('roles')
    } catch {
      // it's ok
    }
  })

  afterEach(() => {
    resolverService.setLogger({ error: console.error })
  })

  const hideResolverServiceLog = () => {
    resolverService.setLogger({
      error: () => {
        // do nothing
      }
    })
  }

  const createFetchAs = (accessToken: string) => {
    const fetch = createApolloFetch({ uri: 'http://localhost:3000/graphql' })
    fetch.use(({ request, options }, next) => {
      if (!options.headers) {
        options.headers = {}
      }
      options.headers[ 'Authorization' ] = 'Bearer ' + accessToken
      next()
    })
    return fetch
  }

  const querySignUp = gql`mutation($email: String!, $password: String!){
      signUp(email: $email, password: $password) {
          error
          user {
              id
              createdAt
              emails { email verified }
          }
      }
  }`

  test('security schema definition', async () => {
    expect(security).toMatchSnapshot()
  })

  test('signUp() with invalid email', async () => {
    try {
      const result = await fetch({
        query: querySignUp, variables: { email: 'bob@bob', password: '123' }
      })
      expect(result).toMatchSnapshot()
    } catch (e) {
      console.error(e)
    }

  })

  test('signUp() without password', async () => {
    const result = await fetch({
      query: querySignUp, variables: { email: 'bob@bob.com', password: '' }
    })
    expect(result).toMatchSnapshot()
  })

  test('signUp() works', async () => {
    const result = await fetch({
      query: querySignUp, variables: { email: 'bob@bob.com', password: '123' }
    })
    expect(result.errors).toBeFalsy()
    expect(result.data.signUp.user.id.length).toBe(24)
  })

  test('loginWithEmailPassword works', async () => {
    let result = await fetch({
      query: querySignUp, variables: { email: 'bob@bob.com', password: '123' }
    })
    expect(result.errors).toBeFalsy()
    const signUp = result.data.signUp

    result = await fetch({
      query: gql`mutation {
          loginWithEmailPassword(email: "bob@bob.com", password: "123") {
              error accessToken refreshToken
          }
      }`
    })

    // decode token & verify userId
    const { accessToken } = result.data.loginWithEmailPassword
    const securityService = resolverService.getService<MongoSecurityService>(MongoSecurityService)!
    const token = securityService.verifyToken(accessToken)
    expect(token.userId).toBe(signUp.user.id)
  })

  test('allow anonymous access to "signUp"', async () => {
    const result = await fetch({
      query: gql`mutation {
          signUp(email: "user@test.local", password: "secret") {
              error
              user {
                  id
              }
          }
      }`
    })

    expect(result.data.signUp.error).toBeFalsy()
    expect(result.data.signUp.user.id.length).toBe(24)
  })

  test('allow anonymous access to "loginWithEmailPassword"', async () => {
    const result = await fetch({
      query: gql`mutation {
          loginWithEmailPassword(email: "someone", password: "someone") {
              error accessToken refreshToken
          }
      }`
    })

    expect(result.data).toMatchSnapshot()
  })

  test('prevent anonymous access to "users"', async () => {
    hideResolverServiceLog()

    const result = await fetch({
      query: gql`query {
          users {
              error
              docs {
                  id
              }
          }
      }`
    })

    expect(result.data.users.error).toBeTruthy()
    expect(result.data.users).toMatchSnapshot()
  })

  test('authorized access to "users"', async () => {
    hideResolverServiceLog()

    const securityService = resolverService.getService('SecurityService') as MongoSecurityService
    const seed = await securityService.seedUsers()
    expect(seed.error).toBeFalsy()

    // anonymous can login as user1
    const user1 = await fetch({
      query: gql`mutation {
          loginWithEmailPassword(email: "user1@test.local", password: "testUser") {
              error
              accessToken
          }
      }`
    })
    const user1AccessToken = user1.data.loginWithEmailPassword.accessToken
    expect(user1AccessToken.length).toBeGreaterThan(0)

    // user1 cannot access "users"
    const userQuery = {
      query: gql`query {
          users {
              error
              docs {
                  profile {
                      email
                  }
              }
          }
      }`
    }
    const fetchAsUser1 = createFetchAs(user1AccessToken)
    let result = await fetchAsUser1(userQuery)
    let { users } = result.data
    expect(users.error).toBe('Unauthorized access!')
    expect(users.docs).toBeFalsy()

    const admin = await fetch({
      query: gql`mutation {
          loginWithEmailPassword(email: "admin@test.local", password:"testAdmin") {
              error accessToken
          }
      }`
    })

    const fetchAsAdmin = createFetchAs(admin.data.loginWithEmailPassword.accessToken)
    result = await fetchAsAdmin(userQuery)
    users = result.data.users
    expect(users).toMatchSnapshot()
  })

  test('authorized access with userIdMatchParam()', async () => {
    hideResolverServiceLog()

    const securityService = resolverService.getService('SecurityService') as MongoSecurityService
    const seed = await securityService.seedUsers()
    expect(seed.error).toBeFalsy()

    // anonymous can login as user1
    const user1 = await fetch({
      query: gql`mutation {
          loginWithEmailPassword(email: "user1@test.local", password: "testUser") {
              error
              accessToken
              userId
          }
      }`
    })
    const user1AccessToken = user1.data.loginWithEmailPassword.accessToken
    expect(user1AccessToken.length).toBeGreaterThan(0)

    // user1 can update profile for user1
    let updateProfile = {
      query: gql`mutation {
          updateProfile(id: "${user1.data.loginWithEmailPassword.userId}", profile: {name: "bob"}) {
              error
          }
      }`
    }
    const fetchAsUser1 = createFetchAs(user1AccessToken)
    let result = await fetchAsUser1(updateProfile)
    expect(result.data.updateProfile.error).toBeFalsy()

    // --- negative test case
    // anonymous can login as user2
    const user2 = await fetch({
      query: gql`mutation {
          loginWithEmailPassword(email: "user2@test.local", password: "testUser") {
              error
              accessToken
              userId
          }
      }`
    })
    const user2AccessToken = user2.data.loginWithEmailPassword.accessToken
    expect(user2AccessToken.length).toBeGreaterThan(0)

    // user2 CANNOT update profile for user1
    updateProfile = {
      query: gql`mutation {
          updateProfile(id: "${user1.data.loginWithEmailPassword.userId}", profile: {name: "bob"}) {
              error
          }
      }`
    }
    const fetchAsUser2 = createFetchAs(user2AccessToken)
    result = await fetchAsUser2(updateProfile)
    expect(result).toMatchSnapshot()
  })

})
