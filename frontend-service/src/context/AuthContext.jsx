import React, { createContext, useContext, useReducer, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const initialState = {
  token: null,
  user: null,
  isAuthenticated: false,
  loading: true,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
      }
    case 'LOGOUT':
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
      }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false })
      return
    }

    // Validate token
    const baseURL = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:3001'
    axios
      .get(`${baseURL}/api/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        dispatch({
          type: 'LOGIN',
          payload: { token, user: res.data.data?.user || res.data.data || res.data },
        })
      })
      .catch(() => {
        localStorage.removeItem('token')
        dispatch({ type: 'LOGOUT' })
      })
  }, [])

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
