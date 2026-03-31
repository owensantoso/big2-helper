import type { ComboInfo } from '../data/bigTwoRules'

export const suitOrder = ['♦ Diamonds', '♣ Clubs', '♥ Hearts', '♠ Spades']

export const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']

export const comboRanking = [
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
]

export const comboDetails: ComboInfo[] = [
  {
    id: 'straight',
    name: 'Straight',
    summary: 'Five consecutive ranks. Suits can be mixed.',
    detail:
      'Compare the highest card first. If the highest rank ties, compare the suit of that highest card. In this MVP ruleset, 2 cannot be used in a straight.',
    validExample: '4♦ 5♣ 6♥ 7♠ 8♦',
    invalidExample: '10♦ J♣ Q♥ K♠ 2♦',
    tieBreak: 'Highest card wins; if tied, use the suit of that highest card.',
    beats:
      'A higher straight, plus any flush, full house, four of a kind, or straight flush.',
    exampleCards: ['4D', '5C', '6H', '7S', '8D'],
  },
  {
    id: 'flush',
    name: 'Flush',
    summary: 'Five cards of the same suit.',
    detail:
      'Flushes compare suit first in this ruleset. If both flushes are the same suit, compare the highest card, then continue downward only if needed.',
    validExample: '3♠ 6♠ 8♠ J♠ A♠',
    invalidExample: '4♥ 7♥ 9♥ Q♦ A♥',
    tieBreak: 'Higher suit wins first; if same suit, compare highest card.',
    beats: 'A higher flush, plus any full house, four of a kind, or straight flush.',
    exampleCards: ['3S', '6S', '8S', 'JS', 'AS'],
  },
  {
    id: 'full-house',
    name: 'Full House',
    summary: 'Three of one rank plus two of another rank.',
    detail: 'Only the rank of the three-of-a-kind part matters when comparing full houses.',
    validExample: '9♦ 9♣ 9♠ K♥ K♣',
    invalidExample: '5♦ 5♣ 8♥ 8♠ A♦',
    tieBreak: 'Compare the triple rank only.',
    beats: 'A higher full house, plus any four of a kind or straight flush.',
    exampleCards: ['9D', '9C', '9S', 'KH', 'KC'],
  },
  {
    id: 'four-of-a-kind',
    name: 'Four of a Kind',
    summary: 'Four cards of the same rank plus one extra card.',
    detail: 'The kicker does not affect the ranking. Only the four matching cards matter.',
    validExample: 'Q♦ Q♣ Q♥ Q♠ 3♦',
    invalidExample: 'J♦ J♣ J♥ 7♠ 7♦',
    tieBreak: 'Compare the rank of the four matching cards.',
    beats: 'A higher four of a kind, or any straight flush.',
    exampleCards: ['QD', 'QC', 'QH', 'QS', '3D'],
  },
  {
    id: 'straight-flush',
    name: 'Straight Flush',
    summary: 'A straight where all five cards share the same suit.',
    detail:
      'This is the highest 5-card category in the app. Compare by highest card, then the suit of that highest card if needed.',
    validExample: '5♥ 6♥ 7♥ 8♥ 9♥',
    invalidExample: '6♣ 7♣ 8♣ 9♣ J♣',
    tieBreak: 'Highest card wins; if tied, compare the suit of that highest card.',
    beats: 'Only a higher straight flush.',
    exampleCards: ['5H', '6H', '7H', '8H', '9H'],
  },
]

