import { randomUUID } from "node:crypto"

import type {
  BracketDisplayData,
  MatchResult,
  SeededParticipant,
  TournamentFormat,
  TournamentMatch,
  TournamentStanding,
} from "./types"

export interface SingleEliminationState {
  participants: SeededParticipant[]
  matches: TournamentMatch[]
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(value))
}

function bracketSeedOrder(size: number): number[] {
  let seeds = [1, 2]
  for (let currentSize = 4; currentSize <= size; currentSize *= 2) {
    seeds = seeds.flatMap((seed) => [seed, currentSize + 1 - seed])
  }
  return seeds
}

export class SingleEliminationFormat
  implements TournamentFormat<SingleEliminationState, BracketDisplayData>
{
  constructor(private readonly createId: () => string = randomUUID) {}

  initialize(participants: SeededParticipant[]): SingleEliminationState {
    if (participants.length < 2) {
      throw new Error("Single elimination requires at least two participants")
    }

    const normalized = participants.toSorted((a, b) => a.seed - b.seed)
    const seeds = new Set(normalized.map((participant) => participant.seed))
    if (seeds.size !== normalized.length || normalized.some((item, index) => item.seed !== index + 1)) {
      throw new Error("Participants must have unique, contiguous one-based seeds")
    }

    const bracketSize = nextPowerOfTwo(normalized.length)
    const roundCount = Math.log2(bracketSize)
    const matches: TournamentMatch[] = []

    for (let round = 1; round <= roundCount; round += 1) {
      const matchCount = bracketSize / 2 ** round
      for (let slot = 1; slot <= matchCount; slot += 1) {
        matches.push({
          id: this.createId(),
          round,
          slot,
          participantAId: null,
          participantBId: null,
          winnerId: null,
          status: "pending",
          nextMatchId: null,
          nextSlot: null,
        })
      }
    }

    const matchByRoundSlot = new Map(
      matches.map((match) => [`${match.round}:${match.slot}`, match]),
    )

    for (const match of matches) {
      if (match.round < roundCount) {
        const next = matchByRoundSlot.get(
          `${match.round + 1}:${Math.ceil(match.slot / 2)}`,
        )!
        match.nextMatchId = next.id
        match.nextSlot = match.slot % 2 === 1 ? "a" : "b"
      }
    }

    const participantBySeed = new Map(
      normalized.map((participant) => [participant.seed, participant]),
    )
    const placement = bracketSeedOrder(bracketSize)

    for (let index = 0; index < placement.length; index += 2) {
      const match = matchByRoundSlot.get(`1:${index / 2 + 1}`)!
      match.participantAId = participantBySeed.get(placement[index])?.userId ?? null
      match.participantBId = participantBySeed.get(placement[index + 1])?.userId ?? null

      if (match.participantAId && match.participantBId) {
        match.status = "ready"
      } else {
        match.status = "bye"
        match.winnerId = match.participantAId ?? match.participantBId
      }
    }

    for (let round = 1; round < roundCount; round += 1) {
      for (const match of matches.filter((candidate) => candidate.round === round)) {
        if (!match.winnerId || !match.nextMatchId || !match.nextSlot) continue
        const next = matches.find((candidate) => candidate.id === match.nextMatchId)!
        if (match.nextSlot === "a") next.participantAId = match.winnerId
        else next.participantBId = match.winnerId
      }

      for (const match of matches.filter((candidate) => candidate.round === round + 1)) {
        if (match.participantAId && match.participantBId) match.status = "ready"
      }
    }

    return { participants: normalized, matches }
  }

  recordResult(
    state: SingleEliminationState,
    result: MatchResult,
  ): SingleEliminationState {
    const matches = state.matches.map((match) => ({ ...match }))
    const match = matches.find((candidate) => candidate.id === result.matchId)
    if (!match) throw new Error("Match not found")
    if (match.status === "complete" && match.winnerId === result.winnerId) {
      return { participants: state.participants, matches }
    }
    if (match.status !== "ready") throw new Error("Match is not ready")
    if (![match.participantAId, match.participantBId].includes(result.winnerId)) {
      throw new Error("Winner must be a participant in the match")
    }

    match.winnerId = result.winnerId
    match.status = "complete"

    if (match.nextMatchId && match.nextSlot) {
      const next = matches.find((candidate) => candidate.id === match.nextMatchId)!
      if (match.nextSlot === "a") next.participantAId = result.winnerId
      else next.participantBId = result.winnerId
      if (next.participantAId && next.participantBId) next.status = "ready"
    }

    return { participants: state.participants, matches }
  }

  getStandings(state: SingleEliminationState): TournamentStanding[] {
    const final = state.matches.find(
      (match) => match.nextMatchId === null && match.status === "complete",
    )
    const eliminated = new Set(
      state.matches
        .filter((match) => match.status === "complete")
        .flatMap((match) => [match.participantAId, match.participantBId])
        .filter((userId): userId is string => Boolean(userId))
        .filter((userId) => userId !== final?.winnerId),
    )

    return state.participants.map((participant) => ({
      userId: participant.userId,
      seed: participant.seed,
      rank: participant.userId === final?.winnerId ? 1 : null,
      eliminated: eliminated.has(participant.userId),
    }))
  }

  isComplete(state: SingleEliminationState): boolean {
    return state.matches.some(
      (match) => match.nextMatchId === null && match.status === "complete",
    )
  }

  getDisplayData(state: SingleEliminationState): BracketDisplayData {
    const rounds = Array.from(new Set(state.matches.map((match) => match.round)))
      .toSorted((a, b) => a - b)
      .map((round) => ({
        round,
        matches: state.matches
          .filter((match) => match.round === round)
          .toSorted((a, b) => a.slot - b.slot),
      }))
    const final = state.matches.find((match) => match.nextMatchId === null)

    return {
      rounds,
      championId: final?.status === "complete" ? final.winnerId : null,
    }
  }
}

export const singleEliminationFormat = new SingleEliminationFormat()

