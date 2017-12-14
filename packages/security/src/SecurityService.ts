import { Profile, User } from '@ts-app/common'
import { FindWithCursor } from '@ts-app/mongo'

/**
 * This service provides user sign up, login and related account management functions.
 */
export interface SecurityService {
  /**
   * Sign up user with email and password.
   *
   * User object is returned if sign up is successful, otherwise returns an error message.
   */
  signUp (input: { email: string, password: string }): Promise<{ error?: string, user?: User }>

  /**
   * Login using specified email and password.
   *
   * User ID, JWT access token and refresh token is returned if login is successful, otherwise returns an error message.
   *
   */
  loginWithEmailPassword (input: { email: string, password: string }): Promise<{ error?: string, userId?: string, accessToken?: string, refreshToken?: string }>

  /**
   * Get user object based on user ID.
   *
   * User object is returned if a valid user ID is provided, otherwise returns an error message.
   */
  user (id: string): Promise<{ error?: string, user?: User }>

  /**
   * Find users with option to filter, limit and perform pagination on results.
   *
   * Returns a FindWithCursor where docs are User objects.
   */
  users (input: { q?: string, limit?: number, cursor?: string }): Promise<FindWithCursor<User>>

  /**
   * Remove/Delete the user.
   */
  removeUser (id: String): Promise<number>

  /**
   * Create test/seed users within the system.
   *
   * Danger: This function can compromise application security. Refer to implementation specific
   * documentation for details.
   */
  seedUsers (input?: { force?: boolean, userCount?: number }): Promise<{ error?: string }>

  /**
   * Update a user's profile object.
   */
  updateProfile (input: { id: string, profile: object }): Promise<{ error?: string }>

  /**
   * Reset all security service data.
   *
   * Danger: This function can compromise application security. Refer to implementation specific
   * documentation for details.
   */
  reset (): Promise<{ error?: string }>

  // --- stuff below... TODO: not done...

  loginWithUserId (id: string): Promise<{ error?: string, user?: User }>

  setProfile<T extends Profile> (input: { id: string, profile: T }): Promise<void>

  getProfile<T extends Profile> (input: { id: string }): Promise<T>

}
