import { useState, useMemo } from 'react'
import './App.css'

const FUEL_DEFAULTS = {
  El:         { forbrukning: 2.5,  pris: 2.0,  unit: 'kWh/mil', prisUnit: 'kr/kWh' },
  Bensin:     { forbrukning: 0.65, pris: 19.5, unit: 'l/mil',   prisUnit: 'kr/l' },
  Diesel:     { forbrukning: 0.55, pris: 17.5, unit: 'l/mil',   prisUnit: 'kr/l' },
  Laddhybrid: { forbrukning: 0.35, pris: 19.5, unit: 'l/mil',   prisUnit: 'kr/l' },
}

const RESIDUAL_RATES = {
  El:         [0.85, 0.72, 0.62, 0.53, 0.46, 0.40],
  Bensin:     [0.82, 0.68, 0.57, 0.48, 0.41, 0.35],
  Diesel:     [0.80, 0.66, 0.55, 0.46, 0.39, 0.33],
  Laddhybrid: [0.83, 0.70, 0.59, 0.50, 0.43, 0.37],
}

const DEFAULT_FORDONSSKATT = { El: 360, Bensin: 1460, Diesel: 4140, Laddhybrid: 1460 }
const DEFAULT_FORSAKRING   = { El: 7200, Bensin: 6000, Diesel: 6500, Laddhybrid: 6500 }

function formatNum(n) {
  if (n === undefined || n === null || isNaN(n)) return '0'
  return Math.round(n).toLocaleString('sv-SE')
}

function getResidualRate(drivmedel, years) {
  const rates = RESIDUAL_RATES[drivmedel]
  if (years <= rates.length) return rates[years - 1]
  const lastRate = rates[rates.length - 1]
  const extra = years - rates.length
  return Math.max(0.10, lastRate * Math.pow(0.88, extra))
}

function NumInput({ value, onChange, unit, min = 0, step }) {
  return (
    <div className="num-input-wrap">
      <input
        type="number"
        className="num-input"
        value={value}
        min={min}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
      {unit && <span className="num-input-unit">{unit}</span>}
    </div>
  )
}

