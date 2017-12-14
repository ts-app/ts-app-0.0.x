import * as passport from 'passport'
import { StrategyOptions, Strategy, ExtractJwt } from 'passport-jwt'
import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import * as bcryptjs from 'bcryptjs'
import { FindWithCursor, MongoService } from '@ts-app/mongo'
import { escapeRegex, Profile, User } from '@ts-app/common'
import { validateEmail, validatePassword } from './validators'
import { SecurityService } from './SecurityService'
import {
  Resolver,
  SecurityMiddleware,
  ServiceInfo,
  userIdMatchParam,
  environmentVariableIsSet
} from '@ts-app/graphql'
import { RoleService } from './RoleService'
import { DefaultRoles } from './DefaultRoles'

/**
 * SecurityService implementation that uses MongoDB as the data storage.
 *
 * This implementation also provides an Express middleware that configures JWT authentication.
 */
export class MongoSecurityService implements SecurityService, SecurityMiddleware, ServiceInfo {
  private mongoService: MongoService
  private roleService: RoleService
  private secretOrKey: string
  private accessTokenExpiresIn: string
  private refreshTokenExpiresIn: string

  constructor ({ mongoService, roleService, secretOrKey = 'taktau', accessTokenExpiresIn = '30m', refreshTokenExpiresIn = '30d' }: {
    mongoService: MongoService, roleService: RoleService
    secretOrKey?: string, accessTokenExpiresIn?: string, refreshTokenExpiresIn?: string
  }) {
    this.mongoService = mongoService
    this.roleService = roleService
    this.secretOrKey = secretOrKey
    this.accessTokenExpiresIn = accessTokenExpiresIn
    this.refreshTokenExpiresIn = refreshTokenExpiresIn

    this.configurePassport()
  }

  info (): { serviceName: string; } {
    return {
      serviceName: 'SecurityService'
    }
  }

  /**
   *
   * @param {string[]} roles List of roles authorized to access resource. Empty array allows any
   * authenticated request to access resource. Undefined/Null value allows authenticated requests
   * to access resource.
   * @return {(req: Request, res: Response, next: e.NextFunction) => any}
   */
  middleware (roles?: string[] | undefined) {
    const mustBeLoggedIn = !!roles
    const authorizedRoles = roles || []

    return (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate('jwt', async (err: any, user: User | false, info: any) => {
        if (err) {
          console.error(err)
          res.status(500).send('Authentication error!')
        } else {
          if (user) {
            // --- request auth: step 2 of 3. assign user to request if authentication was successful
            req.user = user
            if (authorizedRoles && authorizedRoles.length > 0) {
              const isAuthorized = await this.roleService.userIsInRoles({
                userId: user.id,
                roles: authorizedRoles
              })
              if (isAuthorized) {
                // allow authenticated AND authorized access
                next()
              } else {
                // authenticated but not authorized (no access)
                res.status(401).send('Unauthorized access!')
              }
            } else {
              // allow any authenticated access
              next()
            }
          } else {
            // not authenticated
            if (mustBeLoggedIn) {
              res.status(401).send('Unauthenticated access!')
            } else {
              // allow unauthenticated access
              next()
            }
          }
        }
      })(req, res, next)
    }
  }

  configurePassport () {
    const loginWithUserId = this.loginWithUserId.bind(this)
    const jwtFromRequest = ExtractJwt.fromExtractors([
      ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter('accessToken')
    ])
    const strategyOptions: StrategyOptions = { jwtFromRequest, secretOrKey: this.secretOrKey }
    const strategy = new Strategy(strategyOptions, async (payload, next) => {
      try {
        // --- request auth: step 1 of 3. extract JWT token and perform user login if need
        const user = await loginWithUserId(payload.userId)
        if (!user.error) {
          // valid user login
          next(null, user.user)
        } else {
          // invalid user login
          next(null, false)
        }
      } catch (e) {
        console.error('Authentication error.', e)
        next(true)
      }
    })
    passport.use(strategy)
  }

  @Resolver({ type: 'mutation' })
  async signUp (input: { email: string, password: string }): Promise<{ error?: string, user?: User }> {
    const { email, password } = input

    if (!validateEmail(email)) {
      return { error: 'Invalid email' }
    }
    if (!validatePassword(password)) {
      return { error: 'Invalid password' }
    }

    const emailExist = await this.mongoService.get<User>('users', { 'emails.email': email })
    if (emailExist) {
      return { error: 'User already exist' }
    }

    const bcrypt = await bcryptjs.hash(password, 8)
    const userId = await this.mongoService.create<User>('users', {
      id: '',
      createdAt: new Date(),
      services: {
        password: {
          bcrypt
        }
      },
      emails: [
        { email, verified: true }
      ],
      profile: {
        email: email,
        name: email.substr(0, email.indexOf('@'))
      }
    })

    const user = await this.mongoService.get<User>('users', userId)
    if (user) {
      return { user }
    } else {
      return { error: `Error getting user with ID [${userId}]` }
    }
  }

