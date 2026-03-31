import { useEffect, useMemo, useRef, useState } from 'react'
import { comboDetails, comboRanking, rankOrder, suitOrder } from './data/bigTwoRules'
import { calculateSettlements, validatePlayers, validateSettings } from './lib/calculator'
import type {
  CalculationResult,
  CalculatorSettings,
  Player,
  RunningTotal,
  SavedRound,
  TabId,
} from './types'

const STORAGE_KEYS = {
  players: 'big2-helper:players',
  settings: 'big2-helper:settings',
  activeTab: 'big2-helper:active-tab',
  savedRounds: 'big2-helper:saved-rounds',
}

const defaultPlayers: Player[] = [
  { id: 'p1', name: '', cardsLeft: '' },
  { id: 'p2', name: '', cardsLeft: '' },
  { id: 'p3', name: '', cardsLeft: '' },
  { id: 'p4', name: '', cardsLeft: '' },
]

const defaultSettings: CalculatorSettings = {
  valuePerCard: 1,
  unitLabel: 'points',
  penaltyThreshold: 10,
  penaltyMultiplier: 2,
}

const unitOptions = [
  { label: 'Yen (¥)', value: '¥' },
  { label: 'Points', value: 'points' },
  { label: 'Dollar ($)', value: '$' },
  { label: 'Pound (£)', value: '£' },
]

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

function getPlayerLabel(name: string, index: number): string {
  return name.trim() || `Player ${index + 1}`
}

