import { useState } from 'react'
import AuthBrand from './AuthBrand'
import { loginUser } from '../services/authService'
import { saveSession } from '../services/authStorage'

function LoginPage({ navigate, onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!email.trim() || !password) {
      return 'Email and password are required.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Enter a valid email address.'
    }
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await loginUser(email.trim(), password)
      const session = {
        token: response.data.token,
        user: response.data.user
      }
      saveSession(session)
      onLogin(session)

      navigate(session.user.role === 'authority'
        ? '/authority/dashboard'
        : '/citizen/dashboard')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <AuthBrand />
        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <p className="form-kicker">WELCOME BACK</p>
            <h1>Sign in</h1>
            <p className="form-subtitle">Access your CivicConnect account.</p>

            {error && <div className="alert alert-error" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />

              <label htmlFor="login-password">Password</label>
              <div className="password-field">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="auth-switch">
              New to CivicConnect?{' '}
              <button type="button" onClick={() => navigate('/register')}>
                Create an account
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
