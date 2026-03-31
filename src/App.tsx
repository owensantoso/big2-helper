import { useEffect, useMemo, useRef, useState } from 'react'
import { defaultLocale, getContent, type SupportedLocale } from './content'
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
  locale: 'big2-helper:locale',
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

type HandCheckResult = {
  message: string
  comboId: string | null
}

function parseLocale(value: string | null): SupportedLocale | null {
  if (!value) {
    return null
  }

  const normalized = value.toLowerCase()
  if (normalized === 'en') {
    return 'en'
  }

  if (normalized === 'ja' || normalized === 'jp') {
    return 'ja'
  }

  return null
}

function parseTab(value: string | null): TabId | null {
  if (!value) {
    return null
  }

  if (value === 'calculator') {
    return 'calculator'
  }

  if (value === 'cheat-sheet' || value === 'cheatsheet' || value === 'cheat_sheet') {
    return 'cheat-sheet'
  }

  return null
}

function getInitialLocale(): SupportedLocale {
  const queryLocale = parseLocale(new URLSearchParams(window.location.search).get('lang'))
  if (queryLocale) {
    return queryLocale
  }

  const storedLocale = parseLocale(readStorage<string | null>(STORAGE_KEYS.locale, null))
  if (storedLocale) {
    return storedLocale
  }

  const browserLanguages = [...navigator.languages, navigator.language].filter(Boolean)
  if (browserLanguages.some((language) => language.toLowerCase().startsWith('ja'))) {
    return 'ja'
  }

  return defaultLocale
}

function getInitialTab(): TabId {
  const queryTab = parseTab(new URLSearchParams(window.location.search).get('tab'))
  if (queryTab) {
    return queryTab
  }

  return readStorage<TabId>(STORAGE_KEYS.activeTab, 'cheat-sheet')
}

function classifySelectedHand(
  selectedIds: string[],
  rankOrder: string[],
  labels: {
    waitingMessage: (count: number) => string
    invalidHand: string
  },
): HandCheckResult {
  if (selectedIds.length !== 5) {
    return {
      message: labels.waitingMessage(selectedIds.length),
      comboId: null,
    }
  }

  const cards = selectedIds.map((id) => {
    const rank = id.slice(0, -1)
    const suit = id.slice(-1)
    return { rank, suit }
  })

  const ranks = cards.map((card) => card.rank)
  const suits = cards.map((card) => card.suit)
  const uniqueRanks = new Set(ranks)
  const isFlush = new Set(suits).size === 1
  const rankCounts = Array.from(
    ranks.reduce((counts, rank) => {
      counts.set(rank, (counts.get(rank) ?? 0) + 1)
      return counts
    }, new Map<string, number>()).values(),
  ).sort((first, second) => second - first)

  const sortedRankIndexes = Array.from(uniqueRanks)
    .map((rank) => rankOrder.indexOf(rank))
    .sort((first, second) => first - second)

  const isStraight =
    uniqueRanks.size === 5 &&
    !ranks.includes('2') &&
    sortedRankIndexes.every((rankIndex, index, collection) =>
      index === 0 ? true : rankIndex - collection[index - 1] === 1,
    )

  if (isStraight && isFlush) {
    return { message: 'Straight Flush', comboId: 'straight-flush' }
  }

  if (rankCounts[0] === 4) {
    return { message: 'Four of a Kind', comboId: 'four-of-a-kind' }
  }

  if (rankCounts[0] === 3 && rankCounts[1] === 2) {
    return { message: 'Full House', comboId: 'full-house' }
  }

  if (isFlush) {
    return { message: 'Flush', comboId: 'flush' }
  }

  if (isStraight) {
    return { message: 'Straight', comboId: 'straight' }
  }

  return {
    message: labels.invalidHand,
    comboId: null,
  }
}

