import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { WinnerButton } from "@/components/winner-button"
import { cn } from "@/lib/utils"
import type { TournamentMatch } from "@/lib/tournament/types"

function roundName(round: number, total: number) {
  if (round === total) return "Final"
  if (round === total - 1) return "Semi-finals"
  return `Round ${round}`
}

export function Bracket({ gameId, matches, names, avatars, currentUserId, canManage }: { gameId: string; matches: TournamentMatch[]; names: Record<string, string>; avatars: Record<string, string | null>; currentUserId: string; canManage: boolean }) {
  const roundNumbers = [...new Set(matches.map((match) => match.round))].toSorted((a, b) => a - b)

  return (
    <ScrollArea className="w-full pb-4">
      <div className="flex min-w-max items-stretch gap-4">
        {roundNumbers.map((round) => (
          <section key={round} className="flex w-72 flex-col gap-3" aria-labelledby={`round-${round}`}>
            <h3 id={`round-${round}`} className="text-sm font-medium text-muted-foreground">{roundName(round, roundNumbers.length)}</h3>
            <div className="flex flex-1 flex-col justify-around gap-4">
              {matches.filter((match) => match.round === round).toSorted((a, b) => a.slot - b.slot).map((match) => {
                const participants = [match.participantAId, match.participantBId]
                return (
                  <Card key={match.id} size="sm">
                    <CardHeader>
                      <CardTitle>Match {match.slot}</CardTitle>
                      <CardDescription><Badge variant="outline">{match.status}</Badge></CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      {participants.map((participantId, index) => (
                        <div key={participantId ?? `empty-${index}`} className={cn("flex min-h-8 items-center justify-between gap-2 rounded-lg px-2", participantId === currentUserId && "bg-muted")}>
                          <span className="flex min-w-0 items-center gap-2">
                            {participantId ? (
                              <Avatar size="sm">
                                <AvatarImage src={avatars[participantId] ?? undefined} alt="" />
                                <AvatarFallback>{(names[participantId] ?? "P").slice(0, 1).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            ) : null}
                            <span className="truncate">{participantId ? names[participantId] ?? "Player" : "TBD"}</span>
                          </span>
                          {participantId && match.winnerId === participantId ? <Badge>Winner</Badge> : null}
                        </div>
                      ))}
                      {canManage && match.status === "ready" ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {[match.participantAId, match.participantBId].filter((id): id is string => Boolean(id)).map((id) => (
                            <WinnerButton key={id} gameId={gameId} matchId={match.id} winnerId={id} winnerName={names[id] ?? "Player"} />
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
