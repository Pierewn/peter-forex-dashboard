'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError('Wrong password. Try again.')
        setPassword('')
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1a1d27', border: '1px solid #2a2d3a',
        borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 380,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#e2e8f0', marginBottom: 4 }}>
            Peter's Bot Dashboard
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Volatility 75 · Trade Intelligence
          </div>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              placeholder="Enter password"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#141620', border: '1px solid #2a2d3a',
                borderRadius: 8, color: '#e2e8f0', fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '8px 12px', fontSize: 13,
              color: '#ef4444', marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '11px',
              background: loading || !password ? '#2a2d3a' : '#6366f1',
              border: 'none', borderRadius: 8,
              color: loading || !password ? '#64748b' : '#fff',
              fontSize: 14, fontWeight: 700, cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Checking...' : 'Enter Dashboard'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: 12, color: '#2a2d3a' }}>
          Private · Peter Waweru
        </div>
      </div>
    </div>
  )
}
