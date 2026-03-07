import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Phone, Video, Search, MoreHorizontal, ArrowLeft, Circle, Plus, X } from 'lucide-react'
import { useMessages, useSendMessage, useUserChats, buildChatId, useProviders } from '../hooks/useApi'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/common/Avatar'
import { formatRelativeTime, MOCK_PROVIDERS } from '../utils/helpers'

export default function MessagingPage() {
  const { chatId: chatIdParam } = useParams()
  const [searchParams] = useSearchParams()
  const withParam = searchParams.get('with')
  const { user } = useAuth()
  const myId = user?._id || user?.id

  const {
    joinChat, leaveChat, onMessage, emitTyping, onTyping,
    connected, onlineUsers,
  } = useSocket() || {}

  const [selectedChatId, setSelectedChatId]     = useState(null)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [localMessages, setLocalMessages]       = useState([])
  const [newMessage, setNewMessage]             = useState('')
  const [isTyping, setIsTyping]                 = useState(false)
  const [typingTimeout, setTypingTimeout]       = useState(null)
  const [showNewChat, setShowNewChat]           = useState(false)
  const [providerSearch, setProviderSearch]     = useState('')
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  // ── Resolve initial chatId from URL ──────────────────
  useEffect(() => {
    if (!myId) return
    if (chatIdParam) {
      setSelectedChatId(chatIdParam)
    } else if (withParam) {
      setSelectedChatId(buildChatId(myId, withParam))
    }
  }, [chatIdParam, withParam, myId])

  // ── Fetch data ────────────────────────────────────────
  const { data: chatList = [] }       = useUserChats()
  const { data: fetchedMessages = [] } = useMessages(selectedChatId)
  const { data: providersData }        = useProviders()

  const allProviders = providersData?.providers?.length
    ? providersData.providers
    : MOCK_PROVIDERS

  const filteredProviders = allProviders.filter(p =>
    p.name?.toLowerCase().includes(providerSearch.toLowerCase())
  )

  // ── Sync fetched messages into local state ────────────
  useEffect(() => {
    if (fetchedMessages?.length) setLocalMessages(fetchedMessages)
    else if (!selectedChatId) setLocalMessages([])
  }, [fetchedMessages, selectedChatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  // ── Socket: join/leave room ───────────────────────────
  useEffect(() => {
    if (!selectedChatId) return
    joinChat?.(selectedChatId)
    return () => leaveChat?.(selectedChatId)
  }, [selectedChatId, joinChat, leaveChat])

  // ── Socket: receive messages ──────────────────────────
  useEffect(() => {
    if (!onMessage) return
    return onMessage(({ message }) => {
      setLocalMessages(prev =>
        prev.some(m => m._id === message._id) ? prev : [...prev, message]
      )
    })
  }, [onMessage])

  // ── Socket: typing indicator ──────────────────────────
  useEffect(() => {
    if (!onTyping) return
    return onTyping(({ chatId: cId }) => {
      if (cId === selectedChatId) {
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 2000)
      }
    })
  }, [onTyping, selectedChatId])

  const { mutateAsync: sendMsgApi } = useSendMessage()

  // ── Derive receiver from chatId ───────────────────────
  const getReceiverId = useCallback((chatId) => {
    if (!chatId || !myId) return null
    return chatId.split('_').find(id => id !== String(myId)) || null
  }, [myId])

  // ── Send ──────────────────────────────────────────────
  const handleSend = useCallback(async (e) => {
    e?.preventDefault()
    if (!newMessage.trim() || !selectedChatId || !myId) return
    const text = newMessage.trim()
    setNewMessage('')
    const receiverId = getReceiverId(selectedChatId)
    if (!receiverId) return

    const optimistic = {
      _id: `opt_${Date.now()}`,
      content: text,
      senderId: myId,
      createdAt: new Date().toISOString(),
      optimistic: true,
    }
    setLocalMessages(prev => [...prev, optimistic])

    try {
      await sendMsgApi({ receiverId, content: text, _localSenderId: myId })
    } catch {
      setLocalMessages(prev => prev.filter(m => m._id !== optimistic._id))
    }
  }, [newMessage, selectedChatId, myId, getReceiverId, sendMsgApi])

  // ── Typing emit ───────────────────────────────────────
  const handleTyping = (e) => {
    setNewMessage(e.target.value)
    if (!selectedChatId) return
    const receiverId = getReceiverId(selectedChatId)
    if (!receiverId) return
    if (typingTimeout) clearTimeout(typingTimeout)
    emitTyping?.(selectedChatId, receiverId, true)
    setTypingTimeout(setTimeout(() => emitTyping?.(selectedChatId, receiverId, false), 1500))
  }

  // ── Start a new chat ──────────────────────────────────
  const startChat = (provider) => {
    if (!myId) return
    const theirId = provider._id || provider.id
    const chatId  = buildChatId(myId, theirId)
    setSelectedChatId(chatId)
    setSelectedProvider(provider)
    setLocalMessages([])
    setShowNewChat(false)
    setProviderSearch('')
  }

  // ── Derive chat header info ───────────────────────────
  const currentChat = chatList.find(c => c._id === selectedChatId)
  const chatPartnerName =
    currentChat?.lastMessage?.senderId?.name ||
    selectedProvider?.name || 'Conversation'
  const receiverId = getReceiverId(selectedChatId)
  const isOnline = onlineUsers?.includes(receiverId)

  return (
    <div className="page-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-0 sm:px-4 sm:py-4 gap-0 sm:gap-4 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── Sidebar ── */}
        <div className={`${selectedChatId && 'hidden sm:flex'} sm:flex flex-col w-full sm:w-80 glass-card sm:rounded-2xl overflow-hidden flex-shrink-0`}>
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-white">Messages</h2>
              <button
                onClick={() => setShowNewChat(true)}
                className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 hover:bg-brand-500/30 transition-all"
                title="New conversation"
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input-field pl-8 py-2 text-sm" placeholder="Search conversations..." />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chatList.length === 0 && (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="text-3xl">💬</div>
                <p className="text-slate-400 text-sm font-medium">No conversations yet</p>
                <p className="text-slate-500 text-xs">Start a chat with any provider</p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="text-xs px-4 py-2 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-xl hover:bg-brand-500/30 transition-all"
                >
                  + New Conversation
                </button>
              </div>
            )}
            {chatList.map((chat) => {
              const partner = chat.lastMessage?.senderId
              const name    = partner?.name || 'User'
              const preview = chat.lastMessage?.content || ''
              const online  = onlineUsers?.includes(partner?._id)
              return (
                <button key={chat._id}
                  onClick={() => setSelectedChatId(chat._id)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-all text-left ${selectedChatId === chat._id ? 'bg-brand-500/10 border-l-2 border-brand-500' : ''}`}
                >
                  <Avatar name={name} size="md" online={online} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{preview}</p>
                  </div>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 bg-brand-500 rounded-full text-xs text-white flex items-center justify-center flex-shrink-0">{chat.unread}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Chat Area ── */}
        {selectedChatId ? (
          <div className="flex-1 flex flex-col glass-card sm:rounded-2xl overflow-hidden min-w-0">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <button onClick={() => setSelectedChatId(null)} className="sm:hidden p-2 text-slate-400 hover:text-white">
                <ArrowLeft size={18} />
              </button>
              <Avatar name={chatPartnerName} size="sm" online={isOnline} />
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{chatPartnerName}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  {isOnline
                    ? <><Circle size={8} className="fill-emerald-400 text-emerald-400" />Online</>
                    : 'Offline'}
                  {!connected && <span className="text-amber-400 ml-1">(connecting...)</span>}
                </p>
              </div>
              <div className="flex gap-1">
                <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"><Phone size={16} /></button>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"><Video size={16} /></button>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"><MoreHorizontal size={16} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {localMessages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-4xl mb-2">👋</div>
                    <p className="text-slate-500 text-sm">Say hello to start the conversation!</p>
                  </div>
                </div>
              )}
              {localMessages.map((msg) => {
                const senderId = msg.senderId?._id || msg.senderId
                const isMe = String(senderId) === String(myId)
                return (
                  <motion.div key={msg._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`px-4 py-2.5 max-w-xs sm:max-w-sm lg:max-w-md ${isMe ? 'chat-bubble-user' : 'chat-bubble-other'} ${msg.optimistic ? 'opacity-70' : ''}`}>
                      <p className="text-sm text-white leading-relaxed">{msg.content || msg.text}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-sky-200' : 'text-slate-500'}`}>
                        {formatRelativeTime(msg.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="chat-bubble-other px-4 py-3">
                    <div className="typing-indicator flex gap-1"><span /><span /><span /></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-white/5 flex items-center gap-2">
              <input
                ref={inputRef}
                value={newMessage}
                onChange={handleTyping}
                placeholder="Type a message..."
                className="input-field flex-1 py-3"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
              />
              <motion.button type="submit" disabled={!newMessage.trim()}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="btn-primary p-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send size={17} />
              </motion.button>
            </form>
          </div>
        ) : (
          <div className="hidden sm:flex flex-1 glass-card rounded-2xl items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-slate-400 mb-3">Select a conversation to start chatting</p>
              <button onClick={() => setShowNewChat(true)} className="btn-primary text-sm">
                <Plus size={15} /> New Conversation
              </button>
            </div>
          </div>
        )}

        {/* ── New Conversation Modal ── */}
        <AnimatePresence>
          {showNewChat && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowNewChat(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card w-full max-w-md p-5 rounded-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">New Conversation</h3>
                  <button onClick={() => setShowNewChat(false)} className="text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="relative mb-4">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    autoFocus
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    placeholder="Search providers..."
                    className="input-field pl-8 py-2 text-sm w-full"
                  />
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {filteredProviders.length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-6">No providers found</p>
                  )}
                  {filteredProviders.map((p) => (
                    <button key={p._id || p.id}
                      onClick={() => startChat(p)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left"
                    >
                      <Avatar name={p.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{p.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