  @Resolver({ type: 'mutation' })
  async loginWithEmailPassword (input: {
    email: string, password: string
  }): Promise<{ error?: string, userId?: string, accessToken?: string, refreshToken?: string }> {
    const { email, password } = input
    const filter = {
      emails: {
        email,
        verified: true
      }
    }
    const user = await this.mongoService.get<User>('users', filter)
    if (user) {
      const { services } = user
      const userBcrypt = services && services.password && services.password.bcrypt
      if (userBcrypt && await bcryptjs.compare(password, userBcrypt)) {
        // login successful, return tokens with user ID as payload
        const payload = {
          userId: user.id
        }
        return {
          userId: user.id,
          ...this.generateTokens(payload)
        }
      }
    }
    return { error: 'Invalid login attempt' }
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ], type: 'query', paramNames: [ 'id' ] })
  async user (id: string): Promise<{ error?: string, user?: User }> {
    const user = await this.mongoService.get<User>('users', id)
    if (!user) {
      return { error: `Error getting user [${id}]` }
    } else {
      return { user }
    }
  }

  /**
   * Create test/seed users within the system.
   *
   * Resolver authorization prevents execution of this function unless environment variable 'seed' is set to '1'.
   */
  @Resolver({ auth: environmentVariableIsSet('seed'), type: 'mutation' })
  async seedUsers (input: { force?: boolean, userCount?: number } = {}): Promise<{ error?: string }> {
    const { force = false, userCount = 20 } = input
    if (!force) {
      // prevent seeding if users exist
      const Users = await this.mongoService.collection('users')
      const userCount = await Users.count({})

      if (userCount > 0) {
        return { error: 'Cannot seed database with users' }
      }
    } else {
      // remove seeded users
      await this.mongoService.remove('users', {
        $or: [
          { 'emails.email': { $regex: 'user[0-9]+@test\.local' } },
          { 'emails.email': 'admin@test.local' }
        ]
      })
    }

    let signUp = await this.signUp({ email: 'admin@test.local', password: 'testAdmin' })
    if (signUp.error) {
      return signUp
    }

    await this.roleService.addUsersToRoles({
      userIds: signUp!.user!.id,
      roles: DefaultRoles.Administrator
    })

    const userIds = []
    for (let c = 1; c <= userCount; c++) {
      let signUp = await this.signUp({ email: `user${c}@test.local`, password: 'testUser' })
      if (signUp.error) {
        return signUp
      }
      userIds.push(signUp!.user!.id)
    }
    await this.roleService.addUsersToRoles({ userIds, roles: DefaultRoles.User })

    return {}
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ], type: 'query' })
  users (input: { q?: string, limit?: number, cursor?: string } = {}): Promise<FindWithCursor<User>> {
    const { q, limit = 10, cursor } = input
    let filter = {}
    if (q && q.trim().length > 0) {
      filter = {
        $or: [
          { 'profile.email': { $regex: `^${escapeRegex(q)}`, $options: 'i' } },
          { 'profile.email': { $regex: `${escapeRegex(q)}$`, $options: 'i' } },

          { 'profile.name': { $regex: `^${escapeRegex(q)}`, $options: 'i' } },
          { 'profile.name': { $regex: `${escapeRegex(q)}$`, $options: 'i' } }
        ]
      }
    }

    return this.mongoService.findWithCursor<User>('users', filter, limit, cursor)
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ], type: 'mutation', paramNames: [ 'id' ] })
  async removeUser (id: String) {
    return this.mongoService.remove('users', id)
  }

  @Resolver({ auth: userIdMatchParam('id'), type: 'mutation' })
  async updateProfile (input: { id: string, profile: { [key: string]: any } }): Promise<{ error?: string }> {
    const { id, profile } = input
    const profileWithPrefix = Object.keys(profile).reduce((p: { [key: string]: any }, key: string) => {
      p[ `profile.${key}` ] = profile[ key ]
      return p
    }, {})

    await this.mongoService.update('users', id, {
      $set: {
        ...profileWithPrefix
      }
    })

    return {}
  }

  @Resolver({ auth: [ DefaultRoles.Administrator ], type: 'mutation' })
  async reset (): Promise<{ error?: string }> {
    const users = await this.mongoService.findWithCursor<User>('users', {
      'emails.email': 'admin@test.local'
    })

    if (users.docs.length === 0) {
      return { error: 'Pre-requisite to reset not met' }
    }

    return this.mongoService.dropCollection('users')
  }

  // --- stuff below... TODO: not done...

  @Resolver({ auth: userIdMatchParam('id'), type: 'mutation' })
  async setProfile<T extends Profile> (input: { id: string, profile: T }): Promise<void> {
    const { id, profile } = input
    return this.mongoService.update('users', id, { profile })
  }

  async getProfile<T extends Profile> (input: { id: string }): Promise<T> {
    const { id } = input
    const user = await this.mongoService.get<User>('users', id, {
      fields: { profile: 1 }
    })
    if (!user) {
      throw new Error(`Error getting profile for user [${id}]`)
    }

    return user.profile as T
  }

  async loginWithUserId (id: string): Promise<{ error?: string, user?: User }> {
    const user = await this.mongoService.get<User>('users', id)
    if (user) {
      return { user }
    }
    return { error: 'Invalid login attempt' }
  }

  verifyToken (token: string): any {
    return jwt.verify(token, this.secretOrKey)
  }

  private generateTokens (payload: any) {
    const accessToken = jwt.sign(payload, this.secretOrKey, {
      expiresIn: this.accessTokenExpiresIn
    })
    // TODO use var randtoken = require('rand-token')
    const refreshToken = jwt.sign(payload, this.secretOrKey, {
      expiresIn: this.refreshTokenExpiresIn
    })

    return { accessToken, refreshToken }
  }
}