function App() {
  const [locale, setLocale] = useState<SupportedLocale>(getInitialLocale)
  const localeContent = useMemo(() => getContent(locale), [locale])
  const { content, comboDetails, comboRanking, rankOrder } = localeContent
  const handCheckerSuits = content.handCheckerSuits
  const unitOptions = content.units
  const deckCards = handCheckerSuits.flatMap((suit) =>
    rankOrder.map((rank) => ({
      id: `${rank}${suit.symbol}`,
      rank,
      suit: suit.symbol,
      tone: suit.tone,
    })),
  )

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab)
  const [players, setPlayers] = useState<Player[]>(defaultPlayers)
  const [settings, setSettings] = useState<CalculatorSettings>(defaultSettings)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const [showHandChecker, setShowHandChecker] = useState(false)
  const [showMiniRules, setShowMiniRules] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [copyFeedback, setCopyFeedback] = useState('')
  const [highlightedCombo, setHighlightedCombo] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [savedRounds, setSavedRounds] = useState<SavedRound[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [selectedHandCards, setSelectedHandCards] = useState<string[]>([])
  const cardInputRefs = useRef<Array<HTMLInputElement | null>>([])

  const getPlayerLabel = (name: string, index: number) =>
    name.trim() || content.calculator.playerLabel(index)

  const getResultPlayerNameById = (playersList: Player[], playerId: string) => {
    const index = playersList.findIndex((player) => player.id === playerId)
    if (index === -1) {
      return playerId
    }
    return getPlayerLabel(playersList[index].name, index)
  }

  useEffect(() => {
    setPlayers(readStorage<Player[]>(STORAGE_KEYS.players, defaultPlayers))
    setSettings(readStorage<CalculatorSettings>(STORAGE_KEYS.settings, defaultSettings))
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
    window.localStorage.setItem(STORAGE_KEYS.locale, JSON.stringify(locale))
  }, [locale])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.savedRounds, JSON.stringify(savedRounds))
  }, [savedRounds])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('lang', locale)
    params.set('tab', activeTab)
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`
    window.history.replaceState({}, '', nextUrl)
  }, [activeTab, locale])

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

  const handCheckResult = useMemo(
    () => classifySelectedHand(selectedHandCards, rankOrder, content.handChecker),
    [content.handChecker, rankOrder, selectedHandCards],
  )

  useEffect(() => {
    if (handCheckResult.comboId) {
      setExpandedCards({ [handCheckResult.comboId]: true })
      return
    }

    setExpandedCards({})
  }, [handCheckResult])

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
      content.misc.bigTwoSettlement,
      '',
      content.misc.pairwise,
      ...result.pairwisePayments.map((payment) => {
        const from = playerNameMap.get(payment.fromPlayerId) ?? payment.fromPlayerId
        const to = playerNameMap.get(payment.toPlayerId) ?? payment.toPlayerId
        return `${from} ${content.calculator.owes} ${to} ${payment.amount}${settings.unitLabel ? ` ${settings.unitLabel}` : ''}`
      }),
      '',
      content.misc.net,
      ...result.netResults.map((entry) => {
        const name = playerNameMap.get(entry.playerId) ?? entry.playerId
        return `${name}: ${formatAmount(entry.netAmount, settings.unitLabel)}`
      }),
    ].join('\n')

    try {
      await navigator.clipboard.writeText(lines)
      setCopyFeedback(content.feedback.copied)
    } catch {
      setCopyFeedback(content.feedback.copyFailed)
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
    setSaveFeedback(content.feedback.saved)
    setShowHistory(true)
  }

  const handleResetSavedResults = () => {
    if (!window.confirm(content.confirmations.resetHistory)) {
      return
    }

    setSavedRounds([])
    setShowHistory(false)
  }

  const handleDeleteSavedRound = (roundId: string) => {
    if (!window.confirm(content.confirmations.deleteRound)) {
      return
    }

    setSavedRounds((current) => current.filter((round) => round.id !== roundId))
  }

  const toggleHandCard = (cardId: string) => {
    setSelectedHandCards((current) => {
      if (current.includes(cardId)) {
        return current.filter((selectedId) => selectedId !== cardId)
      }

      if (current.length >= 5) {
        return current
      }

      return [...current, cardId]
    })
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
        <div className="hero-topbar">
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <label className="language-picker">
            <span>{content.language.label}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as SupportedLocale)}>
              <option value="en">{content.language.en}</option>
              <option value="ja">{content.language.ja}</option>
            </select>
          </label>
        </div>
        <h1>{content.hero.title}</h1>
        <div className="hero-copy hero-subtitle">
          <ruby>
            {content.hero.cantonese}
            <rt>{content.hero.cantoneseRuby}</rt>
          </ruby>
          <span className="hero-divider">/</span>
          <ruby>
            {content.hero.mandarin}
            <rt>{content.hero.mandarinRuby}</rt>
          </ruby>
        </div>
      </header>

      <nav className="tab-bar" aria-label="Main tabs">
        <button
          className={activeTab === 'cheat-sheet' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('cheat-sheet')}
        >
          {content.tabs.cheatSheet}
        </button>
        <button
          className={activeTab === 'calculator' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('calculator')}
        >
          {content.tabs.calculator}
        </button>
      </nav>

      <main className="content-stack">
        {activeTab === 'cheat-sheet' ? (
          <>
            <section className="summary-grid">
              <section className="card summary-card">
                <div className="card-header">
                  <h2>{content.summary.suitOrder}</h2>
                  <span className="pill">{content.summary.ascending}</span>
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
                <div className="token-row suit-token-row">
                  {handCheckerSuits.map((suit) => (
                    <span
                      className={
                        suit.tone === 'red'
                          ? 'token suit-token suit-token-red'
                          : 'token suit-token suit-token-black'
                      }
                      key={suit.symbol}
                    >
                      {suit.symbol} {suit.label}
                    </span>
                  ))}
                </div>
              </section>

              <section className="card summary-card">
                <div className="card-header">
                  <h2>{content.summary.rankOrder}</h2>
                  <span className="pill">{content.summary.rankHint}</span>
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
                <h2>{content.summary.validPlays}</h2>
                <span className="pill">{content.summary.quickGuide}</span>
              </div>
              <div className="valid-plays-grid">
                <article className="valid-play-card">
                  <h3>{content.validPlays.singles}</h3>
                  <p>{content.validPlays.singlesCopy}</p>
                  <p className="valid-play-example">{content.validPlays.singlesExample}</p>
                </article>
                <article className="valid-play-card">
                  <h3>{content.validPlays.doubles}</h3>
                  <p>{content.validPlays.doublesCopy}</p>
                  <p className="valid-play-example">{content.validPlays.doublesExample}</p>
                </article>
                <article className="valid-play-card">
                  <h3>{content.validPlays.triples}</h3>
                  <p>{content.validPlays.triplesCopy}</p>
                  <p className="valid-play-example">{content.validPlays.triplesExample}</p>
                </article>
              </div>
              <p className="invalid-play-note">
                {content.validPlays.invalidNotePrefix}
                <strong>{content.validPlays.invalidNoteStrong}</strong>
                {content.validPlays.invalidNoteSuffix}
              </p>
            </section>

            <section className="card summary-card">
              <div className="card-header">
                <h2>{content.summary.comboRanking}</h2>
                <span className="pill">{content.summary.lowestToHighest}</span>
              </div>
              <div className="combo-ranking-strip" aria-label={comboRanking.join(' less than ')}>
                {comboDetails.map((combo, index) => {
                  const isHighlighted = highlightedCombo === combo.id
                  const isDetected = handCheckResult.comboId === combo.id
                  return (
                    <div className="combo-ranking-item" key={combo.id}>
                      <button
                        type="button"
                        className={
                          isDetected
                            ? 'combo-ranking-chip detected'
                            : isHighlighted
                              ? 'combo-ranking-chip active'
                              : 'combo-ranking-chip'
                        }
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
                const isDetected = handCheckResult.comboId === combo.id
                return (
                  <article
                    className={
                      isDetected
                        ? 'card combo-card combo-card-detected'
                        : isHighlighted
                          ? 'card combo-card combo-card-highlighted'
                          : 'card combo-card'
                    }
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
                      <p className="preview-caption">
                        {content.comboDetails.exampleHand} {combo.validExample}
                      </p>
                    </div>

                    {isOpen ? (
                      <div className="combo-body">
                        <p>{combo.detail}</p>
                        <dl className="detail-list">
                          <div>
                            <dt>{content.comboDetails.validExample}</dt>
                            <dd>{combo.validExample}</dd>
                          </div>
                          <div>
                            <dt>{content.comboDetails.invalidExample}</dt>
                            <dd>{combo.invalidExample}</dd>
                          </div>
                          <div>
                            <dt>{content.comboDetails.tieBreak}</dt>
                            <dd>{combo.tieBreak}</dd>
                          </div>
                          <div>
                            <dt>{content.comboDetails.beatenBy}</dt>
                            <dd>{combo.beats}</dd>
                          </div>
                        </dl>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </section>

            <section className="card summary-card">
              <button
                className="section-toggle"
                onClick={() => setShowHandChecker((current) => !current)}
                aria-expanded={showHandChecker}
              >
                <h2>{content.summary.handChecker}</h2>
                <span className="pill">{showHandChecker ? content.handChecker.hide : content.handChecker.show}</span>
              </button>
              {showHandChecker ? (
                <>
                  <div className="hand-checker-header">
                    <p className="section-copy hand-checker-copy">
                      {content.handChecker.intro}
                    </p>
                    <button
                      className="pill-button"
                      onClick={() => setSelectedHandCards([])}
                      disabled={selectedHandCards.length === 0}
                    >
                      {content.handChecker.clear}
                    </button>
                  </div>
                  <div className="hand-checker-result">
                    <strong>{handCheckResult.message}</strong>
                    <span>{content.handChecker.selectedCount(selectedHandCards.length)}</span>
                  </div>
                  <p className="hand-checker-helper">
                    {content.handChecker.helper}
                  </p>
                  <div className="hand-checker-deck">
                    {handCheckerSuits.map((suit) => (
                      <section className="hand-checker-suit-group" key={suit.symbol}>
                        <div
                          className={
                            suit.tone === 'red'
                              ? 'hand-checker-suit-badge hand-checker-suit-badge-red'
                              : 'hand-checker-suit-badge hand-checker-suit-badge-black'
                          }
                        >
                          <span>{suit.symbol}</span>
                          <span>{suit.label}</span>
                        </div>
                        <div className="hand-checker-stack">
                          {rankOrder.map((rank) => {
                            const cardId = `${rank}${suit.symbol}`
                            const isSelected = selectedHandCards.includes(cardId)

                            return (
                              <button
                                type="button"
                                key={cardId}
                                className={
                                  isSelected
                                    ? `checker-card checker-card-selected-hand checker-card-${suit.tone}`
                                    : `checker-card checker-card-${suit.tone}`
                                }
                                onClick={() => toggleHandCard(cardId)}
                                aria-pressed={isSelected}
                              >
                                <span className="checker-card-rank">{rank}</span>
                                <span className="checker-card-corner-suit">{suit.symbol}</span>
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              ) : null}
            </section>

            <section className="card">
              <button
                className="section-toggle"
                onClick={() => setShowMiniRules((current) => !current)}
                aria-expanded={showMiniRules}
              >
                <h2>{content.rules.title}</h2>
                <span className="pill">{showMiniRules ? content.rules.hide : content.rules.show}</span>
              </button>
              {showMiniRules ? (
                <ul className="rules-list">
                  {content.rules.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          </>
        ) : (
          <>
            <section className="card">
              <div className="card-header">
                <h2>{content.calculator.players}</h2>
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
                {content.calculator.winnerCopyPrefix}
                <strong>{content.calculator.winnerCopyStrong}</strong>
                {content.calculator.winnerCopySuffix}
              </p>
              <div className="player-columns" aria-hidden="true">
                <span>{content.calculator.name}</span>
                <span>{content.calculator.cardsLeft}</span>
              </div>
              <div className="player-list">
                {players.map((player, index) => (
                  <div className="player-row" key={player.id}>
                    <div className="player-field">
                      <input
                        type="text"
                        aria-label={content.calculator.playerNameAria(index)}
                        value={player.name}
                        onChange={(event) => updatePlayer(player.id, 'name', event.target.value)}
                        onFocus={(event) => event.currentTarget.select()}
                        onClick={(event) => event.currentTarget.select()}
                        placeholder={content.calculator.playerLabel(index)}
                      />
                    </div>
                    <div className="player-field">
                      <input
                        type="number"
                        ref={(node) => {
                          cardInputRefs.current[index] = node
                        }}
                        aria-label={content.calculator.cardsLeftAria(getPlayerLabel(player.name, index))}
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
                <h2>{content.calculator.settings}</h2>
                  <p className="section-copy settings-summary">
                    {content.calculator.settingsSummary(
                      settings.valuePerCard,
                      settings.unitLabel,
                      settings.penaltyThreshold,
                      settings.penaltyMultiplier,
                    )}
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
                      <span>{content.calculator.valuePerCard}</span>
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
                      <span>{content.calculator.unitLabel}</span>
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
                      <span>{content.calculator.penaltyThreshold}</span>
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
                      <span>{content.calculator.penaltyMultiplier}</span>
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
                    {content.calculator.multiplierCopyPrefix}
                    <strong>{content.calculator.multiplierCopyStrong}</strong>
                    {content.calculator.multiplierCopySuffix}
                  </p>
                </>
              ) : null}
            </section>

            <section className="action-row">
              <button className="primary-button" onClick={handleCalculate}>
                {content.calculator.calculate}
              </button>
              <button className="ghost-button" onClick={handleReset}>
                {content.calculator.reset}
              </button>
            </section>

            {errors.length > 0 ? (
              <section className="card error-card" aria-live="polite">
                <h2>{content.calculator.checkInputs}</h2>
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
                    <h2>{content.calculator.pairwiseSettlements}</h2>
                    <span className="pill">{content.calculator.differenceBased}</span>
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
                            <span>{content.calculator.owes}</span>
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
                    <h2>{content.calculator.netTotals}</h2>
                    <div className="results-actions">
                      <button className="pill-button" onClick={handleCopyResults}>
                        {content.calculator.copyResults}
                      </button>
                      <button className="pill-button primary-pill-button" onClick={handleSaveResults}>
                        {content.calculator.saveResults}
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
                <h2>{content.calculator.savedTotals}</h2>
                <span className="pill">{showHistory ? content.handChecker.hide : content.handChecker.show}</span>
              </button>
              {showHistory ? (
                <div className="history-stack">
                  <div className="history-header-row">
                    <p className="section-copy history-summary">
                      {content.calculator.runningTotalsCopy}
                    </p>
                    <button className="ghost-button history-reset-button" onClick={handleResetSavedResults}>
                      {content.calculator.resetAll}
                    </button>
                  </div>

                  {runningTotals.length > 0 ? (
                    <div className="saved-table">
                      <div className="saved-table-head">
                        <span>{content.history.player}</span>
                        <span>{content.history.total}</span>
                      </div>
                      {runningTotals.map((entry) => (
                        <div className="saved-table-row" key={entry.name}>
                          <span>{entry.name}</span>
                          <strong>{formatAmount(entry.total, settings.unitLabel)}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="section-copy">{content.calculator.noSavedRounds}</p>
                  )}

                  {savedRounds.length > 0 ? (
                    <details className="history-details">
                      <summary>{content.calculator.roundHistory}</summary>
                      <div className="history-list">
                        {savedRounds.map((round) => (
                          <article className="history-card" key={round.id}>
                            <div className="history-card-header">
                              <div className="history-card-meta">
                                <strong>{new Date(round.savedAt).toLocaleString()}</strong>
                                <span>
                                  {content.calculator.settingsSummary(
                                    round.valuePerCard,
                                    round.unitLabel,
                                    round.penaltyThreshold,
                                    round.penaltyMultiplier,
                                  )}
                                </span>
                              </div>
                              <button
                                className="history-delete-button"
                                onClick={() => handleDeleteSavedRound(round.id)}
                              >
                                {content.calculator.delete}
                              </button>
                            </div>
                            <div className="history-round-table">
                              {round.players.map((player) => (
                                <div className="history-round-row" key={`${round.id}-${player.name}`}>
                                  <span>
                                    {player.name} · {player.cardsLeft} {content.calculator.cardsLeftSuffix}
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