export const content = {
  hero: {
    eyebrow: 'Big 2 Helper',
    title: 'Big 2 Helper',
    cantonese: '鋤大D',
    cantoneseRuby: 'co2 daai6 di2',
    mandarin: '大老二',
    mandarinRuby: 'da lao er',
  },
  tabs: {
    cheatSheet: 'Cheat Sheet',
    calculator: 'Calculator',
  },
  language: {
    label: 'Language',
    en: 'English',
    ja: '日本語',
  },
  summary: {
    suitOrder: 'Suit order',
    rankOrder: 'Rank order',
    ascending: 'Ascending',
    rankHint: '3 low, 2 high',
    validPlays: 'Valid plays',
    quickGuide: 'Quick guide',
    comboRanking: '5-card combo ranking',
    lowestToHighest: 'Lowest to highest',
    handChecker: 'Is this a hand?',
    pickFive: 'Pick 5 cards',
  },
  validPlays: {
    singles: 'Singles',
    singlesCopy: 'Play 1 card.',
    singlesExample: 'Example: A♠',
    doubles: 'Doubles',
    doublesCopy: 'Play 2 cards of the same rank.',
    doublesExample: 'Example: 9♦ 9♣',
    triples: 'Triples',
    triplesCopy: 'Play 3 cards of the same rank.',
    triplesExample: 'Example: Q♦ Q♣ Q♥',
    invalidNotePrefix: 'Unlike poker, ',
    invalidNoteStrong: 'two pair is not a valid play',
    invalidNoteSuffix: ' in this helper\'s ruleset.',
  },
  handChecker: {
    show: 'Show',
    hide: 'Hide',
    clear: 'Clear',
    intro: 'Select exactly 5 cards. The result updates immediately when you hit 5.',
    helper: 'Suits stay grouped together, with the rank order running from 3 down to 2.',
    selectedCount: (count: number) => `${count}/5 selected`,
    waitingMessage: (count: number) => `Select 5 cards to check. (${count}/5 selected)`,
    invalidHand: 'Not a valid 5-card hand in this ruleset.',
  },
  comboDetails: {
    exampleHand: 'Example hand:',
    validExample: 'Valid example',
    invalidExample: 'Invalid example',
    tieBreak: 'Tie-break',
    beatenBy: 'Beaten by',
  },
  rules: {
    title: 'How a round works',
    show: 'Show',
    hide: 'Hide',
    items: [
      'Players try to get rid of all their cards.',
      'Higher valid plays beat lower valid plays.',
      'Passing is allowed.',
      'The round ends when one player has no cards left.',
      'Settlement is based on the cards each player still holds.',
    ],
  },
  calculator: {
    players: 'Players',
    winnerCopyPrefix: 'The winner is the one player with ',
    winnerCopyStrong: '0 cards left',
    winnerCopySuffix: '.',
    name: 'Name',
    cardsLeft: 'Cards left',
    playerLabel: (index: number) => `Player ${index + 1}`,
    playerNameAria: (index: number) => `Player ${index + 1} name`,
    cardsLeftAria: (name: string) => `${name} cards left`,
    settings: 'Settings',
    settingsSummary: (valuePerCard: number, unitLabel: string, threshold: number, multiplier: number) =>
      `${valuePerCard} ${unitLabel || 'points'} per card, threshold ${threshold}, multiplier ${multiplier}`,
    valuePerCard: 'Value per card',
    unitLabel: 'Unit label',
    penaltyThreshold: 'Penalty threshold',
    penaltyMultiplier: 'Penalty multiplier',
    multiplierCopyPrefix:
      'If a payer has cards left greater than or equal to the threshold, the multiplier applies to ',
    multiplierCopyStrong: 'every pairwise payment they make',
    multiplierCopySuffix: '.',
    calculate: 'Calculate settlement',
    reset: 'Reset example',
    checkInputs: 'Check these inputs',
    pairwiseSettlements: 'Pairwise settlements',
    differenceBased: 'Difference-based',
    owes: 'owes',
    netTotals: 'Net totals',
    copyResults: 'Copy results',
    saveResults: 'Save results',
    savedTotals: 'Saved totals',
    runningTotalsCopy:
      'Running totals are grouped by the saved player names from each round.',
    resetAll: 'Reset all',
    noSavedRounds: 'No saved rounds yet.',
    roundHistory: 'Round history',
    delete: 'Delete',
    cardsLeftSuffix: 'cards left',
  },
  feedback: {
    copied: 'Results copied.',
    copyFailed: 'Clipboard copy failed.',
    saved: 'Results saved.',
  },
  confirmations: {
    resetHistory: 'Reset all saved totals and round history?',
    deleteRound: 'Delete this saved round from history and totals?',
  },
  history: {
    player: 'Player',
    total: 'Total',
  },
  misc: {
    bigTwoSettlement: 'Big Two settlement',
    pairwise: 'Pairwise:',
    net: 'Net:',
  },
  units: [
    { label: 'Yen (¥)', value: '¥' },
    { label: 'Points', value: 'points' },
    { label: 'Dollar ($)', value: '$' },
    { label: 'Pound (£)', value: '£' },
  ],
  handCheckerSuits: [
    { symbol: '♦', tone: 'red' as const, label: 'Diamonds' },
    { symbol: '♣', tone: 'black' as const, label: 'Clubs' },
    { symbol: '♥', tone: 'red' as const, label: 'Hearts' },
    { symbol: '♠', tone: 'black' as const, label: 'Spades' },
  ],
} as const

export type AppContent = typeof content
