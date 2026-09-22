export type TournamentType =
  | "single_elimination"
  | "double_elimination"
  | "round_robin"
  | "swiss"
  | "free_for_all"
  | "leaderboard"

export type GameStatus =
  | "open"
  | "full"
  | "drafted"
  | "completed"
  | "archived"

export type MatchStatus = "pending" | "ready" | "complete" | "bye"

export interface SeededParticipant {
  userId: string
  seed: number
  fullName?: string
}

export interface TournamentMatch {
  id: string
  round: number
  slot: number
  participantAId: string | null
  participantBId: string | null
  winnerId: string | null
  status: MatchStatus
  nextMatchId: string | null
  nextSlot: "a" | "b" | null
}

export interface MatchResult {
  matchId: string
  winnerId: string
}

export interface TournamentStanding {
  userId: string
  seed: number
  rank: number | null
  eliminated: boolean
}

export interface BracketRound {
  round: number
  matches: TournamentMatch[]
}

export interface BracketDisplayData {
  rounds: BracketRound[]
  championId: string | null
}

export interface TournamentFormat<TState, TDisplay> {
  initialize(participants: SeededParticipant[]): TState
  recordResult(state: TState, result: MatchResult): TState
  getStandings(state: TState): TournamentStanding[]
  isComplete(state: TState): boolean
  getDisplayData(state: TState): TDisplay
}

