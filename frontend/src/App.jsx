import { useEffect, useState } from 'react'
import './App.css'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CitizenDashboard from './pages/CitizenDashboard'
import ReportComplaint from './pages/ReportComplaint'
import AuthorityDashboard from './pages/AuthorityDashboard'
import { clearSession, getSession } from './services/authStorage'

const navigate = (path) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [session, setSession] = useState(() => getSession())

  useEffect(() => {
    const handleRouteChange = () => {
      setPath(window.location.pathname)
      setSession(getSession())
    }

    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  useEffect(() => {
    if (path === '/' && session) {
      navigate(session.user.role === 'authority'
        ? '/authority/dashboard'
        : '/citizen/dashboard')
    }
  }, [path, session])

  const logout = () => {
    clearSession()
    setSession(null)
    navigate('/login')
  }

  if (path === '/register') {
    return <RegisterPage navigate={navigate} />
  }

  if (path === '/login' || path === '/') {
    return (
      <LoginPage
        navigate={navigate}
        onLogin={(nextSession) => setSession(nextSession)}
      />
    )
  }

  if (!session) {
    return (
      <LoginPage
        navigate={navigate}
        onLogin={(nextSession) => setSession(nextSession)}
      />
    )
  }

  if (path === '/citizen/dashboard') {
    if (session.user.role !== 'citizen') {
      navigate('/authority/dashboard')
      return null
    }
    return (
      <CitizenDashboard
        user={session.user}
        onLogout={logout}
        navigate={navigate}
      />
    )
  }

  if (path === '/citizen/report') {
    if (session.user.role !== 'citizen') {
      navigate('/authority/dashboard')
      return null
    }
    return (
      <ReportComplaint
        user={session.user}
        onLogout={logout}
        navigate={navigate}
      />
    )
  }

  if (path === '/authority/dashboard') {
    if (session.user.role !== 'authority') {
      navigate('/citizen/dashboard')
      return null
    }
    return <AuthorityDashboard user={session.user} onLogout={logout} />
  }

  return (
    <LoginPage
      navigate={navigate}
      onLogin={(nextSession) => setSession(nextSession)}
    />
  )
}

export default App
