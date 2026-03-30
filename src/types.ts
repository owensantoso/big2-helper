export type TabId = 'cheat-sheet' | 'calculator'

export type Player = {
  id: string
  name: string
  cardsLeft: number | ''
}

export type CalculatorSettings = {
  valuePerCard: number
  unitLabel: string
  penaltyThreshold: number
  penaltyMultiplier: number
}

export type PairwisePayment = {
  fromPlayerId: string
  toPlayerId: string
  cardDifference: number
  multiplierApplied: number
  amount: number
}

export type NetResult = {
  playerId: string
  netAmount: number
}

export type CalculationResult = {
  pairwisePayments: PairwisePayment[]
  netResults: NetResult[]
}
