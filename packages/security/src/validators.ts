const isEmail = (email: string) => {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(email)
}

export const validateEmail = (email: string): boolean => {
  return !!(email && email.trim().length >= 3 && isEmail(email))
}

export const validatePassword = (password: string): boolean => {
  return !!(password && password.trim().length > 0)
}