export default function App() {
  const [userType, setUserType]             = useState('privatperson')
  const [drivmedel, setDrivmedel]           = useState('Diesel')
  const [agandetid, setAgandetid]           = useState(3)
  const [customYears, setCustomYears]       = useState(false)
  const [customYearsVal, setCustomYearsVal] = useState(7)
  const [korsträcka, setKorsträcka]         = useState(1500)
  const [forbrukning, setForbrukning]       = useState(FUEL_DEFAULTS['Diesel'].forbrukning)
  const [branslepris, setBranslepris]       = useState(FUEL_DEFAULTS['Diesel'].pris)
  const [inkopspris, setInkopspris]         = useState(300000)
  const [autoRestvärde, setAutoRestvärde]   = useState(true)
  const [manuellRestvärde, setManuellRestvärde] = useState(0)
  const [lanebelopp, setLanebelopp]         = useState(0)
  const [ranta, setRanta]                   = useState(6.5)
  const [forsakring, setForsakring]         = useState(DEFAULT_FORSAKRING['Diesel'])
  const [fordonsskatt, setFordonsskatt]     = useState(DEFAULT_FORDONSSKATT['Diesel'])
  const [service, setService]               = useState(3000)
  const [dack, setDack]                     = useState(2500)
  const [visaPerManad, setVisaPerManad]     = useState(false)

  const [momsAvdrag, setMomsAvdrag]                   = useState(50)
  const [skattemässigtAvdrag, setSkattemässigtAvdrag] = useState(100)
  const [formansvarde, setFormansvarde]               = useState(0)
  const [arbetsgivarAvgift]                           = useState(31.42)
  const [marginalskatt, setMarginalskatt]             = useState(52)

  const effectiveYears = customYears ? customYearsVal : agandetid

  function handleDrivmedel(d) {
    setDrivmedel(d)
    setForbrukning(FUEL_DEFAULTS[d].forbrukning)
    setBranslepris(FUEL_DEFAULTS[d].pris)
    setFordonsskatt(DEFAULT_FORDONSSKATT[d])
    setForsakring(DEFAULT_FORSAKRING[d])
  }

  const beräknatRestvärde = useMemo(() => {
    const rate = getResidualRate(drivmedel, effectiveYears)
    return Math.round(inkopspris * rate)
  }, [inkopspris, drivmedel, effectiveYears])

  const restvärde = autoRestvärde ? beräknatRestvärde : manuellRestvärde
  const maxLan    = Math.round(inkopspris * 0.8)

  const results = useMemo(() => {
    const år           = effectiveYears
    const milPerÅr     = korsträcka
    const värdeminskning  = inkopspris - restvärde
    const räntekostnad    = lanebelopp > 0 && ranta > 0 ? lanebelopp * (ranta / 100) * år : 0
    const drivmedelKostnad = forbrukning * branslepris * milPerÅr * år
    const försäkringTot   = forsakring * år
    const fordonsskattTot = fordonsskatt * år
    const serviceTot      = service * år
    const däckTot         = dack * år
    const totalPrivat = värdeminskning + räntekostnad + drivmedelKostnad + försäkringTot + fordonsskattTot + serviceTot + däckTot

    let momsAvdragBelopp = 0, skatteAvdragBelopp = 0
    let arbetsgivarKostnad = 0, anställdSkatteKostnad = 0

    if (userType === 'foretag') {
      momsAvdragBelopp = drivmedelKostnad * (0.25 / 1.25) * (momsAvdrag / 100)
      const avdragsGrundlag = (drivmedelKostnad + försäkringTot + fordonsskattTot + serviceTot + däckTot + räntekostnad) * (skattemässigtAvdrag / 100)
      skatteAvdragBelopp = avdragsGrundlag * 0.206
      arbetsgivarKostnad = formansvarde * (arbetsgivarAvgift / 100) * år
      anställdSkatteKostnad = formansvarde * (marginalskatt / 100) * år
    }

    const nettoFöretagskostnad = totalPrivat + arbetsgivarKostnad - momsAvdragBelopp - skatteAvdragBelopp

    return {
      värdeminskning, räntekostnad, drivmedelKostnad,
      försäkringTot, fordonsskattTot, serviceTot, däckTot,
      totalPrivat, momsAvdragBelopp, skatteAvdragBelopp,
      arbetsgivarKostnad, anställdSkatteKostnad, nettoFöretagskostnad,
    }
  }, [
    effectiveYears, korsträcka, inkopspris, restvärde, lanebelopp, ranta,
    forbrukning, branslepris, forsakring, fordonsskatt, service, dack,
    userType, momsAvdrag, skattemässigtAvdrag, formansvarde, marginalskatt, arbetsgivarAvgift,
  ])

  const divisor  = visaPerManad ? effectiveYears * 12 : 1
  const fuelInfo = FUEL_DEFAULTS[drivmedel]

  const costItems = [
    { label: 'Värdeminskning',    value: results.värdeminskning },
    { label: 'Drivmedel',         value: results.drivmedelKostnad },
    { label: 'Försäkring',        value: results.försäkringTot },
    { label: 'Fordonsskatt',      value: results.fordonsskattTot },
    { label: 'Service/underhåll', value: results.serviceTot },
    { label: 'Däck och tillbehör',value: results.däckTot },
    { label: 'Räntekostnad',      value: results.räntekostnad },
  ]
  const maxCost = Math.max(...costItems.map(c => c.value), 1)

  return (
    <div className="app">

      <header className="site-header">
        <div className="header-inner">
          <h1 className="site-title">
            <span className="logo-text">Räknabil</span><span className="logo-tld">.se</span>
          </h1>
          <span className="header-divider" />
          <p className="header-tagline">Räkna ut den verkliga kostnaden att äga bil i Sverige</p>
        </div>
      </header>

      <main className="main">

        {/* User type */}
        <div className="section-card section-card-flush">
          <div className="pill-switch">
            <button
              className={`pill-btn ${userType === 'privatperson' ? 'pill-active' : ''}`}
              onClick={() => setUserType('privatperson')}
            >Privatperson</button>
            <button
              className={`pill-btn ${userType === 'foretag' ? 'pill-active' : ''}`}
              onClick={() => setUserType('foretag')}
            >Företag</button>
          </div>
        </div>

        <div className="form-grid">

          {/* Drivmedel */}
          <div className="section-card">
            <h2 className="card-title">Drivmedel</h2>
            <div className="fuel-grid">
              {['El', 'Bensin', 'Diesel', 'Laddhybrid'].map(d => (
                <button
                  key={d}
                  className={`chip ${drivmedel === d ? 'chip-active' : ''}`}
                  onClick={() => handleDrivmedel(d)}
                >{d}</button>
              ))}
            </div>
          </div>

          {/* Ägandetid */}
          <div className="section-card">
            <h2 className="card-title">Ägandetid</h2>
            <div className="year-grid">
              {[1,2,3,4,5,6].map(y => (
                <button
                  key={y}
                  className={`chip ${!customYears && agandetid === y ? 'chip-active' : ''}`}
                  onClick={() => { setCustomYears(false); setAgandetid(y) }}
                >{y} år</button>
              ))}
              <button
                className={`chip ${customYears ? 'chip-active' : ''}`}
                onClick={() => setCustomYears(true)}
              >Annat</button>
            </div>
            {customYears && (
              <div className="custom-years">
                <label className="field-label">Antal år</label>
                <NumInput value={customYearsVal} onChange={v => setCustomYearsVal(Math.max(1, Math.round(v)))} unit="år" min={1} step={1} />
              </div>
            )}
          </div>

          {/* Körsträcka */}
          <div className="section-card">
            <h2 className="card-title">
              Årlig körsträcka
              <span className="card-title-value">{formatNum(korsträcka)} mil</span>
            </h2>
            <input
              type="range"
              className="slider"
              min={500} max={5000} step={250}
              value={korsträcka}
              onChange={e => setKorsträcka(Number(e.target.value))}
            />
            <div className="slider-labels">
              <span>500 mil</span><span>5 000 mil</span>
            </div>
            <p className="hint">1 mil = 10 km · {formatNum(korsträcka * 10)} km per år</p>
          </div>

          {/* Driftkostnader */}
          <div className="section-card">
            <h2 className="card-title">Driftkostnader</h2>
            <p className="section-hint">Förifyllda med uppskattningar – justera om du har exakta värden.</p>
            <div className="input-row">
              <Field label={drivmedel === 'El' ? 'Elförbrukning' : 'Bränsleförbrukning'}>
                <NumInput value={forbrukning} onChange={setForbrukning} unit={fuelInfo.unit} step={0.05} />
              </Field>
              <Field label={drivmedel === 'El' ? 'Elpris' : 'Bränslepris'}>
                <NumInput value={branslepris} onChange={setBranslepris} unit={fuelInfo.prisUnit} step={0.1} />
              </Field>
            </div>
          </div>

          {/* Inköpspris & restvärde */}
          <div className="section-card">
            <h2 className="card-title">Inköpspris och restvärde</h2>
            <p className="section-hint">Restvärdet beräknas automatiskt utifrån drivmedel och ägandetid.</p>
            <div className="toggle-pills" style={{marginBottom: '16px'}}>
              <button className={`toggle-pill ${autoRestvärde ? 'toggle-pill-active' : ''}`} onClick={() => setAutoRestvärde(true)}>Automatiskt</button>
              <button className={`toggle-pill ${!autoRestvärde ? 'toggle-pill-active' : ''}`} onClick={() => setAutoRestvärde(false)}>Ange själv</button>
            </div>
            <div className="input-row">
              <Field label="Inköpspris">
                <NumInput value={inkopspris} onChange={setInkopspris} unit="kr" step={1000} />
              </Field>
              <Field label={autoRestvärde ? 'Beräknat restvärde' : 'Restvärde'}>
                {autoRestvärde
                  ? <div className="num-input-wrap read-only">
                      <span className="num-input-display">{formatNum(beräknatRestvärde)}</span>
                      <span className="num-input-unit">kr</span>
                    </div>
                  : <NumInput value={manuellRestvärde} onChange={setManuellRestvärde} unit="kr" step={1000} />
                }
              </Field>
            </div>
            {autoRestvärde && (
              <div className="depreciation-bar">
                <div className="dep-bar-track">
                  <div className="dep-bar-fill" style={{width: `${(restvärde / inkopspris) * 100}%`}} />
                </div>
                <div className="dep-bar-labels">
                  <span className="dep-label">Restvärde {Math.round((restvärde / inkopspris) * 100)}%</span>
                  <span className="dep-label dep-label-loss">Värdeminskning {Math.round(((inkopspris - restvärde) / inkopspris) * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Billån */}
          <div className="section-card">
            <h2 className="card-title">Billån</h2>
            <div className="input-row">
              <Field label="Lånebelopp">
                <NumInput value={lanebelopp} onChange={v => setLanebelopp(Math.min(v, maxLan))} unit="kr" step={1000} />
              </Field>
              <Field label="Årsränta">
                <NumInput value={ranta} onChange={setRanta} unit="%" step={0.1} />
              </Field>
            </div>
            <p className="hint">Max 80% av inköpspriset = <strong>{formatNum(maxLan)} kr</strong></p>
          </div>

          {/* Övriga kostnader */}
          <div className="section-card">
            <h2 className="card-title">Övriga kostnader</h2>
            <div className="input-row">
              <Field label="Försäkring">
                <NumInput value={forsakring} onChange={setForsakring} unit="kr/år" step={100} />
              </Field>
              <Field label="Fordonsskatt">
                <NumInput value={fordonsskatt} onChange={setFordonsskatt} unit="kr/år" step={100} />
              </Field>
            </div>
            <div className="input-row" style={{marginTop: '10px'}}>
              <Field label="Service och underhåll">
                <NumInput value={service} onChange={setService} unit="kr/år" step={100} />
              </Field>
              <Field label="Däck och tillbehör">
                <NumInput value={dack} onChange={setDack} unit="kr/år" step={100} />
              </Field>
            </div>
          </div>

          {/* Företagsinställningar */}
          {userType === 'foretag' && (
            <div className="section-card">
              <h2 className="card-title">Företagsinställningar</h2>
              <div className="input-row">
                <Field label="Momsavdrag drivmedel">
                  <NumInput value={momsAvdrag} onChange={setMomsAvdrag} unit="%" step={5} />
                </Field>
                <Field label="Skattemässigt avdrag">
                  <NumInput value={skattemässigtAvdrag} onChange={setSkattemässigtAvdrag} unit="%" step={5} />
                </Field>
              </div>
              <div className="input-row" style={{marginTop: '10px'}}>
                <Field label="Förmånsvärde per år">
                  <NumInput value={formansvarde} onChange={setFormansvarde} unit="kr/år" step={500} />
                </Field>
                <Field label="Anst. marginalskatt">
                  <NumInput value={marginalskatt} onChange={setMarginalskatt} unit="%" step={1} />
                </Field>
              </div>
              <p className="hint">Arbetsgivaravgift är fast 31,42%. Skattemässigt avdrag beräknas mot bolagsskatt (20,6%).</p>
            </div>
          )}

        </div>

        {/* ── RESULTS ── */}
        <div className="results-panel">
          <div className="results-header">
            <div>
              <p className="results-label">Din totalkostnad över {effectiveYears} år</p>
              <div className="results-total">
                {formatNum(results.totalPrivat / divisor)}
                <span className="results-unit">{visaPerManad ? 'kr/mån' : 'kr'}</span>
              </div>
              <p className="results-sub">
                {userType === 'privatperson' ? 'Totalkostnad ink. värdeminskning' : 'Bruttokostnad (privatperson)'}
              </p>
            </div>
            <div className="period-switch">
              <button className={`period-btn ${!visaPerManad ? 'period-active' : ''}`} onClick={() => setVisaPerManad(false)}>Totalt</button>
              <button className={`period-btn ${visaPerManad ? 'period-active' : ''}`} onClick={() => setVisaPerManad(true)}>Per månad</button>
            </div>
          </div>

          <div className="cost-bars">
            {costItems.filter(c => c.value > 0).sort((a,b) => b.value - a.value).map(item => (
              <div key={item.label} className="bar-row">
                <div className="bar-label">
                  <span>{item.label}</span>
                  <span className="bar-amount">{formatNum(item.value / divisor)} kr</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{width: `${(item.value / maxCost) * 100}%`}} />
                </div>
              </div>
            ))}
          </div>

          {userType === 'foretag' && (
            <div className="foretag-breakdown">
              <div className="foretag-row foretag-row-debit">
                <span>Arbetsgivaravgift (förmån)</span>
                <span>+{formatNum(results.arbetsgivarKostnad / divisor)} kr</span>
              </div>
              <div className="foretag-row foretag-row-credit">
                <span>Momsavdrag drivmedel</span>
                <span>−{formatNum(results.momsAvdragBelopp / divisor)} kr</span>
              </div>
              <div className="foretag-row foretag-row-credit">
                <span>Skatteavdrag (20,6%)</span>
                <span>−{formatNum(results.skatteAvdragBelopp / divisor)} kr</span>
              </div>
              <div className="foretag-divider" />
              <div className="foretag-net">
                <span>Nettokostnad för företaget</span>
                <span>{formatNum(results.nettoFöretagskostnad / divisor)} {visaPerManad ? 'kr/mån' : 'kr'}</span>
              </div>
              {results.anställdSkatteKostnad > 0 && (
                <div className="foretag-row foretag-row-employee">
                  <span>Anst. skattekostnad (förmån)</span>
                  <span>{formatNum(results.anställdSkatteKostnad / divisor)} kr</span>
                </div>
              )}
            </div>
          )}

          <p className="disclaimer">Beräkningarna är uppskattningar. Kontrollera alltid med din försäkringsgivare och Skatteverket.</p>
        </div>

      </main>

      <footer className="seo-footer">
        <div className="seo-inner">
          <h2>Om bilkostnadskalkylatorn</h2>
          <p>RäknaBil hjälper dig räkna ut vad det faktiskt kostar att äga en bil i Sverige – oavsett om det är en elbil, bensinbil, dieselbil eller laddhybrid. Kalkylatorn tar hänsyn till alla verkliga kostnader: värdeminskning, drivmedel, försäkring, fordonsskatt, service och räntekostnader på billån.</p>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>Vad ingår i totalkostnaden?</h3>
              <p>Totalkostnaden inkluderar värdeminskning (den största kostnaden för de flesta), drivmedelskostnader, försäkring, fordonsskatt, service och underhåll, däck och tillbehör samt räntekostnader om du finansierar bilen med lån.</p>
            </div>
            <div className="faq-item">
              <h3>Hur räknar jag ut förmånsbil?</h3>
              <p>För tjänstebilar beräknar kalkylatorn arbetsgivarens nettokostnad efter momsavdrag och skattemässiga avdrag. Du kan även se den anställdes skattekostnad baserat på förmånsvärde och marginalskatt.</p>
            </div>
            <div className="faq-item">
              <h3>Vad är restvärde?</h3>
              <p>Restvärdet är vad bilen beräknas vara värd när du säljer den. Kalkylatorn beräknar detta automatiskt utifrån drivmedelstyp och ägandetid, men du kan alltid ange ett eget värde.</p>
            </div>
          </div>
        </div>
      </footer>

      <div className="made-by">
        Skapad för skojs skull av <a href="https://produktionen.se" target="_blank" rel="noopener noreferrer">Produktionen AB</a>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}
