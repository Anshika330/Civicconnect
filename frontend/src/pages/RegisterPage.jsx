import { useState } from 'react'
import AuthBrand from './AuthBrand'
import { registerCitizen } from '../services/authService'

function RegisterPage({ navigate }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }))
  }

  const validate = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      return 'Full name, email, phone number and password are required.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'Enter a valid email address.'
    }
    if (form.password.length < 8) {
      return 'Password must be at least 8 characters.'
    }
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      setSuccess('')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await registerCitizen(
        form.name.trim(),
        form.email.trim(),
        form.password,
        form.phone.trim()
      )
      setSuccess('Registration successful. You can now sign in.')
      setForm({ name: '', email: '', phone: '', password: '' })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell register-shell">
        <AuthBrand />
        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <p className="form-kicker">JOIN CIVICCONNECT</p>
            <h1>Create account</h1>
            <p className="form-subtitle">Register as a citizen to report civic issues.</p>

            {error && <div className="alert alert-error" role="alert">{error}</div>}
            {success && <div className="alert alert-success" role="status">{success}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Your full name"
                autoComplete="name"
              />

              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="name@example.com"
                autoComplete="email"
              />

              <label htmlFor="register-phone">Phone number</label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateField}
                placeholder="Phone number"
                autoComplete="tel"
              />

              <label htmlFor="register-password">Password</label>
              <div className="password-field">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={updateField}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
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
                {loading ? 'Creating account...' : 'Create citizen account'}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?{' '}
              <button type="button" onClick={() => navigate('/login')}>
                Sign in
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default RegisterPage
