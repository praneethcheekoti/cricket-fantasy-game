'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trophy, ArrowLeft, Calendar, TrendingUp, Clock, CheckCircle2, Loader2, Activity, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

export default function MatchCenterPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [tournament, setTournament] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMatchData()
  }, [params.id])

  const fetchMatchData = async () => {
    try {
      // Fetch tournament details
      const tournamentRes = await api.tournaments.getById(params.id as string)
      const tournamentData = tournamentRes.data
      setTournament(tournamentData)

      // Fetch matches from the series
      if (tournamentData.series?.apiSeriesId) {
        const matchesRes = await api.matches.getSeriesMatches(tournamentData.series.apiSeriesId)
        const matchesData = matchesRes.data || []
        
        // Add mock scores for demonstration
        const matchesWithScores = matchesData.map((match: any, index: number) => ({
          ...match,
          // Mock data: First match completed, second match live, rest upcoming
          status: index === 0 ? 'completed' : index === 1 ? 'live' : 'upcoming',
          team1Score: index === 0 ? '250/10 (50 overs)' : index === 1 ? '150/3 (25.4 overs)' : null,
          team2Score: index === 0 ? '200/10 (45.2 overs)' : index === 1 ? 'Yet to bat' : null,
          result: index === 0 ? `${match.team1} won by 50 runs` : null,
        }))
        
        setMatches(matchesWithScores)
        
        if (matchesWithScores.length > 0) {
          setSelectedMatch(matchesWithScores[0])
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch match data:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load matches',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMatchSelect = (match: any) => {
    setSelectedMatch(match)
  }

  const getMatchStatus = (match: any) => {
    if (match.status === 'completed') return { icon: CheckCircle2, color: 'text-game-success', bg: 'bg-game-success/10', label: 'Completed' }
    if (match.status === 'live') return { icon: Activity, color: 'text-game-danger', bg: 'bg-game-danger/10 animate-pulse', label: 'LIVE' }
    return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/10', label: 'Upcoming' }
  }

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Cricket Fantasy
            </h1>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/tournament/${params.id}/lobby`}>
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournament
            </Button>
          </Link>

          <Link href={`/tournament/${params.id}/leaderboard`}>
            <Button variant="outline" className="border-purple-500/50">
              <Trophy className="mr-2 h-4 w-4 text-purple-500" />
              View Leaderboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Calendar className="h-10 w-10 text-primary" />
            Match Center
          </h2>
          <p className="text-muted-foreground text-lg mb-1">{tournament?.name}</p>
          {tournament?.series && (
            <p className="text-sm text-muted-foreground">
              {tournament.series.name} • {tournament.series.format} • {tournament.series.gender}
            </p>
          )}
        </div>

        {matches.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-20 w-20 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-bold mb-2">No Matches Scheduled</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Matches for this tournament will appear here once they are scheduled in the series
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Matches List */}
            <div className="lg:col-span-1">
              <Card className="border-2 sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">Matches</CardTitle>
                  <CardDescription>{matches.length} matches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {matches.map((match: any) => {
                    const status = getMatchStatus(match)
                    const StatusIcon = status.icon
                    
                    return (
                      <button
                        key={match.id}
                        onClick={() => handleMatchSelect(match)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          selectedMatch?.id === match.id
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border hover:border-primary/20 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-semibold text-sm">Match {match.matchNumber}</p>
                          <Badge className={`${status.bg} ${status.color} border-0 text-xs px-2 py-0`}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{match.team1} vs {match.team2}</p>
                        <p className="text-xs text-muted-foreground">{formatMatchDate(match.matchDate)}</p>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Match Details */}
          <div className="lg:col-span-3 space-y-6">
            {selectedMatch ? (
              <>
                {/* Match Details Card */}
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-2xl">Match {selectedMatch.matchNumber}</CardTitle>
                          <Badge className={`${getMatchStatus(selectedMatch).bg} ${getMatchStatus(selectedMatch).color} border-0 text-base px-4 py-2`}>
                            {getMatchStatus(selectedMatch).label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{selectedMatch.venue}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">{formatMatchDate(selectedMatch.matchDate)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedMatch.status === 'upcoming' ? (
                      <div className="text-center py-12">
                        <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-xl font-semibold mb-2">Match Scheduled</p>
                        <p className="text-muted-foreground">
                          {selectedMatch.team1} vs {selectedMatch.team2}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Starts: {formatMatchDate(selectedMatch.matchDate)}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                          <div className="p-6 rounded-xl bg-primary/5 border-2 border-primary/20">
                            <p className="text-sm text-muted-foreground mb-2">{selectedMatch.team1}</p>
                            <p className="text-4xl font-bold text-primary">{selectedMatch.team1Score || 'TBD'}</p>
                          </div>
                          <div className="p-6 rounded-xl bg-secondary/5 border-2 border-secondary/20">
                            <p className="text-sm text-muted-foreground mb-2">{selectedMatch.team2}</p>
                            <p className="text-4xl font-bold text-secondary">{selectedMatch.team2Score || 'TBD'}</p>
                          </div>
                        </div>
                        {selectedMatch.result && (
                          <div className="p-4 rounded-lg bg-game-success/10 border-2 border-game-success/20 text-center">
                            <p className="font-bold text-game-success text-lg">{selectedMatch.result}</p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Info Card - Scores coming after match */}
                {(selectedMatch.status === 'upcoming' || selectedMatch.status === 'live') && (
                  <Card className="border-2 border-accent/20">
                    <CardContent className="py-12 text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-accent" />
                      <h3 className="text-xl font-bold mb-2">Fantasy Points</h3>
                      <p className="text-muted-foreground">
                        {selectedMatch.status === 'live' 
                          ? 'Fantasy points will be calculated after the match is completed'
                          : 'Fantasy points will be calculated based on player performance in this match'
                        }
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Match Leaderboard - Show for completed matches */}
                {selectedMatch.status === 'completed' && (
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-primary" />
                        Match Leaderboard
                      </CardTitle>
                      <CardDescription>Fantasy points for this match (Feature coming soon)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Player performance and fantasy points calculation will be available once match scoring is integrated
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-xl font-semibold text-muted-foreground">
                    Select a match to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
