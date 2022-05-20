import axios, { AxiosError } from "axios";
import Router from "next/router";
import { destroyCookie, parseCookies, setCookie } from 'nookies'
import { signOut } from "../contexts/AuthContext";

let cookies = parseCookies()
let isRefreshing = false
let failedRequestQueue = []

export const api = axios.create({
  baseURL: 'http://localhost:3333',
  headers: {
    Authorization: `Bearer ${cookies['nextauth.token']}`
  }
})

api.interceptors.response.use(response => {
  return response
}, (error: AxiosError) => {
  if (error.response.status === 401) {
    if (error.response.data?.code === 'token.expired') {
      // renovar o token
      cookies = parseCookies()

      const { 'nextauth.refreshToken': refreshToken } = cookies
      const originalConfig = error.config

      if (!isRefreshing) {
        isRefreshing = true

        api.post('/refresh', {
          refreshToken
        }).then(response => {
          const { token } = response.data
        
        setCookie(undefined, 'nextauth.token', token, {
          maxAge: 60 * 60 * 24 * 30, // duração 30 days
          path: '/' // define uso global dos cookies na aplicação, é possível determinar uma unica página.
        })
        setCookie(undefined, 'nextauth.refreshToken', response.data.refreshToken, {
          maxAge: 60 * 60 * 24 * 30, // duração 30 days
          path: '/' // define uso global dos cookies na aplicação, é possível determinar uma unica página.
        })

        api.defaults.headers['Authorization'] = `Bearer ${token}`

        failedRequestQueue.forEach(request => request.resolve(token))
        failedRequestQueue = []
      }).catch(error => {
        failedRequestQueue.forEach(request => request.reject(error))
        failedRequestQueue = []
      }).finally(() => {
        isRefreshing = false
      })
     }

      return new Promise((resolve, reject) => { 
        failedRequestQueue.push({
          resolve: (token: string) => {
            originalConfig.headers['Authorization'] = `Bearer ${token}`

            resolve(api(originalConfig))
          },
          reject: (error: AxiosError) => {
            reject(error)
          }
        })
      })
    } else {
    // deslogar usuario
     signOut()
    } 
  }

  return Promise.reject(error)
})