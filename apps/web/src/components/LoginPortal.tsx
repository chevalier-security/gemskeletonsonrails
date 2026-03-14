import { useState } from 'react'
import type { FormEvent } from 'react'
import { fetchProfile, login, signup } from '../api/client'

type LoginPortalProps = {
  onAuthTokenChange: (token: string | null) => void
}

export function LoginPortal({ onAuthTokenChange }: LoginPortalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tokenPreview, setTokenPreview] = useState<string | null>(null)
  const [profileResult, setProfileResult] = useState<string>('No profile request yet.')

  function storeToken(token: string | null, fallbackMessage: string) {
    if (!token) {
      setTokenPreview(fallbackMessage)
      onAuthTokenChange(null)
      return
    }

    localStorage.setItem('authToken', token)
    setTokenPreview(token)
    onAuthTokenChange(token)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    try {
      const token = await login(email, password)
      storeToken(token, 'Login response succeeded but no Authorization header was returned.')
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unknown login error.'
      setError(message)
      setTokenPreview(null)
      onAuthTokenChange(null)
    }
  }

  async function handleSignup() {
    setError(null)

    if (!email.trim()) {
      setError('Email is required for sign up.')
      return
    }

    if (!password) {
      setError('Password is required for sign up.')
      return
    }

    if (!passwordConfirmation) {
      setError('Password confirmation is required for sign up.')
      return
    }

    if (password !== passwordConfirmation) {
      setError('Password and confirmation must match for sign up.')
      return
    }

    try {
      const token = await signup(email, password, passwordConfirmation)
      storeToken(token, 'Signup response succeeded but no Authorization header was returned.')
    } catch (signupError) {
      const message = signupError instanceof Error ? signupError.message : 'Unknown signup error.'
      setError(message)
      setTokenPreview(null)
      onAuthTokenChange(null)
    }
  }

  async function handleProfileRequest() {
    setError(null)

    const token = localStorage.getItem('authToken')
    if (!token) {
      setError('No auth token found. Sign in first.')
      return
    }

    try {
      const profile = await fetchProfile(token)
      setProfileResult(JSON.stringify(profile, null, 2))
    } catch (profileError) {
      const message = profileError instanceof Error ? profileError.message : 'Unknown profile error.'
      setError(message)
    }
  }

  function handleClearToken() {
    localStorage.removeItem('authToken')
    setTokenPreview(null)
    setProfileResult('No profile request yet.')
    onAuthTokenChange(null)
  }

  return (
    <section className="panel" aria-label="Auth portal demo">
      <h2>Auth portal (TypeScript + React)</h2>
      <p>
        This is a minimal frontend auth flow. It can sign up and sign in,
        store a JWT from the response header, and call a protected endpoint.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />

        <label htmlFor="password-confirmation">Password confirmation (if signing up)</label>
        <input
          id="password-confirmation"
          type="password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          placeholder="••••••••"
        />

        <div className="button-row">
          <button type="submit">Sign in</button>
          <button type="button" onClick={handleSignup}>
            Sign up
          </button>
          <button type="button" onClick={handleProfileRequest}>
            Test /profile
          </button>
          <button type="button" onClick={handleClearToken}>
            Clear token
          </button>
        </div>
      </form>

      {error ? <p className="error-text">{error}</p> : null}

      <p>
        Token preview:{' '}
        <code>{tokenPreview ? `${tokenPreview.slice(0, 36)}...` : 'none yet'}</code>
      </p>
      <p className="profile-preview-label">Profile response preview:</p>
      <pre className="profile-preview">{profileResult}</pre>
    </section>
  )
}
