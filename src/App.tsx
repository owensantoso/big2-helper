import { useEffect, useMemo, useState } from 'react'
import { comboDetails, comboRanking, rankOrder, suitOrder } from './data/bigTwoRules'
import { calculateSettlements, validatePlayers, validateSettings } from './lib/calculator'
import type { CalculationResult, CalculatorSettings, Player, TabId } from './types'

const STORAGE_KEYS = {
  players: 'big2-helper:players',
  settings: 'big2-helper:settings',
  activeTab: 'big2-helper:active-tab',
}

const defaultPlayers: Player[] = [
  { id: 'p1', name: 'Alice', cardsLeft: 0 },
  { id: 'p2', name: 'Bob', cardsLeft: 2 },
  { id: 'p3', name: 'Carol', cardsLeft: 5 },
  { id: 'p4', name: 'Dave', cardsLeft: 10 },
]

const defaultSettings: CalculatorSettings = {
  valuePerCard: 1,
  unitLabel: 'points',
  penaltyThreshold: 10,
  penaltyMultiplier: 2,
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function formatAmount(amount: number, unitLabel: string): string {
  const prefix = amount > 0 ? '+' : ''
  return `${prefix}${amount}${unitLabel ? ` ${unitLabel}` : ''}`
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('cheat-sheet')
  const [players, setPlayers] = useState<Player[]>(defaultPlayers)
  const [settings, setSettings] = useState<CalculatorSettings>(defaultSettings)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const [showMiniRules, setShowMiniRules] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [copyFeedback, setCopyFeedback] = useState('')

  useEffect(() => {
    setPlayers(readStorage<Player[]>(STORAGE_KEYS.players, defaultPlayers))
    setSettings(readStorage<CalculatorSettings>(STORAGE_KEYS.settings, defaultSettings))
    setActiveTab(readStorage<TabId>(STORAGE_KEYS.activeTab, 'cheat-sheet'))
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(players))
  }, [players])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.activeTab, JSON.stringify(activeTab))
  }, [activeTab])

  useEffect(() => {
    if (!copyFeedback) {
      return
    }

    const timeout = window.setTimeout(() => setCopyFeedback(''), 1800)
    return () => window.clearTimeout(timeout)
  }, [copyFeedback])

  const playerNameMap = useMemo(
    () => new Map(players.map((player) => [player.id, player.name])),
    [players],
  )

  const handlePlayerCountChange = (nextCount: number) => {
    setPlayers((current) => {
      if (nextCount === current.length) {
        return current
      }

      if (nextCount < current.length) {
        return current.slice(0, nextCount)
      }

      const nextPlayers = [...current]
      for (let index = current.length; index < nextCount; index += 1) {
        nextPlayers.push({
          id: `p${index + 1}`,
          name: `Player ${index + 1}`,
          cardsLeft: '',
        })
      }
      return nextPlayers
    })
  }

  const updatePlayer = (id: string, field: 'name' | 'cardsLeft', value: string) => {
    setPlayers((current) =>
      current.map((player) => {
        if (player.id !== id) {
          return player
        }

        if (field === 'name') {
          return { ...player, name: value }
        }

        return {
          ...player,
          cardsLeft: value === '' ? '' : Number(value),
        }
      }),
    )
  }

  const updateSetting = (
    field: keyof CalculatorSettings,
    value: string,
    numeric: boolean = true,
  ) => {
    setSettings((current) => ({
      ...current,
      [field]: numeric ? Number(value) : value,
    }))
  }

  const handleCalculate = () => {
    const validationErrors = [...validatePlayers(players), ...validateSettings(settings)]
    setErrors(validationErrors)

    if (validationErrors.length > 0) {
      setResult(null)
      return
    }

    setResult(calculateSettlements(players, settings))
  }

  const handleReset = () => {
    setPlayers(defaultPlayers)
    setSettings(defaultSettings)
    setErrors([])
    setResult(null)
  }

  const handleCopyResults = async () => {
    if (!result) {
      return
    }

    const lines = [
      'Big Two settlement',
      '',
      'Pairwise:',
      ...result.pairwisePayments.map((payment) => {
        const from = playerNameMap.get(payment.fromPlayerId) ?? payment.fromPlayerId
        const to = playerNameMap.get(payment.toPlayerId) ?? payment.toPlayerId
        return `${from} owes ${to} ${payment.amount}${settings.unitLabel ? ` ${settings.unitLabel}` : ''}`
      }),
      '',
      'Net:',
      ...result.netResults.map((entry) => {
        const name = playerNameMap.get(entry.playerId) ?? entry.playerId
        return `${name}: ${formatAmount(entry.netAmount, settings.unitLabel)}`
      }),
    ].join('\n')

    try {
      await navigator.clipboard.writeText(lines)
      setCopyFeedback('Results copied.')
    } catch {
      setCopyFeedback('Clipboard copy failed.')
    }
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <p className="eyebrow">Big Two Helper</p>
        <h1>Learn the core rankings fast and settle a round in seconds.</h1>
        <p className="hero-copy">
          Mobile-first reference for one clear Big Two ruleset, with pairwise end-of-round payouts.
        </p>
      </header>

      <nav className="tab-bar" aria-label="Main tabs">
        <button
          className={activeTab === 'cheat-sheet' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('cheat-sheet')}
        >
          Cheat Sheet
        </button>
        <button
          className={activeTab === 'calculator' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('calculator')}
        >
          Calculator
        </button>
      </nav>

      <main className="content-stack">
        {activeTab === 'cheat-sheet' ? (
          <>
            <section className="card summary-card">
              <div className="card-header">
                <h2>Suit order</h2>
                <span className="pill">Ascending</span>
              </div>
              <p className="big-inline">♦ &lt; ♣ &lt; ♥ &lt; ♠</p>
              <div className="token-row">
                {suitOrder.map((suit) => (
                  <span className="token" key={suit}>
                    {suit}
                  </span>
                ))}
              </div>
            </section>

            <section className="card summary-card">
              <div className="card-header">
                <h2>Rank order</h2>
                <span className="pill">3 low, 2 high</span>
              </div>
              <p className="big-inline rank-line">{rankOrder.join(' < ')}</p>
            </section>

            <section className="card summary-card">
              <div className="card-header">
                <h2>5-card combo ranking</h2>
                <span className="pill">Lowest to highest</span>
              </div>
              <p className="big-inline rank-line">{comboRanking.join(' < ')}</p>
            </section>

            <section className="combo-grid">
              {comboDetails.map((combo) => {
                const isOpen = expandedCards[combo.id] ?? false
                return (
                  <article className="card combo-card" key={combo.id}>
                    <button
                      className="combo-toggle"
                      onClick={() =>
                        setExpandedCards((current) => ({
                          ...current,
                          [combo.id]: !isOpen,
                        }))
                      }
                      aria-expanded={isOpen}
                    >
                      <div>
                        <h2>{combo.name}</h2>
                        <p>{combo.summary}</p>
                      </div>
                      <span className="pill">{isOpen ? 'Hide' : 'Tap to expand'}</span>
                    </button>

                    {isOpen ? (
                      <div className="combo-body">
                        <p>{combo.detail}</p>
                        <dl className="detail-list">
                          <div>
                            <dt>Valid example</dt>
                            <dd>{combo.validExample}</dd>
                          </div>
                          <div>
                            <dt>Invalid example</dt>
                            <dd>{combo.invalidExample}</dd>
                          </div>
                          <div>
                            <dt>Tie-break</dt>
                            <dd>{combo.tieBreak}</dd>
                          </div>
                          <div>
                            <dt>Beaten by</dt>
                            <dd>{combo.beats}</dd>
                          </div>
                        </dl>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </section>

            <section className="card">
              <button
                className="section-toggle"
                onClick={() => setShowMiniRules((current) => !current)}
                aria-expanded={showMiniRules}
              >
                <h2>How a round works</h2>
                <span className="pill">{showMiniRules ? 'Hide' : 'Show'}</span>
              </button>
              {showMiniRules ? (
                <ul className="rules-list">
                  <li>Players try to get rid of all their cards.</li>
                  <li>Higher valid plays beat lower valid plays.</li>
                  <li>Passing is allowed.</li>
                  <li>The round ends when one player has no cards left.</li>
                  <li>Settlement is based on the cards each player still holds.</li>
                </ul>
              ) : null}
            </section>
          </>
        ) : (
          <>
            <section className="card">
              <div className="card-header">
                <h2>Players</h2>
                <div className="segmented">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      className={players.length === count ? 'segment active' : 'segment'}
                      onClick={() => handlePlayerCountChange(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              <p className="section-copy">
                The winner is the one player with <strong>0 cards left</strong>.
              </p>
              <div className="player-list">
                {players.map((player, index) => (
                  <div className="player-row" key={player.id}>
                    <label>
                      <span>Name</span>
                      <input
                        type="text"
                        value={player.name}
                        onChange={(event) => updatePlayer(player.id, 'name', event.target.value)}
                        placeholder={`Player ${index + 1}`}
                      />
                    </label>
                    <label>
                      <span>Cards left</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={player.cardsLeft}
                        onChange={(event) => updatePlayer(player.id, 'cardsLeft', event.target.value)}
                        placeholder="0"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Settlement settings</h2>
                <span className="pill">Saved locally</span>
              </div>
              <div className="settings-grid">
                <label>
                  <span>Value per card</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={settings.valuePerCard}
                    onChange={(event) => updateSetting('valuePerCard', event.target.value)}
                  />
                </label>
                <label>
                  <span>Unit label</span>
                  <input
                    type="text"
                    value={settings.unitLabel}
                    onChange={(event) => updateSetting('unitLabel', event.target.value, false)}
                    placeholder="points"
                  />
                </label>
                <label>
                  <span>Penalty threshold</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={settings.penaltyThreshold}
                    onChange={(event) => updateSetting('penaltyThreshold', event.target.value)}
                  />
                </label>
                <label>
                  <span>Penalty multiplier</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="1"
                    value={settings.penaltyMultiplier}
                    onChange={(event) => updateSetting('penaltyMultiplier', event.target.value)}
                  />
                </label>
              </div>
              <p className="section-copy">
                If a payer has cards left greater than or equal to the threshold, the multiplier
                applies to <strong>every pairwise payment they make</strong>.
              </p>
            </section>

            <section className="action-row">
              <button className="primary-button" onClick={handleCalculate}>
                Calculate settlement
              </button>
              <button className="ghost-button" onClick={handleReset}>
                Reset example
              </button>
            </section>

            {errors.length > 0 ? (
              <section className="card error-card" aria-live="polite">
                <h2>Check these inputs</h2>
                <ul className="error-list">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {result ? (
              <section className="results-grid">
                <article className="card results-card">
                  <div className="card-header">
                    <h2>Pairwise settlements</h2>
                    <span className="pill">Difference-based</span>
                  </div>
                  <ul className="results-list">
                    {result.pairwisePayments.map((payment, index) => {
                      const from = playerNameMap.get(payment.fromPlayerId) ?? payment.fromPlayerId
                      const to = playerNameMap.get(payment.toPlayerId) ?? payment.toPlayerId
                      return (
                        <li key={`${payment.fromPlayerId}-${payment.toPlayerId}-${index}`}>
                          <strong>{from}</strong> owes <strong>{to}</strong> {payment.amount}
                          {settings.unitLabel ? ` ${settings.unitLabel}` : ''}
                          {payment.multiplierApplied > 1
                            ? ` (${payment.cardDifference} × ${settings.valuePerCard} × ${payment.multiplierApplied})`
                            : ` (${payment.cardDifference} × ${settings.valuePerCard})`}
                        </li>
                      )
                    })}
                  </ul>
                </article>

                <article className="card results-card">
                  <div className="card-header">
                    <h2>Net totals</h2>
                    <button className="pill-button" onClick={handleCopyResults}>
                      Copy results
                    </button>
                  </div>
                  <ul className="results-list net-list">
                    {result.netResults.map((entry) => {
                      const name = playerNameMap.get(entry.playerId) ?? entry.playerId
                      return (
                        <li key={entry.playerId}>
                          <span>{name}</span>
                          <strong>{formatAmount(entry.netAmount, settings.unitLabel)}</strong>
                        </li>
                      )
                    })}
                  </ul>
                  {copyFeedback ? <p className="copy-feedback">{copyFeedback}</p> : null}
                </article>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}

export default App
