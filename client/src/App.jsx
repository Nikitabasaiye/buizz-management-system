import { useEffect, useMemo, useState } from 'react'
import {
  FaBell,
  FaBolt,
  FaCalendarAlt,
  FaChartBar,
  FaCheck,
  FaEnvelope,
  FaLock,
  FaMusic,
  FaRegCalendarAlt,
  FaSearch,
  FaShieldAlt,
  FaSmile,
  FaTicketAlt,
  FaUsers,
} from 'react-icons/fa'
import {
  HiArrowRight,
  HiCog,
  HiLockClosed,
  HiSparkles,
  HiX,
} from 'react-icons/hi';

import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:5000')
const launchDate = new Date(Date.now() + 44 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000)

function getCountdown(target) {
  const now = Date.now()
  const distance = Math.max(target.getTime() - now, 0)

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  }
}

function Logo() {
  return (
    <div className="brand" aria-label="Buizz">
      <div className="brand-mark">
        <span>B</span>
      </div>
      <span className="brand-text">Buizz</span>
    </div>
  )
}

function EventThumb({ variant }) {
  return (
    <div className={`event-thumb event-thumb--${variant}`}>
      <span />
    </div>
  )
}

function DashboardMockup() {
  const events = [
    ['Music Night Live', 'May 25, 2025 - Mumbai', '1,248 tickets', 'pink'],
    ['Tech Conference 2025', 'Jun 10, 2025 - Bengaluru', '842 tickets', 'violet'],
    ['Summer Fest', 'Jul 05, 2025 - Delhi', '642 tickets', 'orange'],
  ]

  return (
    <div className="dashboard-mockup" aria-hidden="true">
      <aside className="dash-sidebar">
        <Logo />
        {[
          [FaChartBar, 'Overview', true],
          [FaCalendarAlt, 'Events'],
          [FaRegCalendarAlt, 'Bookings'],
          [FaUsers, 'Attendees'],
          [FaChartBar, 'Analytics'],
          [HiCog, 'Settings'],
        ].map(([Icon, label, active]) => (
          <div className={`dash-nav-item ${active ? 'is-active' : ''}`} key={label}>
            <Icon />
            <span>{label}</span>
          </div>
        ))}
      </aside>

      <section className="dash-panel">
        <div className="dash-window-actions">
          <HiX />
          <HiLockClosed />
        </div>
        <h3>Welcome back, Organizer <span>wave</span></h3>
        <div className="dash-metrics">
          <div>
            <small>Total Events</small>
            <strong>24</strong>
          </div>
          <div>
            <small>Total Bookings</small>
            <strong>1,248</strong>
          </div>
          <div>
            <small>Total Revenue</small>
            <strong>₹2.45L</strong>
          </div>
          <div>
            <small>This Month</small>
            <strong>+32%</strong>
          </div>
        </div>
        <h4>Upcoming Events</h4>
        <div className="dash-events">
          {events.map(([title, meta, tickets, variant]) => (
            <div className="dash-event" key={title}>
              <EventThumb variant={variant} />
              <div>
                <strong>{title}</strong>
                <small>{meta}</small>
              </div>
              <span>{tickets}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function PhoneMockup() {
  return (
    <div className="phone-mockup" aria-hidden="true">
      <div className="phone-screen">
        <div className="phone-status">
          <span>9:41</span>
          <span>LTE</span>
        </div>
        <div className="phone-top">
          <strong>Buizz</strong>
          <HiCog />
        </div>
        <p>Discover</p>
        <h3>Amazing Events</h3>
        <div className="phone-search">
          <FaSearch />
          <span>Search events</span>
        </div>
        <div className="phone-cats">
          {[
            [FaMusic, 'Music'],
            [FaTicketAlt, 'Tech'],
            [FaShieldAlt, 'Sports'],
            [FaSmile, 'Comedy'],
          ].map(([Icon, label]) => (
            <div key={label}>
              <Icon />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <h4>Popular Events</h4>
        <div className="featured-event">
          <div>
            <strong>Sunset Music Fest</strong>
            <span>May 25, 2025 - Mumbai</span>
          </div>
          <button type="button">Book Now</button>
        </div>
        <div className="mini-event">
          <EventThumb variant="violet" />
          <div>
            <strong>Tech Conference 2025</strong>
            <span>Jun 10, 2025</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [countdown, setCountdown] = useState(getCountdown(launchDate))
  const [email, setEmail] = useState('example@gmail.com')
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCountdown(getCountdown(launchDate)), 1000)
    return () => clearInterval(timer)
  }, [])

  const counterItems = useMemo(
    () => [
      { label: 'Days', value: countdown.days },
      { label: 'Hours', value: countdown.hours },
      { label: 'Minutes', value: countdown.minutes },
      { label: 'Seconds', value: countdown.seconds },
    ],
    [countdown],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim()) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setStatus('')
    setMessage('')

    try {
      const response = await fetch(`${API_BASE}/api/v1/launch/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Unable to submit your email. Please try again.')
      }

      setStatus('success')
      setMessage(result.message || "Thanks! You'll be the first to know.")
      setEmail('')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Unable to submit your email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="launch-page">
      <section className="launch-card">
        <div className="scene-lines scene-lines--left" aria-hidden="true" />
        <div className="scene-lines scene-lines--right" aria-hidden="true" />
        <div className="star-field" aria-hidden="true" />
        <div className="purple-beam" aria-hidden="true" />

        <header className="launch-header">
          <div className="header-left">
            <Logo />
            <div className="header-chip">Events • Tickets • Experiences</div>
          </div>
          {/* <div className="tagline-chip">
            <HiSparkles />
            <span>Made for organizers, built for everyone.</span>
          </div> */}
        </header>

        <section className="hero-grid">
          <div className="hero-copy">
            <span className="status-pill">Launching Soon 🚀</span>
            <h1>
              <span>Buizz is</span>
              <span>Launching</span> Soon!
              <span className="rocket" aria-hidden="true">🚀</span>
            </h1>
            <p>
              India's smarter platform for event booking, ticketing and management
              <span> all in one place.</span>
            </p>

            <div className="countdown-row" aria-live="polite">
              {counterItems.map(({ label, value }, index) => (
                <div className="countdown-card" key={label}>
                  <strong className={`time-${index}`}>{String(value).padStart(2, '0')}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="waitlist-email" className="sr-only">
                Your email for launch updates
              </label>
              <div className="email-control">
                <span>
                  <FaEnvelope />
                </span>
                <input
                  id="waitlist-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                  placeholder="your@email.com"
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Joining...' : 'Join Waitlist'}
                <HiArrowRight />
              </button>
              <div className="waitlist-hint">
                <FaCheck />
                <span>You'll be the first to know!</span>
              </div>
            </form>

            {message && <p className={`notify-message notify-message--${status}`}>{message}</p>}

            <div className="benefit-grid">
              {[
                [FaBolt, 'Early Access', 'Be the first to explore premium features.'],
                [FaBell, 'Real-time Updates', 'Get launch updates and insider progress.'],
                [FaLock, 'Secure & Trusted', 'Built for organizers with safe and smooth flow.'],
              ].map(([Icon, title, text]) => (
                <article className="benefit-card" key={title}>
                  <div>
                    <Icon />
                  </div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="hero-preview">
            <DashboardMockup />
            <PhoneMockup />
            <div className="waitlist-pop">
              <div className="avatar-stack">
                {['#f4c29a', '#df9072', '#f5ba67', '#2246a9'].map((color, index) => (
                  <span style={{ backgroundColor: color }} key={color}>
                    {index + 1}
                  </span>
                ))}
                <strong>500+</strong>
              </div>
              <p>People already<br />joined the waitlist 🎉</p>
            </div>
          </div>
        </section>

        {/* <footer>Built with <span>♥</span> for every event creator.</footer> */}
      </section>
    </main>
  )
}

export default App
