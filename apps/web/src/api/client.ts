const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type HealthResponse = {
  status: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`)
  }

  return (await response.json()) as HealthResponse
}

export async function login(email: string, password: string): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ user: { email, password } }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Login failed. Check credentials.'))
  }

  // devise JWT usually sets the token in the Authorization response header.
  return response.headers.get('Authorization')
}

export async function signup(
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      user: { email, password, password_confirmation: passwordConfirmation },
    }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Sign up failed. Check input or existing account.'))
  }

  return response.headers.get('Authorization')
}

export async function fetchProfile(token: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    headers: {
      Accept: 'application/json',
      Authorization: token,
    },
  })

  if (!response.ok) {
    throw new Error(`Profile request failed (${response.status})`)
  }

  return response.json()
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string
      error?: string
      errors?: string[]
    }

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      return payload.errors.join(', ')
    }

    if (typeof payload.message === 'string' && payload.message.length > 0) {
      return payload.message
    }

    if (typeof payload.error === 'string' && payload.error.length > 0) {
      return payload.error
    }
  } catch (_error) {
    // Ignore non-JSON error bodies and fall back to a generic message.
  }

  return fallback
}
