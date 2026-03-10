import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!key.trim()) {
      setError('Please enter your API key')
      return
    }
    login(key.trim())
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center ">
      <div className="flex flex-col items-center bg-white rounded-lg shadow p-8 max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">SiliconSoup Admin</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your API key to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              id="key"
              type="password"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError('') }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••••••••••"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
