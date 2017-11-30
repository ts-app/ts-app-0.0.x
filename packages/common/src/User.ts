import { Profile } from './Profile'

export interface User<T extends Profile = Profile> {
  id: string
  createdAt: Date
  emails: {
    email: string
    verified: boolean
  }[]
  services?: {
    password?: {
      bcrypt: string
    }
    // resume?: {
    //   loginTokens: {
    //     when: Date
    //     token: string
    //   }[]
    // }
    // facebook?: {
    //   accessToken: string
    //   expiresAt: number
    //   id: string
    //   email: string
    //   name: string
    //   firstName: string
    //   lastName: string
    //   link: string
    // }
    jwt?: {
      refreshTokens: {
        name: string
        token: string
      }[]
    }
  }
  roles?: { role: string, group: string }[]
  profile?: T
}
