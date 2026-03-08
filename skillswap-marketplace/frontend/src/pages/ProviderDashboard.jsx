import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Calendar, Star, DollarSign, MessageSquare, Plus, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react'
import { useProviderBookings, useUpdateBookingStatus, useProviderReviews } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/common/Avatar'
import { RatingDisplay } from '../components/common/StarRating'
import { formatDate, formatCurrency } from '../utils/helpers'
import toast from 'react-hot-toast'
import { db } from '../config/firebase'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'

export default function ProviderDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: bookingsData, refetch } = useProviderBookings()
  const { mutateAsync: updateStatus } = useUpdateBookingStatus()

  const allBookings = Array.isArray(bookingsData) && bookingsData.length ? bookingsData : []

  // Normalise booking fields
  const normalise = (b) => ({
    ...b,
    customerName: b.customerName || b.customerId?.name || 'Customer',
    service: b.service || b.serviceId?.title || 'Session',
    date: b.date || b.timeSlot?.date,
    time: b.time || b.timeSlot?.startTime,
    amount: b.amount || b.serviceId?.pricing?.amount || 0,
  })

  const bookings = allBookings.map(normalise)
  const pending = bookings.filter(b => b.status === 'pending')
  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const completed = bookings.filter(b => b.status === 'completed')
  const totalEarned = completed.reduce((s, b) => s + (b.amount || 0), 0)

  const providerId = user?._id || user?.id
  const { data: reviewsData } = useProviderReviews(providerId)
  const reviews = Array.isArray(reviewsData) ? reviewsData : (reviewsData?.reviews ?? [])

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  const handleAccept = async (b) => {
    try {
      await updateStatus({ id: b._id, status: 'confirmed' })
      toast.success('Booking accepted!')
      await setDoc(doc(collection(db, 'bookingUpdates'), b._id), {
        status: 'confirmed',
        customerId: String(b.customerId?._id || b.customerId),
        timestamp: serverTimestamp()
      })
      refetch()
    } catch { toast.error('Failed to accept booking') }
  }

  const handleDecline = async (b) => {
    try {
      await updateStatus({ id: b._id, status: 'cancelled' })
      toast.error('Booking declined')
      await setDoc(doc(collection(db, 'bookingUpdates'), b._id), {
        status: 'cancelled',
        customerId: String(b.customerId?._id || b.customerId),
        timestamp: serverTimestamp()
      })
      refetch()
    } catch { toast.error('Failed to decline booking') }
  }

  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', count: pending.length, icon: Calendar },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
  ]

  return (
    <div className="page-container py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Provider <span className="text-gradient">Dashboard</span></h1>
            <p className="text-slate-400">Manage your services, bookings, and earnings</p>
          </div>
          <Link to="/messages" className="btn-primary text-sm hidden sm:flex">
            <MessageSquare size={15} />Messages
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pending Requests', value: pending.length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Active Bookings', value: confirmed.length, icon: Calendar, color: 'text-brand-400', bg: 'bg-brand-500/10' },
            { label: 'Sessions Done', value: completed.length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Total Earned', value: formatCurrency(totalEarned), icon: DollarSign, color: 'text-neon', bg: 'bg-teal-500/10' },
          ].map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon size={18} className={s.color} />
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 glass-card p-1 mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${activeTab === tab.id ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-slate-400 hover:text-white'
                }`}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.count > 0 && <span className="badge badge-warning text-xs px-2 py-0">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-white">Recent Activity</h3>
              {[...pending, ...confirmed].slice(0, 4).length === 0 ? (
                <div className="text-center py-10 glass-card rounded-2xl">
                  <Calendar size={32} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No active bookings yet</p>
                </div>
              ) : [...pending, ...confirmed].slice(0, 4).map((b, i) => (
                <motion.div key={b._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass-card p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={b.customerName} size="md" />
                    <div>
                      <p className="font-medium text-white text-sm">{b.customerName}</p>
                      <p className="text-xs text-slate-400">{b.service} · {b.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${b.status === 'pending' ? 'badge-warning' : b.status === 'confirmed' ? 'badge-brand' : 'badge-success'}`}>
                      {b.status}
                    </span>
                    {b.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleAccept(b)} className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all">
                          <CheckCircle2 size={14} />
                        </button>
                        <button onClick={() => handleDecline(b)} className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-all">
                          <XCircle size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="glass-card p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-brand-400" />Profile Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Avg. Rating</span><span className="font-medium text-amber-400">{avgRating}/5</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Total Reviews</span><span className="font-medium text-white">{reviews.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Sessions Done</span><span className="font-medium text-white">{completed.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Total Earned</span><span className="font-medium text-neon">{formatCurrency(totalEarned)}</span></div>
                </div>
              </div>
              <Link to="/explore" className="btn-primary w-full justify-center py-3 text-sm">
                <Plus size={15} />Add New Service
              </Link>
            </div>
          </div>
        )}

        {/* Bookings */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {pending.length > 0 && (
              <>
                <h3 className="font-semibold text-amber-400 flex items-center gap-2"><Clock size={16} />Pending Requests ({pending.length})</h3>
                {pending.map((b, i) => (
                  <motion.div key={b._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="glass-card p-5 border border-amber-500/20"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={b.customerName} size="md" />
                        <div>
                          <p className="font-semibold text-white">{b.customerName}</p>
                          <p className="text-sm text-slate-400">{b.service}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {b.date && <span>{formatDate(b.date)}</span>}
                            {b.time && <span>{b.time}</span>}
                            <span>{formatCurrency(b.amount)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-auto sm:ml-0">
                        <button onClick={() => handleDecline(b)} className="btn-ghost text-sm text-rose-400 py-2 px-4 border border-rose-500/20">
                          Decline
                        </button>
                        <button onClick={() => handleAccept(b)} className="btn-primary text-sm py-2 px-4">
                          Accept
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
            {[...confirmed, ...completed].map((b, i) => (
              <motion.div key={b._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={b.customerName} size="sm" />
                  <div>
                    <p className="font-medium text-white text-sm">{b.customerName}</p>
                    <p className="text-xs text-slate-400">{b.service} {b.date ? `· ${formatDate(b.date)}` : ''} {b.time || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-sm">{formatCurrency(b.amount)}</span>
                  <span className={`badge text-xs ${b.status === 'confirmed' ? 'badge-brand' : 'badge-success'}`}>{b.status}</span>
                </div>
              </motion.div>
            ))}
            {bookings.length === 0 && (
              <div className="text-center py-16">
                <Calendar size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No bookings yet</p>
              </div>
            )}
          </div>
        )}

        {/* Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="glass-card p-5 flex items-center gap-6">
              <div className="text-center">
                <p className="text-5xl font-black text-amber-400">{avgRating}</p>
                <RatingDisplay rating={parseFloat(avgRating)} showCount={false} />
                <p className="text-xs text-slate-500 mt-1">Overall Rating</p>
              </div>
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = reviews.filter(r => Math.round(r.rating) === n).length
                  const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-3">{n}</span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {reviews.map((r, i) => (
              <motion.div key={r._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-400">
                      {(r.author || r.customerId?.name || '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{r.author || r.customerId?.name || 'Anonymous'}</p>
                      <p className="text-xs text-slate-500">{formatDate(r.date || r.createdAt)}</p>
                    </div>
                  </div>
                  <RatingDisplay rating={r.rating} showCount={false} size={13} />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{r.comment}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Earnings */}
        {activeTab === 'earnings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><DollarSign size={16} className="text-neon" />Earnings Overview</h3>
              <div className="space-y-3">
                {[
                  { period: 'This Month', amount: totalEarned },
                  { period: 'Last Month', amount: totalEarned * 0.9 },
                  { period: 'This Year', amount: totalEarned * 8 },
                ].map((e) => (
                  <div key={e.period} className="flex items-center justify-between p-3 glass rounded-xl">
                    <span className="text-slate-400 text-sm">{e.period}</span>
                    <span className="font-bold text-white">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-6 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-3">
                <DollarSign size={28} className="text-neon" />
              </div>
              <p className="text-3xl font-black text-neon mb-1">{formatCurrency(totalEarned)}</p>
              <p className="text-slate-400 text-sm mb-4">Available Balance</p>
              <button className="btn-primary w-full justify-center text-sm">Request Payout</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
