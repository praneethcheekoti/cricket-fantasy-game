'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trophy, ArrowLeft, Medal, TrendingUp, Users, Target, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function LeaderboardPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  
  const [tournament, setTournament] = useState<any>(null)
  const [overallStandings, setOverallStandings] = useState<any>(null)
  const [matchWiseData, setMatchWiseData] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMatchWise, setIsLoadingMatchWise] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [params.id])

  useEffect(() => {
    if (selectedMatchId && selectedUserId) {
      fetchMatchWiseBreakdown(selectedMatchId, selectedUserId)
    }
  }, [selectedMatchId, selectedUserId])

  const fetchInitialData = async () => {
    try {
      // Fetch tournament
      const tournamentRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${params.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const tournamentData = await tournamentRes.json()
      setTournament(tournamentData.data)

      // Fetch participants (for user dropdown)
      const participantsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${params.id}/participants`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const participantsData = await participantsRes.json()
      setParticipants(participantsData.data || [])

      // Get current user ID from token
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const userId = payload.userId
        setCurrentUserId(userId)
        setSelectedUserId(userId) // Default to current user
      }

      // Fetch matches (for match-wise dropdown)
      const matchesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/${params.id}/matches`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const matchesData = await matchesRes.json()
      const processedMatches = (matchesData.data || []).filter((m: any) => m.isProcessed)
      setMatches(processedMatches)
      
      if (processedMatches.length > 0) {
        setSelectedMatchId(processedMatches[0].id)
      }

      // Fetch overall standings
      await fetchOverallStandings()
    } catch (error: any) {
      console.error('Failed to fetch data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load leaderboard data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOverallStandings = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${params.id}/leaderboard/overall`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      )
      const data = await response.json()
      setOverallStandings(data.data)
    } catch (error: any) {
      console.error('Failed to fetch overall standings:', error)
    }
  }

  const fetchMatchWiseBreakdown = async (matchId: string, userId: string) => {
    try {
      setIsLoadingMatchWise(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${params.id}/leaderboard/match/${matchId}?userId=${userId}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      )
      const data = await response.json()
      setMatchWiseData(data.data)
    } catch (error: any) {
      console.error('Failed to fetch match-wise data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load match breakdown',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingMatchWise(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-600" />
    return null
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `${rank}`
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground">
                {tournament?.name} {tournament?.seriesName && `(${tournament.seriesName})`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overall" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="overall">Overall Standings</TabsTrigger>
            <TabsTrigger value="matchwise">Match-wise Breakdown</TabsTrigger>
          </TabsList>

          {/* Overall Standings Tab */}
          <TabsContent value="overall">
            {overallStandings?.currentUser && (
              <Card className="border-primary/20 shadow-xl mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Your Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                      <p className="text-sm text-muted-foreground mb-1">Your Rank</p>
                      <p className="text-3xl font-bold text-primary">{getRankBadge(overallStandings.currentUser.rank)}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-secondary/10 to-secondary/5">
                      <p className="text-sm text-muted-foreground mb-1">Total Points</p>
                      <p className="text-3xl font-bold text-secondary">{overallStandings.currentUser.totalPoints}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5">
                      <p className="text-sm text-muted-foreground mb-1">Behind Leader</p>
                      <p className="text-3xl font-bold text-accent">{overallStandings.currentUser.behindLeader}</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-muted/20 to-muted/10">
                      <p className="text-sm text-muted-foreground mb-1">Total Participants</p>
                      <p className="text-3xl font-bold">{overallStandings.currentUser.totalParticipants}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-primary/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Overall Standings
                </CardTitle>
                <CardDescription>Complete tournament rankings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Total Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overallStandings?.standings.map((team: any) => (
                      <TableRow 
                        key={team.rank}
                        className={team.isCurrentUser ? 'bg-primary/5 font-semibold' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRankIcon(team.rank)}
                            <span>{team.rank}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {team.teamName}
                          {team.isCurrentUser && (
                            <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                          )}
                        </TableCell>
                        <TableCell>{team.ownerName}</TableCell>
                        <TableCell className="text-right font-bold">{team.totalPoints}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {(!overallStandings?.standings || overallStandings.standings.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No standings available yet</p>
                    <p className="text-sm">Calculate match points to see rankings</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Match-wise Breakdown Tab */}
          <TabsContent value="matchwise">
            <Card className="border-primary/20 shadow-xl mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Select Match & User</CardTitle>
                <CardDescription className="text-xs">View any team's performance in a specific match</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* User Selection Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Select User</label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {participants.map((participant) => (
                          <SelectItem key={participant.userId} value={participant.userId}>
                            {participant.userName}
                            {participant.userId === currentUserId && ' (You)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Match Selection Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Select Match</label>
                    <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select a match" />
                      </SelectTrigger>
                      <SelectContent>
                        {matches.map((match) => (
                          <SelectItem key={match.id} value={match.id}>
                            {match.matchDesc || `${match.team1} vs ${match.team2}`}
                            {match.date && ` - ${new Date(match.date).toLocaleDateString()}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {matches.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    No matches have been processed yet. Go to Match Center to calculate points.
                  </p>
                )}
              </CardContent>
            </Card>

            {isLoadingMatchWise ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : matchWiseData ? (
              <Card className="border-primary/20 shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{matchWiseData.teamName}</CardTitle>
                      <CardDescription>Owner: {matchWiseData.ownerName}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Points</p>
                      <p className="text-4xl font-bold text-primary">{matchWiseData.totalPoints}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Base Points</TableHead>
                        <TableHead className="text-center">Multiplier</TableHead>
                        <TableHead className="text-right">Final Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchWiseData.players.map((player: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {player.playerName}
                            {player.isCaptain && (
                              <Badge variant="outline" className="ml-2 text-xs bg-primary/10">C</Badge>
                            )}
                            {player.isViceCaptain && (
                              <Badge variant="outline" className="ml-2 text-xs bg-secondary/10">VC</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{player.role}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{player.basePoints}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={player.multiplier > 1 ? 'default' : 'outline'}>
                              {player.multiplier}x
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {player.finalPoints}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {matchWiseData.players.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No player data available for this match</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
