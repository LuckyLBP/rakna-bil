import { useState, useEffect } from 'react'

const GA_ID = 'G-M6QRTJT641' // Replace with your GA4 Measurement ID

function loadGA() {
  if (window.__gaLoaded) return
  window.__gaLoaded = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA_ID, { anonymize_ip: true })
}

export default function CookieConsent() {
  const [status, setStatus] = useState(null) // null | 'accepted' | 'declined'

  useEffect(() => {
    const stored = localStorage.getItem('cookie_consent')
    if (stored === 'accepted') {
      setStatus('accepted')
      loadGA()
    } else if (stored === 'declined') {
      setStatus('declined')
    }
    // null = no decision yet → show banner
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted')
    setStatus('accepted')
    loadGA()
  }

  function decline() {
    localStorage.setItem('cookie_consent', 'declined')
    setStatus('declined')
  }

  if (status !== null) return null // banner already handled

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie-inställningar">
      <div className="cookie-inner">
        <p className="cookie-text">
          Vi använder Google Analytics för att förstå hur sajten används.
          Inga personuppgifter lagras. Du kan neka utan att funktionaliteten påverkas.
        </p>
        <div className="cookie-actions">
          <button className="cookie-btn cookie-btn-decline" onClick={decline}>
            Neka
          </button>
          <button className="cookie-btn cookie-btn-accept" onClick={accept}>
            Godkänn
          </button>
        </div>
      </div>
    </div>
  )
}
