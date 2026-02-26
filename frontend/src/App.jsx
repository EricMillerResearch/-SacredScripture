import { useEffect, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const moods = ['Peace', 'Hope', 'Reflection', 'Worship', 'Reverence']
const sampleVerses = [
  {
    label: 'Psalm 23:1',
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd; I shall not want.',
  },
  {
    label: 'Psalm 19:7–9',
    reference: 'Psalm 19:7–9',
    text:
      'The law of the Lord is perfect, refreshing the soul. The statutes of the Lord are trustworthy, making wise the simple. ' +
      'The precepts of the Lord are right, giving joy to the heart. The commands of the Lord are radiant, giving light to the eyes. ' +
      'The fear of the Lord is pure, enduring forever. The decrees of the Lord are firm, and all of them are righteous.',
  },
  {
    label: 'Isaiah 40:31',
    reference: 'Isaiah 40:31',
    text: 'Those who hope in the Lord will renew their strength. They will soar on wings like eagles.',
  },
]
const onboardingSteps = [
  { title: 'Create your account', detail: 'Sign up with an email and start your free trial.' },
  { title: 'Choose a verse', detail: 'Paste a passage and select a worship mood.' },
  { title: 'Generate in minutes', detail: 'Render a loopable video + audio for services.' },
  { title: 'Download + use', detail: 'Drop it into ProPresenter, OBS, or MediaShout.' },
]
const demoAssets = {
  video: '/demo/demo.mp4',
  audio: '/demo/demo.wav',
}
const nextSteps = [
  'Download the MP4 and audio for this week.',
  'Schedule the visuals in your worship software.',
  'Invite a team member to collaborate.',
]
const outreachFields = {
  name: '',
  email: '',
  church: '',
  role: 'Worship Pastor',
  consent: false,
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    verse_reference: 'Psalm 23:1',
    verse_text: 'The Lord is my shepherd; I shall not want.',
    mood: 'Peace',
    duration_minutes: 3,
  })
  const [previewUrl, setPreviewUrl] = useState('')
  const [lead, setLead] = useState(outreachFields)
  const [leadStatus, setLeadStatus] = useState('')
  const [adminLeads, setAdminLeads] = useState([])
  const [adminError, setAdminError] = useState('')
  const [adminQuery, setAdminQuery] = useState('')
  const [adminPage, setAdminPage] = useState(0)
  const [adminTotal, setAdminTotal] = useState(0)
  const [adminLoading, setAdminLoading] = useState(false)
  const [hebrewBooks, setHebrewBooks] = useState([])
  const [hebrewChapters, setHebrewChapters] = useState([])
  const [hebrewVerses, setHebrewVerses] = useState([])
  const [hebrewSelection, setHebrewSelection] = useState({ book: '', chapter: '', verse: '' })
  const [hebrewMode, setHebrewMode] = useState(false)
  const [hebrewDisplayText, setHebrewDisplayText] = useState('')
  const [readerRunning, setReaderRunning] = useState(false)
  const [readerSpeed, setReaderSpeed] = useState(20)
  const [readerIndex, setReaderIndex] = useState(0)
  const [readerWords, setReaderWords] = useState([])
  const canvasRef = useRef(null)
  const audioRef = useRef(null)
  const adminLimit = 10

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setDashboard)
      .catch(() => setToken(''))
  }, [token])

  useEffect(() => {
    fetch(`${API_BASE}/bible/hebrew/books`)
      .then((r) => r.json())
      .then((data) => setHebrewBooks(data.books || []))
      .catch(() => setHebrewBooks([]))
  }, [])

  useEffect(() => {
    if (dashboard?.is_admin) {
      loadLeads(0, adminQuery)
    }
  }, [dashboard?.is_admin])

  async function handleAuth(e) {
    e.preventDefault()
    const endpoint = isRegister ? 'register' : 'login'
    const response = await fetch(`${API_BASE}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (!response.ok) return alert(data.detail || 'Authentication failed')
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
  }

  async function handleGenerate() {
    setLoading(true)
    const response = await fetch(`${API_BASE}/dashboard/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) return alert(data.detail || 'Generation failed')
    setPreviewUrl(`${API_BASE}${data.video_url}`)
    const refreshed = await fetch(`${API_BASE}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
    setDashboard(await refreshed.json())
  }

  async function openCheckout(plan) {
    const response = await fetch(`${API_BASE}/billing/checkout/${plan}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    if (data.checkout_url) window.open(data.checkout_url, '_blank')
  }

  async function submitLead() {
    setLeadStatus('')
    const response = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setLeadStatus(data.detail || 'Unable to submit. Please try again.')
      return
    }
    setLeadStatus('Thanks! We will reach out shortly.')
    setLead(outreachFields)
  }

  async function loadLeads(page = adminPage, query = adminQuery) {
    setAdminError('')
    setAdminLoading(true)
    const params = new URLSearchParams({
      limit: adminLimit.toString(),
      offset: String(page * adminLimit),
    })
    if (query) params.set('q', query)
    const response = await fetch(`${API_BASE}/admin/leads?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    setAdminLoading(false)
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setAdminError(data.detail || 'Unable to load leads.')
      return
    }
    const data = await response.json()
    setAdminLeads(data.leads || [])
    setAdminTotal(data.total || 0)
  }

  async function markContacted(email) {
    const response = await fetch(`${API_BASE}/admin/leads/contacted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setAdminError(data.detail || 'Unable to update lead.')
      return
    }
    await loadLeads()
  }

  async function loadHebrewChapters(book) {
    setHebrewChapters([])
    setHebrewVerses([])
    setHebrewSelection({ book, chapter: '', verse: '' })
    if (!book) return
    const res = await fetch(`${API_BASE}/bible/hebrew/${book}/chapters`)
    const data = await res.json()
    setHebrewChapters(data.chapters || [])
  }

  async function loadHebrewVerses(book, chapter) {
    setHebrewVerses([])
    setHebrewSelection({ book, chapter, verse: '' })
    if (!book || !chapter) return
    const res = await fetch(`${API_BASE}/bible/hebrew/${book}/${chapter}`)
    const data = await res.json()
    setHebrewVerses(data.verses || [])
  }

  function wordToFrequency(word) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '')
    if (!clean) return 440
    let base = 0
    for (let i = 0; i < clean.length; i += 1) {
      base += clean.charCodeAt(i) - 96
    }
    let growth = 0
    for (let i = 0; i < clean.length; i += 1) {
      growth += (i + 1) * (clean.charCodeAt(i) - 96)
    }
    const val = (base + (growth % 64)) % 256
    return 220 + (val / 255) * 660
  }

  function playFrequency(freq, duration = 0.4) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    if (!audioRef.current) audioRef.current = new AudioContext()
    const ctx = audioRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.value = 0.001
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    osc.start(now)
    osc.stop(now + duration)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frameId
    const render = (time) => {
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)
      const t = time * 0.0004
      const freq = readerWords[readerIndex]?.freq || 3.0
      const cx = width / 2
      const cy = height / 2
      const img = ctx.createImageData(width, height)
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const dx = (x - cx) / width
          const dy = (y - cy) / height
          const r = Math.sqrt(dx * dx + dy * dy)
          const wave = Math.sin(2 * Math.PI * (r * freq * 2 + t))
          const wave2 = Math.sin(2 * Math.PI * (dx * freq + t * 0.7))
          const v = (wave + 0.6 * wave2 + 1.6) / 3.2
          const col = {
            r: Math.floor(240 + 25 * v),
            g: Math.floor(190 + 40 * v),
            b: Math.floor(150 + 50 * v),
          }
          const idx = (y * width + x) * 4
          img.data[idx] = col.r
          img.data[idx + 1] = col.g
          img.data[idx + 2] = col.b
          img.data[idx + 3] = 255
        }
      }
      ctx.putImageData(img, 0, 0)
      frameId = requestAnimationFrame(render)
    }
    frameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frameId)
  }, [readerIndex, readerWords])

  useEffect(() => {
    if (!readerRunning || readerWords.length === 0) return
    const interval = Math.max(200, 60000 / readerSpeed)
    const id = setInterval(() => {
      setReaderIndex((prev) => {
        const next = (prev + 1) % readerWords.length
        playFrequency(readerWords[next].freq, 0.35)
        return next
      })
    }, interval)
    return () => clearInterval(id)
  }, [readerRunning, readerSpeed, readerWords])

  function emailLead(lead) {
    const subject = encodeURIComponent('SacredScripture demo')
    const body = encodeURIComponent(
      `Hi${lead.name ? ` ${lead.name}` : ''},\n\nThanks for requesting a demo. Reply to this email with a couple of times that work for you, and we will schedule a quick walkthrough.\n\nBlessings,\nSacredScripture Team`
    )
    window.location.href = `mailto:${lead.email}?subject=${subject}&body=${body}`
    markContacted(lead.email)
  }

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="card auth-card">
          <h1>SacredScripture</h1>
          <p>Verse-Based Ambient Worship Media</p>
          <form onSubmit={handleAuth}>
            <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            <button type="submit">{isRegister ? 'Create account + 7-day trial' : 'Sign in'}</button>
          </form>
          <button className="link" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Already have an account? Sign in' : 'Need an account? Start free trial'}
          </button>
        </div>
        <div className="card auth-onboarding">
          <h2>How It Works</h2>
          <div className="step-list">
            {onboardingSteps.map((step) => (
              <div key={step.title} className="step-item">
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </div>
            ))}
          </div>
          <div className="trial-note">Start free, no setup required.</div>
        </div>
        <div className="card auth-demo">
          <h2>Instant Demo</h2>
          <p>Watch a real output and download it instantly.</p>
          <video className="demo-video" src={demoAssets.video} autoPlay loop muted playsInline controls />
          <div className="demo-actions">
            <a className="download" href={demoAssets.video} download>Download MP4</a>
            <a className="download" href={demoAssets.audio} download>Download WAV</a>
          </div>
          <div className="demo-note">No login required. Works on any device.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header>
        <div>
          <h1>SacredScripture</h1>
          <p>Verse-Based Ambient Worship Media</p>
        </div>
        <button onClick={() => { localStorage.removeItem('token'); setToken('') }}>Logout</button>
      </header>

      <main className="dashboard-layout">
        <section className="left-panel card">
          <label>Sample Verses</label>
          <select
            onChange={(e) => {
              const idx = Number(e.target.value)
              if (Number.isNaN(idx)) return
              const sample = sampleVerses[idx]
              setForm({ ...form, verse_reference: sample.reference, verse_text: sample.text })
            }}
            defaultValue=""
          >
            <option value="" disabled>Pick a sample verse</option>
            {sampleVerses.map((s, idx) => (
              <option key={s.label} value={idx}>{s.label}</option>
            ))}
          </select>
          <label>Verse Reference</label>
          <input value={form.verse_reference} onChange={(e) => setForm({ ...form, verse_reference: e.target.value })} />
          <label>Verse Text</label>
          <textarea
            rows={5}
            value={hebrewMode ? hebrewDisplayText : form.verse_text}
            onChange={(e) => setForm({ ...form, verse_text: e.target.value })}
            disabled={hebrewMode}
          />

          <div className="hebrew-picker">
            <h4>Hebrew Bible Picker</h4>
            <div className="hebrew-row">
              <select value={hebrewSelection.book} onChange={(e) => loadHebrewChapters(e.target.value)}>
                <option value="">Select book</option>
                {hebrewBooks.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
              <select value={hebrewSelection.chapter} onChange={(e) => loadHebrewVerses(hebrewSelection.book, e.target.value)}>
                <option value="">Chapter</option>
                {hebrewChapters.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={hebrewSelection.verse}
                onChange={(e) => {
                  const verseNum = e.target.value
                  const verse = hebrewVerses.find((v) => String(v.verse) === String(verseNum))
                  if (!verse) return
                  setHebrewSelection({ ...hebrewSelection, verse: verseNum })
                  setHebrewMode(true)
                  setHebrewDisplayText(verse.translit || '')
                  setForm({
                    ...form,
                    verse_reference: `${hebrewSelection.book} ${hebrewSelection.chapter}:${verseNum}`,
                    verse_text: verse.text,
                  })
                }}
              >
                <option value="">Verse</option>
                {hebrewVerses.map((v) => (
                  <option key={v.verse} value={v.verse}>{v.verse}</option>
                ))}
              </select>
            </div>
            {hebrewSelection.verse && (
              <div className="hebrew-preview">
                <div className="hebrew-translit">{hebrewDisplayText}</div>
              </div>
            )}
            {hebrewMode && (
              <button
                type="button"
                className="mini"
                onClick={() => {
                  setHebrewMode(false)
                  setHebrewDisplayText('')
                }}
              >
                Edit manually
              </button>
            )}
          </div>
          <label>Mood</label>
          <select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}>
            {moods.map((m) => <option key={m}>{m}</option>)}
          </select>
          <label>Duration</label>
          <select value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}>
            {[3, 5, 10].map((d) => <option value={d} key={d}>{d} minutes</option>)}
          </select>
          <button onClick={handleGenerate} disabled={loading}>{loading ? 'Rendering worship media...' : 'Generate'}</button>

          {dashboard && (
            <div className="plan-box">
              <strong>{dashboard.plan.toUpperCase()}</strong>
              <p>{dashboard.generation_count} / {dashboard.generation_limit} this month</p>
              <div className="plan-buttons">
                <button onClick={() => openCheckout('starter')}>Starter ($19)</button>
                <button onClick={() => openCheckout('pro')}>Pro ($39)</button>
              </div>
            </div>
          )}
        </section>

        <section className="right-panel card">
          <div className="resonance-reader">
            <div className="reader-header">
              <h3>Resonance Reader</h3>
              <div className="reader-controls">
                <button
                  type="button"
                  className="mini"
                  onClick={() => {
                    const text = hebrewMode ? hebrewDisplayText : form.verse_text
                    const words = text.split(/\\s+/).filter(Boolean)
                    const mapped = words.map((w) => ({ word: w, freq: wordToFrequency(w) }))
                    setReaderWords(mapped)
                    setReaderIndex(0)
                    if (mapped.length > 0) playFrequency(mapped[0].freq, 0.35)
                    setReaderRunning(true)
                  }}
                >
                  Start
                </button>
                <button type="button" className="mini" onClick={() => setReaderRunning(false)}>Pause</button>
              </div>
            </div>
            <div className="reader-speed">
              <span>Speed</span>
              <input
                type="range"
                min="10"
                max="80"
                value={readerSpeed}
                onChange={(e) => setReaderSpeed(Number(e.target.value))}
              />
              <span>{readerSpeed} wpm</span>
            </div>
            <canvas ref={canvasRef} width="600" height="340" className="reader-canvas" />
            <div className="reader-ticker">
              <div
                className="ticker-text"
                style={{ animationDuration: `${Math.max(12, 120 - readerSpeed)}s` }}
              >
                {(hebrewMode ? hebrewDisplayText : form.verse_text) || 'Select a verse to begin the resonance reader.'}
              </div>
            </div>
          </div>
          <h3>Live Preview</h3>
          {previewUrl ? <video key={previewUrl} src={previewUrl} controls /> : <div className="empty-preview">Generate to preview video</div>}
          {previewUrl && <a className="download" href={previewUrl} download>Download MP4</a>}

          <div className="next-steps">
            <h4>Next Steps</h4>
            <ol>
              {nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="lead-box">
            <h4>Request a Demo</h4>
            <p>Share your details to receive a demo link and sample pack.</p>
            <div className="lead-grid">
              <input
                placeholder="Name"
                value={lead.name}
                onChange={(e) => setLead({ ...lead, name: e.target.value })}
              />
              <input
                placeholder="Email"
                type="email"
                value={lead.email}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
              />
            </div>
            <input
              placeholder="Church name"
              value={lead.church}
              onChange={(e) => setLead({ ...lead, church: e.target.value })}
            />
            <select
              value={lead.role}
              onChange={(e) => setLead({ ...lead, role: e.target.value })}
            >
              {['Worship Pastor', 'Media Lead', 'Creative Director', 'Other'].map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
            <label className="consent-row">
              <input
                type="checkbox"
                checked={lead.consent}
                onChange={(e) => setLead({ ...lead, consent: e.target.checked })}
              />
              <span>I agree to receive updates and a demo link.</span>
            </label>
            <button
              type="button"
              onClick={submitLead}
              disabled={!lead.email || !lead.consent || !lead.church || !lead.role}
            >
              Request Demo
            </button>
            {leadStatus && <div className="lead-status">{leadStatus}</div>}
          </div>

          {dashboard?.is_admin && (
            <div className="lead-box">
              <h4>Admin Leads</h4>
              <p>View recent demo requests or download CSV.</p>
              <div className="lead-actions">
                <input
                  className="lead-search"
                  placeholder="Search by email or church"
                  value={adminQuery}
                  onChange={(e) => setAdminQuery(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => { setAdminPage(0); loadLeads(0, adminQuery) }}
                  disabled={adminLoading}
                >
                  {adminLoading ? 'Loading...' : 'Search'}
                </button>
                <a className="download" href={`${API_BASE}/admin/leads.csv`} target="_blank" rel="noreferrer">Download CSV</a>
              </div>
              {adminError && <div className="lead-status">{adminError}</div>}
              {adminLeads.length === 0 && !adminLoading && (
                <div className="lead-empty">No leads yet.</div>
              )}
              {adminLeads.length > 0 && (
                <div className="lead-table">
                  <div className="lead-row lead-head">
                    <span>Date</span>
                    <span>Church</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>
                  {adminLeads.map((lead, idx) => (
                    <div className="lead-row" key={`${lead.email}-${idx}`}>
                      <span>{lead.received_at ? new Date(lead.received_at).toLocaleDateString() : '-'}</span>
                      <span>{lead.church || '-'}</span>
                      <span>{lead.email || '-'}</span>
                      <span>{lead.role || '-'}</span>
                      <span>
                        {lead.contacted_at ? 'Contacted' : (
                          <button className="mini" type="button" onClick={() => markContacted(lead.email)}>Mark</button>
                        )}
                      </span>
                      <span>
                        <button className="mini" type="button" onClick={() => emailLead(lead)}>Email</button>
                      </span>
                    </div>
                  ))}
                  <div className="lead-pagination">
                    <button
                      className="mini"
                      type="button"
                      onClick={() => { const p = Math.max(0, adminPage - 1); setAdminPage(p); loadLeads(p, adminQuery) }}
                      disabled={adminPage === 0 || adminLoading}
                    >
                      Prev
                    </button>
                    <span>Page {adminPage + 1} of {Math.max(1, Math.ceil(adminTotal / adminLimit))}</span>
                    <button
                      className="mini"
                      type="button"
                      onClick={() => { const p = adminPage + 1; setAdminPage(p); loadLeads(p, adminQuery) }}
                      disabled={(adminPage + 1) * adminLimit >= adminTotal || adminLoading}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <h4>Previous Projects</h4>
          <ul>
            {(dashboard?.generations || []).map((g) => (
              <li key={g.id}>
                <a href={`${API_BASE}${g.video_path}`} target="_blank">{g.verse_reference} • {g.mood}</a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
