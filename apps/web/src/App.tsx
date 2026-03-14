import { useEffect, useMemo, useState } from 'react'
import { createToolModule, listModuleKeys } from '@modular/core'
import { fetchHealth } from './api/client'
import { LoginPortal } from './components/LoginPortal'
import './App.css'

function App() {
  const [healthMessage, setHealthMessage] = useState('Checking API health...')
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem('authToken'),
  )

  useEffect(() => {
    let cancelled = false

    fetchHealth()
      .then((health) => {
        if (!cancelled) {
          setHealthMessage(`API status: ${health.status}`)
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown API error'
        if (!cancelled) {
          setHealthMessage(`API status: unavailable (${message})`)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const modules = [
    createToolModule({
      key: 'forms',
      label: 'Form Toolkit',
      description: 'Composable validators and state wiring primitives.',
    }),
    createToolModule({
      key: 'tables',
      label: 'Table Toolkit',
      description: 'Sorting, filtering, and pagination building blocks.',
    }),
    createToolModule({
      key: 'auth',
      label: 'Auth Bridge',
      description: 'Typed session and permission helpers for app modules.',
    }),
  ]

  const moduleKeys = listModuleKeys(modules).join(', ')
  const tokenState = useMemo(
    () => (authToken ? 'JWT present in localStorage' : 'No auth token yet'),
    [authToken],
  )

  return (
    <main className="shell">
      <header className="hero panel" aria-label="Site introduction">
        <p className="status-blink">here's your frontend:</p>
        <h1>gem skeletons on rails</h1>
        <p className="lede">
          dev utility for creating modular login portals.
        </p>
        <div className="badge-row" aria-label="Theme badges">
          <span className="badge">security first</span>
          <span className="badge">api + ui monorepo</span>
          <span className="badge">easy production and deployment</span>
        </div>
      </header>

      <section className="panel grid-panel" aria-label="Starter modules">
        <h2>starter modules</h2>
        <ul className="module-list">
          {modules.map((module) => (
            <li key={module.key}>
              <strong>{module.label}</strong>
              <span>{module.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel grid-panel">
        <h2>endpoints + diagnostics</h2>
        <p>
          Web app: <code>http://localhost:5173</code>
        </p>
        <p>
          API health endpoint: <code>http://localhost:3000/health</code>
        </p>
        <p>
          Health check result: <code>{healthMessage}</code>
        </p>
        <p>
          Module keys: <code>{moduleKeys}</code>
        </p>
        <p>
          Auth state: <code>{tokenState}</code>
        </p>
      </section>

      <LoginPortal onAuthTokenChange={setAuthToken} />
      devise: Copyright (c) 2020-CURRENT Rafael França, Carlos Antonio da Silva cancancan: Copyright (c) 2011 Ryan Bates rack-attack: 
Copyright (c) 2016 Kickstarter, PBC bcrypt: Copyright (c) 2010 Nicholas Campbell
    </main>
  )
}

export default App