function getResultPlayerNameById(players: Player[], playerId: string): string {
  const index = players.findIndex((player) => player.id === playerId)
  if (index === -1) {
    return playerId
  }
  return getPlayerLabel(players[index].name, index)
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
  const [highlightedCombo, setHighlightedCombo] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [savedRounds, setSavedRounds] = useState<SavedRound[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const cardInputRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    setPlayers(readStorage<Player[]>(STORAGE_KEYS.players, defaultPlayers))
    setSettings(readStorage<CalculatorSettings>(STORAGE_KEYS.settings, defaultSettings))
    setActiveTab(readStorage<TabId>(STORAGE_KEYS.activeTab, 'cheat-sheet'))
    setSavedRounds(readStorage<SavedRound[]>(STORAGE_KEYS.savedRounds, []))
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
    window.localStorage.setItem(STORAGE_KEYS.savedRounds, JSON.stringify(savedRounds))
  }, [savedRounds])

  useEffect(() => {
    if (!copyFeedback && !saveFeedback) {
      return
    }

    const timeout = window.setTimeout(() => {
      setCopyFeedback('')
      setSaveFeedback('')
    }, 1800)
    return () => window.clearTimeout(timeout)
  }, [copyFeedback, saveFeedback])

  const playerNameMap = useMemo(
    () => new Map(players.map((player, index) => [player.id, getPlayerLabel(player.name, index)])),
    [players],
  )

  const runningTotals = useMemo<RunningTotal[]>(() => {
    const totals = new Map<string, number>()

    savedRounds.forEach((round) => {
      round.players.forEach((player) => {
        totals.set(player.name, (totals.get(player.name) ?? 0) + player.netAmount)
      })
    })

    return Array.from(totals.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((first, second) => second.total - first.total)
  }, [savedRounds])

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
          name: '',
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
    const normalizedPlayers = players.map((player) => ({
      ...player,
      cardsLeft: player.cardsLeft === '' ? 0 : player.cardsLeft,
    }))

    if (normalizedPlayers.some((player, index) => player.cardsLeft !== players[index].cardsLeft)) {
      setPlayers(normalizedPlayers)
    }

    const validationErrors = [...validatePlayers(normalizedPlayers), ...validateSettings(settings)]
    setErrors(validationErrors)

    if (validationErrors.length > 0) {
      setResult(null)
      return
    }

    setResult(calculateSettlements(normalizedPlayers, settings))
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

  const handleSaveResults = () => {
    if (!result) {
      return
    }

    const roundPlayers = players.map((player, index) => {
      const name = getPlayerLabel(player.name, index)
      const entry = result.netResults.find((netResult) => netResult.playerId === player.id)

      return {
        name,
        cardsLeft: player.cardsLeft === '' ? 0 : Number(player.cardsLeft),
        netAmount: entry?.netAmount ?? 0,
      }
    })

    setSavedRounds((current) => [
      {
        id: `${Date.now()}`,
        savedAt: new Date().toISOString(),
        unitLabel: settings.unitLabel,
        valuePerCard: settings.valuePerCard,
        penaltyThreshold: settings.penaltyThreshold,
        penaltyMultiplier: settings.penaltyMultiplier,
        players: roundPlayers,
      },
      ...current,
    ])
    setSaveFeedback('Results saved.')
    setShowHistory(true)
  }

  const handleResetSavedResults = () => {
    if (!window.confirm('Reset all saved totals and round history?')) {
      return
    }

    setSavedRounds([])
    setShowHistory(false)
  }

  const handleDeleteSavedRound = (roundId: string) => {
    if (!window.confirm('Delete this saved round from history and totals?')) {
      return
    }

    setSavedRounds((current) => current.filter((round) => round.id !== roundId))
  }

  const commitCardsLeft = (playerId: string) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId && player.cardsLeft === '' ? { ...player, cardsLeft: 0 } : player,
      ),
    )
  }

  const handleCardsLeftKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    playerId: string,
    index: number,
  ) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    commitCardsLeft(playerId)

    const nextInput = cardInputRefs.current[index + 1]
    if (nextInput) {
      nextInput.focus()
      nextInput.select()
      return
    }

    handleCalculate()
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <p className="eyebrow">Big 2 Helper</p>
        <h1>Big 2 Helper</h1>
        <div className="hero-copy hero-subtitle">
          <ruby>
            鋤大D
            <rt>co2 daai6 di2</rt>
          </ruby>
          <span className="hero-divider">/</span>
          <ruby>
            大老二
            <rt>da lao er</rt>
          </ruby>
        </div>
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
            <section className="summary-grid">
              <section className="card summary-card">
                <div className="card-header">
                  <h2>Suit order</h2>
                  <span className="pill">Ascending</span>
                </div>
                <div className="suit-card-row" aria-label="Diamonds less than clubs less than hearts less than spades">
                  {[
                    { symbol: '♦', label: 'Diamonds', tone: 'red' },
                    { symbol: '♣', label: 'Clubs', tone: 'black' },
                    { symbol: '♥', label: 'Hearts', tone: 'red' },
                    { symbol: '♠', label: 'Spades', tone: 'black' },
                  ].map((suit, index, collection) => (
                    <div className="suit-order-item" key={suit.label}>
                      <div className={suit.tone === 'red' ? 'summary-cardface suit-red' : 'summary-cardface suit-black'}>
                        <span className="summary-card-rank">{suit.symbol}</span>
                        <span className="summary-card-suit">{suit.symbol}</span>
                      </div>
                      {index < collection.length - 1 ? <span className="suit-separator-card">&lt;</span> : null}
                    </div>
                  ))}
                </div>
                <div className="token-row">
                  {suitOrder.map((suit) => (
                    <span
                      className={
                        suit.includes('Diamonds') || suit.includes('Hearts')
                          ? 'token suit-token suit-token-red'
                          : 'token suit-token suit-token-black'
                      }
                      key={suit}
                    >
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
                <div className="rank-fan" aria-label={rankOrder.join(' less than ')}>
                  {rankOrder.map((rank, index) => (
                    <div className="rank-card rank-card-plain" key={rank} style={{ zIndex: index + 1 }}>
                        <span className="rank-card-rank">{rank}</span>
                      </div>
                  ))}
                </div>
                <p className="rank-helper">{rankOrder.join(' < ')}</p>
              </section>
            </section>

            <section className="card summary-card">
              <div className="card-header">
                <h2>5-card combo ranking</h2>
                <span className="pill">Lowest to highest</span>
              </div>
              <div className="combo-ranking-strip" aria-label={comboRanking.join(' less than ')}>
                {comboDetails.map((combo, index) => {
                  const isHighlighted = highlightedCombo === combo.id
                  return (
                    <div className="combo-ranking-item" key={combo.id}>
                      <button
                        type="button"
                        className={isHighlighted ? 'combo-ranking-chip active' : 'combo-ranking-chip'}
                        onMouseEnter={() => setHighlightedCombo(combo.id)}
                        onMouseLeave={() => setHighlightedCombo((current) => (current === combo.id ? null : current))}
                        onFocus={() => setHighlightedCombo(combo.id)}
                        onBlur={() => setHighlightedCombo((current) => (current === combo.id ? null : current))}
                        onClick={() => {
                          setHighlightedCombo(combo.id)
                          setExpandedCards((current) => ({
                            ...current,
                            [combo.id]: !current[combo.id],
                          }))
                          if (!expandedCards[combo.id]) {
                            document
                              .getElementById(`combo-card-${combo.id}`)
                              ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                          }
                        }}
                      >
                        <span className="combo-rank-number">{index + 1}</span>
                        <span>{combo.name}</span>
                      </button>
                      {index < comboDetails.length - 1 ? (
                        <span className="combo-ranking-arrow" aria-hidden="true">
                          →
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="combo-grid">
              {comboDetails.map((combo) => {
                const isOpen = expandedCards[combo.id] ?? false
                const isHighlighted = highlightedCombo === combo.id
                return (
                  <article
                    className={isHighlighted ? 'card combo-card combo-card-highlighted' : 'card combo-card'}
                    id={`combo-card-${combo.id}`}
                    key={combo.id}
                    onMouseEnter={() => setHighlightedCombo(combo.id)}
                    onMouseLeave={() => setHighlightedCombo((current) => (current === combo.id ? null : current))}
                  >
                    <button
                      className="combo-toggle"
                      onClick={() =>
                        setExpandedCards((current) => ({
                          ...current,
                          [combo.id]: !isOpen,
                        }))
                      }
                      aria-expanded={isOpen}
                      onFocus={() => setHighlightedCombo(combo.id)}
                      onBlur={() => setHighlightedCombo((current) => (current === combo.id ? null : current))}
                    >
                      <div className="combo-heading">
                        <h2>{combo.name}</h2>
                        <p>{combo.summary}</p>
                      </div>
                      <span className="chevron" aria-hidden="true">
                        <span className={isOpen ? 'chevron-icon open' : 'chevron-icon'} />
                      </span>
                    </button>

                    <div className="combo-preview">
                      <div className="hand-strip" aria-label={`${combo.name} example hand`}>
                        {combo.exampleCards.map((cardCode) => (
                          <img
                            key={cardCode}
                            className="mini-card"
                            src={`./cards/${cardCode}.svg`}
                            alt={cardCode}
                            loading="lazy"
                          />
                        ))}
                      </div>
                      <p className="preview-caption">Example hand: {combo.validExample}</p>
                    </div>

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
              <div className="player-columns" aria-hidden="true">
                <span>Name</span>
                <span>Cards left</span>
              </div>
              <div className="player-list">
                {players.map((player, index) => (
                  <div className="player-row" key={player.id}>
                    <div className="player-field">
                      <input
                        type="text"
                        aria-label={`Player ${index + 1} name`}
                        value={player.name}
                        onChange={(event) => updatePlayer(player.id, 'name', event.target.value)}
                        onFocus={(event) => event.currentTarget.select()}
                        onClick={(event) => event.currentTarget.select()}
                        placeholder={`Player ${index + 1}`}
                      />
                    </div>
                    <div className="player-field">
                      <input
                        type="number"
                        ref={(node) => {
                          cardInputRefs.current[index] = node
                        }}
                        aria-label={`${getPlayerLabel(player.name, index)} cards left`}
                        inputMode="numeric"
                        min="0"
                        value={player.cardsLeft}
                        onChange={(event) => updatePlayer(player.id, 'cardsLeft', event.target.value)}
                        onBlur={() => commitCardsLeft(player.id)}
                        onKeyDown={(event) => handleCardsLeftKeyDown(event, player.id, index)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <button
                className="settings-toggle"
                onClick={() => setShowSettings((current) => !current)}
                aria-expanded={showSettings}
              >
                <div>
                  <h2>Settings</h2>
                  <p className="section-copy settings-summary">
                    {settings.valuePerCard} {settings.unitLabel || 'points'} per card, threshold{' '}
                    {settings.penaltyThreshold}, multiplier {settings.penaltyMultiplier}
                  </p>
                </div>
                <span className="settings-icon" aria-hidden="true">
                  ⚙
                </span>
              </button>
              {showSettings ? (
                <>
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
                      <select
                        value={settings.unitLabel}
                        onChange={(event) => updateSetting('unitLabel', event.target.value, false)}
                      >
                        {unitOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
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
                    If a payer has cards left greater than or equal to the threshold, the
                    multiplier applies to <strong>every pairwise payment they make</strong>.
                  </p>
                </>
              ) : null}
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
                      const from =
                        playerNameMap.get(payment.fromPlayerId) ??
                        getResultPlayerNameById(players, payment.fromPlayerId)
                      const to =
                        playerNameMap.get(payment.toPlayerId) ??
                        getResultPlayerNameById(players, payment.toPlayerId)
                      return (
                        <li
                          className="settlement-item"
                          key={`${payment.fromPlayerId}-${payment.toPlayerId}-${index}`}
                        >
                          <div className="settlement-main">
                            <strong>{from}</strong>
                            <span>owes</span>
                            <strong>{to}</strong>
                          </div>
                          <div className="settlement-amount">
                            <strong>
                              {payment.amount}
                              {settings.unitLabel ? ` ${settings.unitLabel}` : ''}
                            </strong>
                            <span>
                              {payment.multiplierApplied > 1
                                ? `${payment.cardDifference} × ${settings.valuePerCard} × ${payment.multiplierApplied}`
                                : `${payment.cardDifference} × ${settings.valuePerCard}`}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </article>

                <article className="card results-card">
                  <div className="card-header">
                    <h2>Net totals</h2>
                    <div className="results-actions">
                      <button className="pill-button" onClick={handleCopyResults}>
                        Copy results
                      </button>
                      <button className="pill-button primary-pill-button" onClick={handleSaveResults}>
                        Save results
                      </button>
                    </div>
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
                  {copyFeedback || saveFeedback ? (
                    <p className="copy-feedback">{copyFeedback || saveFeedback}</p>
                  ) : null}
                </article>
              </section>
            ) : null}

            <section className="card">
              <button
                className="section-toggle"
                onClick={() => setShowHistory((current) => !current)}
                aria-expanded={showHistory}
              >
                <h2>Saved totals</h2>
                <span className="pill">{showHistory ? 'Hide' : 'Show'}</span>
              </button>
              {showHistory ? (
                <div className="history-stack">
                  <div className="history-header-row">
                    <p className="section-copy history-summary">
                      Running totals are grouped by the saved player names from each round.
                    </p>
                    <button className="ghost-button history-reset-button" onClick={handleResetSavedResults}>
                      Reset all
                    </button>
                  </div>

                  {runningTotals.length > 0 ? (
                    <div className="saved-table">
                      <div className="saved-table-head">
                        <span>Player</span>
                        <span>Total</span>
                      </div>
                      {runningTotals.map((entry) => (
                        <div className="saved-table-row" key={entry.name}>
                          <span>{entry.name}</span>
                          <strong>{formatAmount(entry.total, settings.unitLabel)}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="section-copy">No saved rounds yet.</p>
                  )}

                  {savedRounds.length > 0 ? (
                    <details className="history-details">
                      <summary>Round history</summary>
                      <div className="history-list">
                        {savedRounds.map((round) => (
                          <article className="history-card" key={round.id}>
                            <div className="history-card-header">
                              <div className="history-card-meta">
                                <strong>{new Date(round.savedAt).toLocaleString()}</strong>
                                <span>
                                  {round.valuePerCard} {round.unitLabel || 'points'} per card
                                </span>
                              </div>
                              <button
                                className="history-delete-button"
                                onClick={() => handleDeleteSavedRound(round.id)}
                              >
                                Delete
                              </button>
                            </div>
                            <div className="history-round-table">
                              {round.players.map((player) => (
                                <div className="history-round-row" key={`${round.id}-${player.name}`}>
                                  <span>
                                    {player.name} · {player.cardsLeft} cards left
                                  </span>
                                  <strong>{formatAmount(player.netAmount, round.unitLabel)}</strong>
                                </div>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
