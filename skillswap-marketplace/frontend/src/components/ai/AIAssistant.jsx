import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles, RefreshCw, X } from 'lucide-react'
import { aiService } from '../../services/index'
import { askGeminiWithHistory } from '../../services/geminiService'
import { MOCK_PROVIDERS } from '../../utils/helpers'

const SUGGESTED = [
  'Find me a React developer',
  'Who are the best tutors?',
  'I need a yoga instructor',
  'Compare design vs coding providers',
]

const WELCOME = "Hi! I'm your SkillSwap AI assistant. I can help you find the perfect provider, compare options, or answer any questions. What are you looking for? 🚀"

export default function AIAssistant({ floating = false, onClose }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMsg = (role, content) =>
    setMessages(prev => [...prev, { role, content }])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // ── Primary: backend /api/ai/recommend ───────────
      const result = await aiService.recommend({ requirement: text })
      const recs   = result?.recommendations || []
      let reply    = result?.summary || 'Here are my recommendations:'
      if (recs.length > 0) {
        reply += '\n\n' + recs.slice(0, 3).map((r, i) =>
          `${i + 1}. **${r.title}** by ${r.provider}\n` +
          `⭐ ${r.rating} · ${r.price} · Match: ${r.matchScore}%\n` +
          r.reasoning
        ).join('\n\n')
      }
      addMsg('assistant', reply)
    } catch {
      // ── Fallback: direct Gemini ───────────────────────
      try {
        const ctx = `Available providers: ${MOCK_PROVIDERS.map(p =>
          `${p.name} (${p.category}, skills: ${p.skills?.join(', ')}, ` +
          `rating: ${p.rating}, $${p.hourlyRate}/hr, location: ${p.location})`
        ).join('; ')}`
        const reply = await askGeminiWithHistory([...messages, userMsg], ctx)
        addMsg('assistant', reply)
      } catch {
        // ── Static fallback ───────────────────────────
        addMsg('assistant',
          "I'm having trouble connecting right now. Here are some popular providers:\n\n" +
          MOCK_PROVIDERS.slice(0, 3).map(p =>
            `• **${p.name}** — ${p.skills?.join(', ')} — $${p.hourlyRate}/hr — ⭐${p.rating}`
          ).join('\n')
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => { e?.preventDefault(); sendMessage(input) }
  const reset = () => setMessages([{ role: 'assistant', content: WELCOME }])

  const containerClass = floating
    ? 'fixed bottom-20 right-4 sm:right-6 w-full max-w-sm sm:max-w-md z-50 glass-card shadow-card overflow-hidden'
    : 'glass-card overflow-hidden'

  return (
    <div className={containerClass} style={{ height: floating ? '500px' : '600px', display: 'flex', flexDirection: 'column' }}>
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-brand-500/10 to-accent-500/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 flex items-center justify-center shadow-brand">
            <Sparkles size={17} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">AI Assistant</h3>
            <p className="text-xs text-slate-400">Powered by Gemini</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={reset} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Reset">
            <RefreshCw size={15} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' ? 'chat-bubble-user text-white' : 'glass text-slate-200 border border-white/5'
              }`}>
                {msg.content.split('\n').map((line, j) => (
                  <span key={j}>
                    {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                    {j < msg.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={14} className="text-brand-400" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="glass px-4 py-3 rounded-2xl border border-white/5">
              <div className="typing-indicator flex gap-1"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTED.map((s) => (
            <button key={s} onClick={() => sendMessage(s)}
              className="text-xs px-3 py-1.5 glass rounded-full text-slate-400 hover:text-brand-400 hover:border-brand-500/30 border border-white/5 transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/5 flex gap-2">
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about providers, skills, pricing..."
          className="input-field flex-1 py-2.5 text-sm" disabled={loading}
        />
        <motion.button type="submit" disabled={!input.trim() || loading}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="btn-primary p-2.5 rounded-xl disabled:opacity-40 flex-shrink-0"
        >
          <Send size={16} />
        </motion.button>
      </form>
    </div>
  )
}

export function FloatingAIButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}>
            <AIAssistant floating onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button onClick={() => setOpen(!open)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 right-4 sm:right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-accent-500 flex items-center justify-center shadow-brand z-40 animate-glow-pulse"
      >
        {open ? <X size={22} className="text-white" /> : <Sparkles size={22} className="text-white" />}
      </motion.button>
    </>
  )
}
