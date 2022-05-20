import { createContext, ReactNode, useEffect, useState } from "react";
import { setCookie, parseCookies, destroyCookie } from 'nookies'
import { api } from "../services/api";
import Router from 'next/router';

type User = {
  email: string;
  permissions: string[];
  roles: string[];
}

type AuthProviderProps = { 
   children: ReactNode
}

type signInCredentials = {
  email: string;
  password: string;
}

type AuthContextData = {
  signIn(credentials: signInCredentials): Promise<void>
  user: User
  isAuthenticated: boolean
}

export const AuthContext = createContext({} as AuthContextData)

export function signOut() {
  destroyCookie(undefined, 'nextauth.token')
  destroyCookie(undefined, 'nextauth.refreshToken')

  Router.push('/')
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>()
  const isAuthenticated = !!user

  useEffect(() => {
    const { 'nextauth.token': token } = parseCookies()
  
    if (token) {
      api.get<User>('/me').then((response) => {
        const { email, permissions, roles } = response.data
        setUser({
          email,
          permissions,
          roles
        })
      }).catch(() => {
        signOut()
      })
    }
  }, [])

  async function signIn({ email, password }: signInCredentials) {
    try {
      const response = await api.post('/sessions', { email, password })

      const { token, refreshToken, permissions, roles } = response.data

      setCookie(undefined, 'nextauth.token', token, {
        maxAge: 60 * 60 * 24 * 30, // duração 30 days
        path: '/' // define uso global dos cookies na aplicação, é possível determinar uma unica página.
      })
      setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // duração 30 days
        path: '/' // define uso global dos cookies na aplicação, é possível determinar uma unica página.
      })

      setUser({
        email,
        permissions,
        roles
      })

      api.defaults.headers['Authorization'] = `Bearer ${token}`

      Router.push('/dashboard')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <AuthContext.Provider value={{ signIn, user, isAuthenticated }}>
      { children }
    </AuthContext.Provider>
  )
}