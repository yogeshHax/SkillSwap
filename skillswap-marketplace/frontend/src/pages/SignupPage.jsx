import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [role, setRole] = useState(params.get('role') || 'customer')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || form.name.trim().length < 2) {
      toast.error('Full name must be at least 2 characters'); return
    }
    if (!form.email) {
      toast.error('Valid email is required'); return
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters'); return
    }
    setLoading(true)
    try {
      await signup({ ...form, role })
      toast.success('Account created! Welcome to SkillSwap 🎉')
      navigate(role === 'provider' ? '/provider-dashboard' : '/dashboard')
    } catch (err) {
      toast.error(err?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Create Account</h1>
        <p className="text-slate-400 text-sm">Join thousands of skill exchangers</p>
      </div>

      <div className="flex gap-1 glass p-1 rounded-xl mb-6">
        {['customer', 'provider'].map((r) => (
          <button key={r} onClick={() => setRole(r)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${role === r ? 'bg-brand-500 text-white shadow-brand' : 'text-slate-400 hover:text-white'
              }`}
          >
            {r === 'customer' ? '👤 Customer' : '⚡ Provider'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={form.name} onChange={update('name')} placeholder="Your full name"
              className="input-field pl-9" required minLength={2} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="email" value={form.email} onChange={update('email')}
              placeholder="you@example.com" className="input-field pl-9" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type={showPass ? 'text' : 'password'} value={form.password} onChange={update('password')}
              placeholder="At least 8 characters" className="input-field pl-9 pr-10"
              required minLength={8} />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading || form.name.length < 2 || !form.email || form.password.length < 8}
          className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? (
            <span className="flex items-center gap-2">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              Creating account...
            </span>
          ) : `Join as ${role === 'provider' ? 'Provider' : 'Customer'}`}
        </button>
      </form>

      <p className="text-xs text-slate-500 text-center mt-3">
        By signing up, you agree to our{' '}
        <Link to="#" className="text-brand-400">Terms</Link> and{' '}
        <Link to="#" className="text-brand-400">Privacy Policy</Link>
      </p>

      <div className="mt-5 pt-5 border-t border-white/5 text-center">
        <p className="text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
