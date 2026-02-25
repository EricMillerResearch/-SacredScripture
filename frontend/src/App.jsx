import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const moods = ['Peace', 'Hope', 'Reflection', 'Worship', 'Reverence']
const onboardingSteps = [
  { title: 'Create your account', detail: 'Sign up with an email and start your free trial.' },
  { title: 'Choose a verse', detail: 'Paste a passage and select a worship mood.' },
  { title: 'Generate in minutes', detail: 'Render a loopable video + audio for services.' },
  { title: 'Download + use', detail: 'Drop it into ProPresenter, OBS, or MediaShout.' },
]
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
  const adminLimit = 10

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setDashboard)
      .catch(() => setToken(''))
  }, [token])

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
          <label>Verse Reference</label>
          <input value={form.verse_reference} onChange={(e) => setForm({ ...form, verse_reference: e.target.value })} />
          <label>Verse Text</label>
          <textarea rows={5} value={form.verse_text} onChange={(e) => setForm({ ...form, verse_text: e.target.value })} />
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
