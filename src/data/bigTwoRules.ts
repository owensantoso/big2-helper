export const suitOrder = ['♦ Diamonds', '♣ Clubs', '♥ Hearts', '♠ Spades']

export const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']

export const comboRanking = [
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
]

export type ComboInfo = {
  id: string
  name: string
  summary: string
  validExample: string
  invalidExample: string
  tieBreak: string
  beats: string
  detail: string
  exampleCards: string[]
}

// This app documents one explicit Big Two ruleset for teaching purposes.
// In this ruleset, 2 is the highest rank and is not used in straights.
export const comboDetails: ComboInfo[] = [
  {
    id: 'straight',
    name: 'Straight',
    summary: 'Five consecutive ranks. Suits can be mixed.',
    detail: 'Compare the highest card first. If the highest rank ties, compare the suit of that highest card. In this MVP ruleset, 2 cannot be used in a straight.',
    validExample: '4♦ 5♣ 6♥ 7♠ 8♦',
    invalidExample: '10♦ J♣ Q♥ K♠ 2♦',
    tieBreak: 'Highest card wins; if tied, use the suit of that highest card.',
    beats: 'A higher straight, plus any flush, full house, four of a kind, or straight flush.',
    exampleCards: ['4D', '5C', '6H', '7S', '8D'],
  },
  {
    id: 'flush',
    name: 'Flush',
    summary: 'Five cards of the same suit.',
    detail: 'Flushes compare suit first in this ruleset. If both flushes are the same suit, compare the highest card, then continue downward only if needed.',
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
    detail: 'This is the highest 5-card category in the app. Compare by highest card, then the suit of that highest card if needed.',
    validExample: '5♥ 6♥ 7♥ 8♥ 9♥',
    invalidExample: '6♣ 7♣ 8♣ 9♣ J♣',
    tieBreak: 'Highest card wins; if tied, compare the suit of that highest card.',
    beats: 'Only a higher straight flush.',
    exampleCards: ['5H', '6H', '7H', '8H', '9H'],
  },
]
