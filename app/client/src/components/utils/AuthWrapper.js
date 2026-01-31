import React from 'react'
import { Navigate } from 'react-router-dom'
import { AuthService } from '../../services'

const AuthWrapper = ({ children, redirect }) => {
  const [authed, setAuthed] = React.useState(true)
  const [checkingAuth, setCheckingAuth] = React.useState(true)
  const [showReleaseNotes, setShowReleaseNotes] = React.useState(false)
  const [releaseNotes, setReleaseNotes] = React.useState(null)

  React.useEffect(() => {
    async function isLoggedIn() {
      try {
        const response = (await AuthService.isLoggedIn()).data
        // Handle both old (boolean) and new (object) response formats
        if (typeof response === 'object') {
          setAuthed(response.authenticated)
          setShowReleaseNotes(response.show_release_notes || false)
          setReleaseNotes(response.release_notes || null)
        } else {
          setAuthed(response)
        }
      } catch (err) {
        setAuthed(false)
        console.error(err)
      }
      setCheckingAuth(false)
    }
    isLoggedIn()
  }, [])

  if (checkingAuth) return <div></div>

  const childProps = {
    authenticated: authed,
    showReleaseNotes,
    releaseNotes,
    setShowReleaseNotes,
  }

  if (!redirect) return React.cloneElement(children, childProps)
  else return authed ? React.cloneElement(children, childProps) : <Navigate to={redirect} />
}

export default AuthWrapper
