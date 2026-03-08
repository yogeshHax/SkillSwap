import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import { useProviders } from '../hooks/useApi'
import { useDebounce } from '../hooks/useUtils'
import SearchBar from '../components/common/SearchBar'
import ProviderCard from '../components/common/ProviderCard'
import { SkeletonList } from '../components/common/FullPageLoader'
import { CATEGORIES, normalizeProvider } from '../utils/helpers'

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'reviews', label: 'Most Reviewed' },
]

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [sort, setSort] = useState('rating')
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState([0, 500])
  const [available, setAvailable] = useState(false)
  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    const q = searchParams.get('q') || ''
    const c = searchParams.get('category') || ''
    if (q !== query) setQuery(q)
    if (c !== category) setCategory(c)
  }, [searchParams])

  const params = {
    q: debouncedQuery,
    category,
    sort,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
  }

  const { data, isLoading } = useProviders(params)

  // Use real API data, no mock fallbacks
  const rawProviders = data?.providers?.length
    ? data.providers
    : []

  const providers = rawProviders.map(normalizeProvider)

  const updateFilters = (newCat, newQ) => {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev)
      if (newCat !== undefined) {
        if (newCat) n.set('category', newCat); else n.delete('category')
      }
      if (newQ !== undefined) {
        if (newQ) n.set('q', newQ); else n.delete('q')
      }
      return n
    })
  }

  const handleSearch = ({ query: q }) => updateFilters(undefined, q)
  const handleCategory = (newCat) => updateFilters(newCat === category ? '' : newCat, undefined)

  return (
    <div className="page-container py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {category
              ? `${CATEGORIES.find(c => c.id === category)?.icon || ''} ${CATEGORIES.find(c => c.id === category)?.label || ''} Providers`
              : 'Explore Providers'}
          </h1>
          <p className="text-slate-400">
            {!query?.trim() && !category ? 'Find the perfect expert for your needs.' : `${providers.length} providers found`}
          </p>
        </div>

        {/* Search + Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} defaultValue={query} placeholder="Search skills, names..." />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary text-sm flex-shrink-0 ${showFilters ? 'border-brand-500/40 text-brand-400' : ''}`}
          >
            <SlidersHorizontal size={15} />
            Filters
            {(category || priceRange[1] < 500) && <span className="w-2 h-2 bg-brand-400 rounded-full" />}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field pr-8 text-sm cursor-pointer flex-shrink-0 w-full sm:w-auto"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="glass-card p-5 mb-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-semibold mb-3 text-slate-300">Category</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategory('')}
                    className={`badge text-xs cursor-pointer transition-all ${!category ? 'badge-brand' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                  >All</button>
                  {CATEGORIES.map(c => (
                    <button key={c.id}
                      onClick={() => handleCategory(c.id)}
                      className={`badge text-xs cursor-pointer transition-all ${category === c.id ? 'badge-brand' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3 text-slate-300">Hourly Rate: $0 — ${priceRange[1]}</h4>
                <input type="range" min={0} max={500} step={10} value={priceRange[1]}
                  onChange={(e) => setPriceRange([0, Number(e.target.value)])}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>$0</span><span>$500+</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3 text-slate-300">Availability</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="rounded accent-brand-500" />
                  <span className="text-sm text-slate-400">Available Now</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => { updateFilters('', ''); setPriceRange([0, 500]); setAvailable(false); setShowFilters(false) }}
                className="btn-ghost text-sm text-rose-400 hover:text-rose-300">
                <X size={14} /> Clear Filters
              </button>
            </div>
          </motion.div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <button onClick={() => handleCategory('')}
            className={`badge flex-shrink-0 px-4 py-1.5 text-sm cursor-pointer transition-all ${!category ? 'badge-brand' : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'}`}
          >All</button>
          {CATEGORIES.map(c => (
            <button key={c.id}
              onClick={() => handleCategory(c.id)}
              className={`badge flex-shrink-0 px-4 py-1.5 text-sm cursor-pointer transition-all ${category === c.id ? 'badge-brand' : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'}`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {!query?.trim() && !category ? (
          <div className="text-center py-20 glass-card rounded-2xl mx-auto flex flex-col items-center max-w-2xl border-brand-500/20">
            <div className="w-20 h-20 bg-brand-500/10 text-brand-400 rounded-full flex items-center justify-center text-4xl mb-6 shadow-neon">
              🔎
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Ready to find a Provider?</h3>
            <p className="text-slate-400 max-w-md">
              Please enter a search term in the box above or select a category to begin discovering top-rated professionals.
            </p>
          </div>
        ) : isLoading ? (
          <SkeletonList count={9} />
        ) : providers.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No providers found</h3>
            <p className="text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {providers.map((p, i) => <ProviderCard key={p._id} provider={p} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
