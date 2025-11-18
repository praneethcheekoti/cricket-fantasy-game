'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, TrendingUp, Users, Star, ChevronDown, ChevronUp, Award, Target, Circle } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function LeaderboardPage() {
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string

  const [tournament, setTournament] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [leaderboardData, setLeaderboardData] = useState<any>(null)
  const [matchLeaderboardData, setMatchLeaderboardData] = useState<any>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  // Fetch tournament details and overall leaderboard
  useEffect(() => {
    fetchTournamentAndLeaderboard()
  }, [tournamentId])

  // Fetch match-wise leaderboard when match is selected
  useEffect(() => {
    if (selectedMatchId) {
      fetchMatchLeaderboard(selectedMatchId)
    }
  }, [selectedMatchId])

  const fetchTournamentAndLeaderboard = async () => {
    try {
      setIsLoading(true)

      // Get current user ID from token
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setCurrentUserId(payload.userId)
      }

      // Fetch tournament details
      const tournamentRes = await api.tournaments.getById(tournamentId)
      setTournament(tournamentRes.data)

      // Fetch matches for this series
      if (tournamentRes.data.series?.apiSeriesId) {
        try {
          const matchesRes = await api.matches.getSeriesMatches(tournamentRes.data.series.apiSeriesId)
          setMatches(matchesRes.data || [])
          
          // Set first match as default if available
          if (matchesRes.data && matchesRes.data.length > 0) {
            setSelectedMatchId(matchesRes.data[0].apiMatchId)
          }
        } catch (matchError) {
          console.log('No matches available yet')
          setMatches([])
        }
      }

      // Fetch overall leaderboard
      const leaderboardRes = await api.tournaments.getLeaderboard(tournamentId)
      setLeaderboardData(leaderboardRes.data)
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load leaderboard',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMatchLeaderboard = async (matchId: string) => {
    try {
      const res = await api.tournaments.getLeaderboard(tournamentId, matchId)
      setMatchLeaderboardData(res.data)
    } catch (error: any) {
      console.error('Error fetching match leaderboard:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load match leaderboard',
        variant: 'destructive',
      })
    }
  }

  const toggleTeamExpansion = (teamId: string) => {
    const newExpanded = new Set(expandedTeams)
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId)
    } else {
      newExpanded.add(teamId)
    }
    setExpandedTeams(newExpanded)
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: '🏆', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50' }
    if (rank === 2) return { icon: '🥈', color: 'bg-slate-400/20 text-slate-700 border-slate-400/50' }
    if (rank === 3) return { icon: '🥉', color: 'bg-amber-600/20 text-amber-800 border-amber-600/50' }
    return { icon: `${rank}`, color: 'bg-muted text-muted-foreground' }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
    return `₹${amount.toLocaleString()}`
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Batsman': return '🏏'
      case 'Bowler': return '⚾'
      case 'All-Rounder': return '🎯'
      case 'Wicket-Keeper': return '🧤'
      default: return '👤'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 animate-bounce text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (!leaderboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Leaderboard not available</p>
            <Button className="w-full mt-4" onClick={() => router.push(`/tournament/${tournamentId}/lobby`)}>
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentUserTeam = leaderboardData.leaderboard.find((team: any) => team.ownerId === currentUserId)
  const leader = leaderboardData.leaderboard[0]
  const pointsBehindLeader = currentUserTeam ? leader.totalPoints - currentUserTeam.totalPoints : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/tournament/${tournamentId}/lobby`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lobby
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="h-8 w-8 text-primary" />
                Leaderboard
              </h1>
              <p className="text-muted-foreground mt-1">
                {tournament?.name} • {tournament?.series?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {currentUserTeam && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Rank</p>
                    <p className="text-3xl font-bold text-primary">#{currentUserTeam.rank}</p>
                  </div>
                  <Target className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Points</p>
                    <p className="text-3xl font-bold">{Math.round(currentUserTeam.totalPoints)}</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Behind Leader</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {pointsBehindLeader > 0 ? pointsBehindLeader : '—'}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Teams</p>
                    <p className="text-3xl font-bold">{leaderboardData.leaderboard.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs for Overall and Match-wise */}
        <Tabs defaultValue="overall" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overall">Overall Standings</TabsTrigger>
            <TabsTrigger value="match-wise">Match-wise</TabsTrigger>
          </TabsList>

          {/* OVERALL STANDINGS TAB */}
          <TabsContent value="overall" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Standings</CardTitle>
                <CardDescription>
                  Cumulative points across {leaderboardData.completedMatches} match(es)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboardData.leaderboard.map((team: any) => {
                    const rankBadge = getRankBadge(team.rank)
                    const isCurrentUser = team.ownerId === currentUserId
                    const isExpanded = expandedTeams.has(team.teamId)

                    return (
                      <div
                        key={team.teamId}
                        className={`border rounded-lg overflow-hidden transition-all ${
                          isCurrentUser ? 'border-primary bg-primary/5 shadow-md' : 'border-border'
                        } ${team.rank <= 3 ? 'shadow-sm' : ''}`}
                      >
                        {/* Team Header */}
                        <div
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleTeamExpansion(team.teamId)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {/* Rank */}
                            <Badge className={`${rankBadge.color} text-lg font-bold px-3 py-1 min-w-[3rem] text-center`}>
                              {rankBadge.icon}
                            </Badge>

                            {/* Team Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">{team.teamName}</h3>
                                {isCurrentUser && (
                                  <Badge variant="secondary" className="text-xs">YOU</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {team.ownerName} • {team.playerCount} players
                              </p>
                            </div>

                            {/* Points */}
                            <div className="text-right">
                              <p className="text-2xl font-bold text-primary">{Math.round(team.totalPoints)}</p>
                              <p className="text-xs text-muted-foreground">points</p>
                            </div>

                            {/* Expand Icon */}
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Player Breakdown */}
                        {isExpanded && (
                          <div className="border-t bg-muted/20 p-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Player Breakdown
                            </h4>
                            <div className="space-y-2">
                              {team.players.map((player: any) => {
                                const totalPlayerPoints = player.matchScores.reduce(
                                  (sum: number, ms: any) => sum + ms.points.finalPoints,
                                  0
                                )

                                return (
                                  <div key={player.playerId} className="bg-background rounded-lg p-3 border">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="text-2xl">{getRoleIcon(player.role)}</span>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="font-semibold">{player.playerName}</p>
                                            {player.isCaptain && (
                                              <Badge variant="default" className="text-xs">
                                                <Star className="h-3 w-3 mr-1" />C (2x)
                                              </Badge>
                                            )}
                                            {player.isViceCaptain && (
                                              <Badge variant="secondary" className="text-xs">
                                                <Star className="h-3 w-3 mr-1" />VC (1.5x)
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground">{player.role}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-lg">{Math.round(totalPlayerPoints)}</p>
                                        <p className="text-xs text-muted-foreground">pts</p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MATCH-WISE TAB */}
          <TabsContent value="match-wise" className="space-y-4">
            {/* Match Selector */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <label className="font-semibold">Select Match:</label>
                  <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Choose a match" />
                    </SelectTrigger>
                    <SelectContent>
                      {matches.map((match: any, index: number) => (
                        <SelectItem key={match.apiMatchId || match.id} value={match.apiMatchId || match.id}>
                          Match {index + 1}: {match.team1} vs {match.team2}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Match Leaderboard */}
            {matchLeaderboardData && (
              <Card>
                <CardHeader>
                  <CardTitle>Match Leaderboard</CardTitle>
                  <CardDescription>
                    Points for selected match only
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {matchLeaderboardData.leaderboard.map((team: any) => {
                      const rankBadge = getRankBadge(team.rank)
                      const isCurrentUser = team.ownerId === currentUserId
                      const isExpanded = expandedTeams.has(`match-${team.teamId}`)

                      return (
                        <div
                          key={`match-${team.teamId}`}
                          className={`border rounded-lg overflow-hidden transition-all ${
                            isCurrentUser ? 'border-primary bg-primary/5 shadow-md' : 'border-border'
                          } ${team.rank <= 3 ? 'shadow-sm' : ''}`}
                        >
                          {/* Team Header */}
                          <div
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleTeamExpansion(`match-${team.teamId}`)}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              {/* Rank */}
                              <Badge className={`${rankBadge.color} text-lg font-bold px-3 py-1 min-w-[3rem] text-center`}>
                                {rankBadge.icon}
                              </Badge>

                              {/* Team Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-lg">{team.teamName}</h3>
                                  {isCurrentUser && (
                                    <Badge variant="secondary" className="text-xs">YOU</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{team.ownerName}</p>
                              </div>

                              {/* Points */}
                              <div className="text-right">
                                <p className="text-2xl font-bold text-primary">{Math.round(team.totalPoints)}</p>
                                <p className="text-xs text-muted-foreground">match points</p>
                              </div>

                              {/* Expand Icon */}
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Player Breakdown with Detailed Stats */}
                          {isExpanded && (
                            <div className="border-t bg-muted/20 p-4">
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Detailed Player Performance
                              </h4>
                              <div className="space-y-3">
                                {team.players.map((player: any) => {
                                  const matchScore = player.matchScores.find((ms: any) => ms.matchId === selectedMatchId)
                                  if (!matchScore) return null

                                  const stats = matchScore.stats
                                  const points = matchScore.points

                                  return (
                                    <div key={player.playerId} className="bg-background rounded-lg p-4 border">
                                      {/* Player Header */}
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                          <span className="text-3xl">{getRoleIcon(player.role)}</span>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <p className="font-bold text-lg">{player.playerName}</p>
                                              {player.isCaptain && (
                                                <Badge variant="default" className="text-xs">
                                                  <Star className="h-3 w-3 mr-1" />Captain (2x)
                                                </Badge>
                                              )}
                                              {player.isViceCaptain && (
                                                <Badge variant="secondary" className="text-xs">
                                                  <Star className="h-3 w-3 mr-1" />Vice-Captain (1.5x)
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{player.role}</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-2xl font-bold text-primary">
                                            {Math.round(points.finalPoints)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">points</p>
                                        </div>
                                      </div>

                                      {/* Detailed Stats Breakdown */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pt-3 border-t">
                                        {/* Batting */}
                                        {(stats.runs > 0 || stats.ballsFaced > 0) && (
                                          <div className="space-y-1">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase">🏏 Batting</p>
                                            <div className="space-y-1 text-sm">
                                              <div className="flex justify-between">
                                                <span>Runs:</span>
                                                <span className="font-semibold">{stats.runs} <span className="text-xs text-green-600">(+{points.batting.runs})</span></span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>4s:</span>
                                                <span className="font-semibold">{stats.fours} <span className="text-xs text-green-600">(+{points.batting.fours})</span></span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>6s:</span>
                                                <span className="font-semibold">{stats.sixes} <span className="text-xs text-green-600">(+{points.batting.sixes})</span></span>
                                              </div>
                                              {points.batting.milestone !== 0 && (
                                                <div className="flex justify-between">
                                                  <span>Milestone:</span>
                                                  <span className="font-semibold text-green-600">+{points.batting.milestone}</span>
                                                </div>
                                              )}
                                              {points.batting.strikeRateBonus > 0 && (
                                                <div className="flex justify-between">
                                                  <span>SR Bonus:</span>
                                                  <span className="font-semibold text-green-600">+{points.batting.strikeRateBonus}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Bowling */}
                                        {(stats.wickets > 0 || stats.ballsBowled > 0) && (
                                          <div className="space-y-1">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase">⚾ Bowling</p>
                                            <div className="space-y-1 text-sm">
                                              <div className="flex justify-between">
                                                <span>Wickets:</span>
                                                <span className="font-semibold">{stats.wickets} <span className="text-xs text-green-600">(+{points.bowling.wickets})</span></span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Maidens:</span>
                                                <span className="font-semibold">{stats.maidens} <span className="text-xs text-green-600">(+{points.bowling.maidens})</span></span>
                                              </div>
                                              {points.bowling.wicketHaul > 0 && (
                                                <div className="flex justify-between">
                                                  <span>Wicket Haul:</span>
                                                  <span className="font-semibold text-green-600">+{points.bowling.wicketHaul}</span>
                                                </div>
                                              )}
                                              {points.bowling.economyBonus > 0 && (
                                                <div className="flex justify-between">
                                                  <span>Economy:</span>
                                                  <span className="font-semibold text-green-600">+{points.bowling.economyBonus}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Fielding & Awards */}
                                        <div className="space-y-1">
                                          <p className="text-xs font-semibold text-muted-foreground uppercase">🧤 Fielding & Awards</p>
                                          <div className="space-y-1 text-sm">
                                            {stats.catches > 0 && (
                                              <div className="flex justify-between">
                                                <span>Catches:</span>
                                                <span className="font-semibold">{stats.catches} <span className="text-xs text-green-600">(+{points.fielding.catches})</span></span>
                                              </div>
                                            )}
                                            {stats.runOuts > 0 && (
                                              <div className="flex justify-between">
                                                <span>Run Outs:</span>
                                                <span className="font-semibold">{stats.runOuts} <span className="text-xs text-green-600">(+{points.fielding.runOuts})</span></span>
                                              </div>
                                            )}
                                            {stats.stumpings > 0 && (
                                              <div className="flex justify-between">
                                                <span>Stumpings:</span>
                                                <span className="font-semibold">{stats.stumpings} <span className="text-xs text-green-600">(+{points.fielding.stumpings})</span></span>
                                              </div>
                                            )}
                                            {stats.isManOfMatch && (
                                              <div className="flex justify-between">
                                                <span>Man of Match:</span>
                                                <span className="font-semibold text-yellow-600">
                                                  <Award className="h-4 w-4 inline" /> +{points.awards.manOfMatch}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Points Summary */}
                                      <div className="mt-3 pt-3 border-t bg-muted/50 rounded p-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm font-semibold">Base Points:</span>
                                          <span className="text-sm">{Math.round(points.basePoints)}</span>
                                        </div>
                                        {points.multiplier > 1 && (
                                          <>
                                            <div className="flex justify-between items-center">
                                              <span className="text-sm font-semibold">Multiplier:</span>
                                              <span className="text-sm text-primary">×{points.multiplier}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t mt-2">
                                              <span className="font-bold">Final Points:</span>
                                              <span className="font-bold text-lg text-primary">{Math.round(points.finalPoints)}</span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Mock Data Notice */}
        <Card className="mt-6 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <p className="text-sm text-center text-yellow-800 dark:text-yellow-200">
              📊 <strong>Note:</strong> Points shown are mock data for demonstration purposes. Real scoring will be integrated in Phase 2.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
