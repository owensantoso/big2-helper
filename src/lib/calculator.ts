import type { CalculationResult, CalculatorSettings, PairwisePayment, Player } from '../types'

export function validatePlayers(players: Player[]): string[] {
  const errors: string[] = []

  if (players.length < 2) {
    errors.push('Add at least 2 players.')
  }

  if (players.length > 4) {
    errors.push('A maximum of 4 players is supported.')
  }

  const winnerCount = players.filter((player) => player.cardsLeft === 0).length

  players.forEach((player, index) => {
    const fallbackName = player.name.trim() || `Player ${index + 1}`

    if (player.cardsLeft === '') {
      return
    }

    if (!Number.isFinite(player.cardsLeft)) {
      errors.push(`${fallbackName} has an invalid cards-left value.`)
      return
    }

    if (player.cardsLeft < 0) {
      errors.push(`${fallbackName} cannot have negative cards left.`)
    }
  })

  if (winnerCount === 0) {
    errors.push('Exactly one player must have 0 cards left to mark the winner.')
  }

  if (winnerCount > 1) {
    errors.push('Only one player can have 0 cards left.')
  }

  return errors
}

export function validateSettings(settings: CalculatorSettings): string[] {
  const errors: string[] = []

  if (!Number.isFinite(settings.valuePerCard) || settings.valuePerCard <= 0) {
    errors.push('Value per card must be a positive number.')
  }

  if (!Number.isFinite(settings.penaltyThreshold) || settings.penaltyThreshold < 0) {
    errors.push('Penalty threshold must be 0 or greater.')
  }

  if (!Number.isFinite(settings.penaltyMultiplier) || settings.penaltyMultiplier < 1) {
    errors.push('Penalty multiplier must be at least 1.')
  }

  return errors
}

export function calculateSettlements(
  players: Player[],
  settings: CalculatorSettings,
): CalculationResult {
  const pairwisePayments: PairwisePayment[] = []
  const netByPlayerId = new Map<string, number>()

  players.forEach((player) => {
    netByPlayerId.set(player.id, 0)
  })

  for (let i = 0; i < players.length - 1; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const first = players[i]
      const second = players[j]

      if (first.cardsLeft === second.cardsLeft) {
        continue
      }

      const payer = first.cardsLeft > second.cardsLeft ? first : second
      const receiver = payer.id === first.id ? second : first
      const difference = Math.abs(Number(first.cardsLeft) - Number(second.cardsLeft))
      const multiplierApplied =
        Number(payer.cardsLeft) >= settings.penaltyThreshold ? settings.penaltyMultiplier : 1
      const amount = difference * settings.valuePerCard * multiplierApplied

      pairwisePayments.push({
        fromPlayerId: payer.id,
        toPlayerId: receiver.id,
        cardDifference: difference,
        multiplierApplied,
        amount,
      })

      netByPlayerId.set(payer.id, (netByPlayerId.get(payer.id) ?? 0) - amount)
      netByPlayerId.set(receiver.id, (netByPlayerId.get(receiver.id) ?? 0) + amount)
    }
  }

  return {
    pairwisePayments,
    netResults: players.map((player) => ({
      playerId: player.id,
      netAmount: netByPlayerId.get(player.id) ?? 0,
    })),
  }
}
