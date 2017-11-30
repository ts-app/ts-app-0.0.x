import { Profile, User } from '@ts-app/common'
import { FindWithCursor } from '@ts-app/mongo'

export interface SecurityService {
  signUp (input: { email: string, password: string }): Promise<{ error?: string, user?: User }>

  loginWithEmailPassword (input: { email: string, password: string }): Promise<{ error?: string, userId?: string, accessToken?: string, refreshToken?: string }>

  user (id: string): Promise<{ error?: string, user?: User }>

  users (input: { q?: string, limit?: number, cursor?: string }): Promise<FindWithCursor<User>>

  removeUser (id: String): Promise<number>

  seedUsers (input?: { force?: boolean, userCount?: number }): Promise<{ error?: string }>

  updateProfile (input: { id: string, profile: object }): Promise<{ error?: string }>

  reset (): Promise<{ error?: string }>

  // --- TODO: not impl

  loginWithUserId (id: string): Promise<{ error?: string, user?: User }>

  setProfile<T extends Profile> (input: { id: string, profile: T }): Promise<void>

  getProfile<T extends Profile> (input: { id: string }): Promise<T>

}
