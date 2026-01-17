'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trophy, ArrowLeft, Calendar, CheckCircle2, Loader2, Activity, Clock, MapPin, Calculator, Award, Star, Crown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

export default function MatchCenterPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [tournament, setTournament] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMatches, setIsFetchingMatches] = useState(false) // Loading state for matches
  const [isCalculating, setIsCalculating] = useState<string | null>(null) // matchId being calculated
  const [auctionPlayers, setAuctionPlayers] = useState<any[]>([]) // All players from auction
  const [momSelections, setMomSelections] = useState<Record<string, { playerId: string; playerName: string }>>({}) // MoM per match
  const [isSavingMom, setIsSavingMom] = useState<string | null>(null) // matchId being saved
  const [playerOfSeries, setPlayerOfSeries] = useState<{ playerId: string; playerName: string } | null>(null)
  const [isSavingPots, setIsSavingPots] = useState(false)
  const [isApplyingPotsBonus, setIsApplyingPotsBonus] = useState(false)
  const [potsApplied, setPotsApplied] = useState(false)

  useEffect(() => {
    fetchTournamentData()
  }, [params.id])

  // Auto-load matches from DB when tournament is loaded (NO API CALL)
  useEffect(() => {
    if (tournament && matches.length === 0 && !isLoading && !isFetchingMatches) {
      loadMatchesFromDB()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament])

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament details
      const tournamentRes = await api.tournaments.getById(params.id as string) as { success: boolean; data: any }
      console.log('Tournament data received:', tournamentRes.data)
      console.log('Series object:', tournamentRes.data?.series)
      console.log('API Series ID:', tournamentRes.data?.series?.apiSeriesId)
      setTournament(tournamentRes.data)
      
      // Set PoTS if already selected
      if (tournamentRes.data?.playerOfSeriesId) {
        setPlayerOfSeries({
          playerId: tournamentRes.data.playerOfSeriesId,
          playerName: tournamentRes.data.playerOfSeriesName || ''
        })
      }
      setPotsApplied(tournamentRes.data?.playerOfSeriesApplied || false)
      
      // Fetch auction players for dropdown
      try {
        const auctionRes = await api.auction.getPlayers(params.id as string)
        const soldPlayers = (auctionRes.data || []).filter((p: any) => p.status === 'sold')
        setAuctionPlayers(soldPlayers)
        console.log('Auction players loaded:', soldPlayers.length)
      } catch (err) {
        console.log('Could not load auction players:', err)
      }
    } catch (error: any) {
      console.error('Failed to fetch tournament:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournament details',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load matches from DB (NO API CALL)
  const loadMatchesFromDB = async () => {
    setIsFetchingMatches(true)
    try {
      console.log('💾 Loading matches from database (no API call)...')
      
      // Call backend WITHOUT refresh parameter - returns DB data
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${params.id}/matches`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load matches')
      }

      const data = await response.json()
      console.log('✅ Matches loaded from DB:', data.data)
      setMatches(data.data || [])
      
      // Initialize MoM selections from loaded matches
      const momMap: Record<string, { playerId: string; playerName: string }> = {}
      for (const match of data.data || []) {
        if (match.manOfMatchPlayerId) {
          momMap[match.id] = {
            playerId: match.manOfMatchPlayerId,
            playerName: match.manOfMatchName || ''
          }
        }
      }
      setMomSelections(momMap)
    } catch (error: any) {
      console.error('Failed to load matches:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load matches from database',
        variant: 'destructive'
      })
    } finally {
      setIsFetchingMatches(false)
    }
  }

  // Refresh matches from API (EXPLICIT API CALL)
  const fetchMatches = async () => {
    setIsFetchingMatches(true)
    try {
      console.log('🔄 Refreshing matches from API...')
      console.log('Tournament:', tournament?.name)
      console.log('API Series ID:', tournament?.apiSeriesId)
      
      // Call backend WITH refresh=true parameter - triggers API call
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${params.id}/matches?refresh=true`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to refresh matches')
      }

      const data = await response.json()
      console.log('✅ Matches refreshed:', data.data)
      console.log('   Source:', data.source || 'api')
      
      if (data.message) {
        console.log('   Message:', data.message)
      }
      
      setMatches(data.data || [])
      
      // Initialize MoM selections from refreshed matches
      const momMap: Record<string, { playerId: string; playerName: string }> = {}
      for (const match of data.data || []) {
        if (match.manOfMatchPlayerId) {
          momMap[match.id] = {
            playerId: match.manOfMatchPlayerId,
            playerName: match.manOfMatchName || ''
          }
        }
      }
      setMomSelections(momMap)
      
      // Show success message
      toast({
        title: '✅ Matches Refreshed',
        description: `Updated ${data.data?.length || 0} matches from API`,
      })
    } catch (error: any) {
      console.error('Failed to fetch matches:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load matches',
        variant: 'destructive'
      })
    } finally {
      setIsFetchingMatches(false)
    }
  }

  const handleMomSelection = async (matchId: string, playerId: string) => {
    const player = auctionPlayers.find(p => p.playerId === playerId)
    if (!player) return

    setIsSavingMom(matchId)
    try {
      await api.matches.setManOfMatch(matchId, playerId, player.playerName)
      
      setMomSelections(prev => ({
        ...prev,
        [matchId]: { playerId, playerName: player.playerName }
      }))
      
      toast({
        title: '🏆 Man of Match Set',
        description: `${player.playerName} selected as Man of the Match`,
      })
    } catch (error: any) {
      console.error('Failed to set MoM:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to set Man of Match',
        variant: 'destructive'
      })
    } finally {
      setIsSavingMom(null)
    }
  }

  const handlePotsSelection = async (playerId: string) => {
    const player = auctionPlayers.find(p => p.playerId === playerId)
    if (!player) return

    setIsSavingPots(true)
    try {
      await api.matches.setPlayerOfSeries(params.id as string, playerId, player.playerName)
      
      setPlayerOfSeries({ playerId, playerName: player.playerName })
      
      toast({
        title: '⭐ Player of Series Set',
        description: `${player.playerName} selected as Player of the Series`,
      })
    } catch (error: any) {
      console.error('Failed to set PoTS:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to set Player of Series',
        variant: 'destructive'
      })
    } finally {
      setIsSavingPots(false)
    }
  }

  const handleApplyPotsBonus = async () => {
    if (!playerOfSeries) return

    setIsApplyingPotsBonus(true)
    try {
      const result = await api.matches.applyPlayerOfSeriesBonus(params.id as string)
      
      setPotsApplied(true)
      
      toast({
        title: '✅ Bonus Applied!',
        description: `Player of Series bonus applied to ${playerOfSeries.playerName}`,
      })
    } catch (error: any) {
      console.error('Failed to apply PoTS bonus:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to apply Player of Series bonus',
        variant: 'destructive'
      })
    } finally {
      setIsApplyingPotsBonus(false)
    }
  }

  const handleCalculatePoints = async (matchId: string) => {
    // Check if MoM is selected
    if (!momSelections[matchId]) {
      toast({
        title: 'Man of Match Required',
        description: 'Please select Man of the Match before calculating points',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsCalculating(matchId)
      console.log('Calculating points for match:', matchId)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournaments/${params.id}/matches/${matchId}/calculate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to calculate points')
      }

      const data = await response.json()
      console.log('Calculation result:', data)

      toast({
        title: '✅ Success!',
        description: data.data.alreadyProcessed 
          ? 'Match was already processed'
          : `Fantasy points calculated for ${data.data.playerCount} players`,
      })

      // Refresh match list to show updated status
      await loadMatchesFromDB()
    } catch (error: any) {
      console.error('Failed to calculate points:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to calculate fantasy points',
        variant: 'destructive'
      })
    } finally {
      setIsCalculating(null)
    }
  }

  // Check if all matches are completed
  const allMatchesCompleted = matches.length > 0 && matches.every(m => m.status === 'completed')
  const allMatchesProcessed = matches.length > 0 && matches.every(m => m.isProcessed)

  const getMatchStatusBadge = (match: any) => {
    if (match.status === 'completed') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      )
    }
    if (match.status === 'live') {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 animate-pulse">
          <Activity className="w-3 h-3 mr-1" />
          LIVE
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
        <Clock className="w-3 h-3 mr-1" />
        Upcoming
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                  Match Center
                </h1>
                <p className="text-sm text-muted-foreground">
                  {tournament?.name} {tournament?.seriesName && `(${tournament.seriesName})`}
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/tournament/${params.id}/leaderboard`)}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="border-primary/20 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Series Matches</CardTitle>
                <CardDescription>
                  View all matches and calculate fantasy points
                </CardDescription>
              </div>
              <Button 
                onClick={fetchMatches}
                variant={matches.length > 0 ? "outline" : "default"}
                disabled={isFetchingMatches}
              >
                {isFetchingMatches ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : matches.length > 0 ? (
                  'Refresh Matches'
                ) : (
                  'View Matches'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isFetchingMatches ? (
              <div className="text-center py-16">
                <div className="relative inline-block">
                  {/* Funky Cricket Ball Loader */}
                  <div className="w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
                    <div className="absolute inset-3 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
                      <div className="text-white font-bold text-xs">🏏</div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {matches.length > 0 ? 'Refreshing Matches' : 'Loading Matches'}
                </h3>
                <p className="text-muted-foreground animate-pulse">
                  {matches.length > 0 ? 'Syncing with API for latest updates...' : 'Loading saved match data...'}
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Click "View Matches" to load matches from the series
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <Card key={match.id} className="border-border/50 hover:border-primary/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        {/* Match Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {getMatchStatusBadge(match)}
                            {match.date && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(match.date)}
                              </div>
                            )}
                            {match.venue && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 mr-1" />
                                {match.venue}
                              </div>
                            )}
                          </div>

                          {/* Teams */}
                          <div className="space-y-2 mb-3">
                            <h3 className="text-xl font-bold">
                              {match.team1} vs {match.team2}
                            </h3>
                            {match.result && (
                              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                {match.result}
                              </p>
                            )}
                          </div>

                          {/* Man of Match Selection - Only for completed matches */}
                          {match.status === 'completed' && (
                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Award className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                  Man of the Match
                                </span>
                                {momSelections[match.id] && (
                                  <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30 ml-2">
                                    ✓ Selected
                                  </Badge>
                                )}
                              </div>
                              <Select
                                value={momSelections[match.id]?.playerId || ''}
                                onValueChange={(value) => handleMomSelection(match.id, value)}
                                disabled={match.isProcessed || isSavingMom === match.id}
                              >
                                <SelectTrigger className={`w-full ${match.isProcessed ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                  <SelectValue placeholder="Select Man of the Match" />
                                </SelectTrigger>
                                <SelectContent>
                                  {auctionPlayers.map((player) => (
                                    <SelectItem key={player.playerId} value={player.playerId}>
                                      <div className="flex items-center gap-2">
                                        <Award className="h-4 w-4 text-amber-500" />
                                        {player.playerName} ({player.role})
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {match.isProcessed && momSelections[match.id] && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  🏆 {momSelections[match.id].playerName} (locked)
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <div className="ml-4 min-w-[200px]">
                          {match.status === 'completed' && !match.isProcessed && (
                            <div className="space-y-2">
                              <Button
                                onClick={() => handleCalculatePoints(match.id)}
                                disabled={isCalculating === match.id || !momSelections[match.id]}
                                className={`w-full ${momSelections[match.id] ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-muted'}`}
                              >
                                {isCalculating === match.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Calculating...
                                  </>
                                ) : (
                                  <>
                                    <Calculator className="w-4 h-4 mr-2" />
                                    Calculate Points
                                  </>
                                )}
                              </Button>
                              {!momSelections[match.id] && (
                                <p className="text-xs text-amber-600 text-center">
                                  ⚠️ Select MoM first
                                </p>
                              )}
                            </div>
                          )}

                          {match.status === 'completed' && match.isProcessed && (
                            <div className="text-center">
                              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                              <p className="text-sm font-medium text-green-600">
                                Points Calculated
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {match.playerCount} players
                              </p>
                            </div>
                          )}

                          {match.status !== 'completed' && (
                            <div className="text-center text-muted-foreground">
                              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p className="text-xs">
                                {match.status === 'live' ? 'Match in progress' : 'Match not started'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player of the Series Section */}
        {matches.length > 0 && (
          <Card className={`mt-8 border-2 ${allMatchesCompleted ? 'border-purple-500/30 bg-purple-500/5' : 'border-muted/50 bg-muted/5'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className={`h-6 w-6 ${allMatchesCompleted ? 'text-purple-500' : 'text-muted-foreground'}`} />
                Player of the Series
              </CardTitle>
              <CardDescription>
                {allMatchesCompleted 
                  ? 'All matches completed. Select the Player of the Series and apply bonus points.'
                  : 'This section will be available after all matches are completed.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!allMatchesCompleted ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {matches.filter(m => m.status === 'completed').length} of {matches.length} matches completed
                  </p>
                  <p className="text-xs mt-1">
                    Complete all matches to select Player of the Series
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold flex items-center gap-2">
                        <Crown className="w-4 h-4 text-purple-500" />
                        Select Player
                      </label>
                      <Select
                        value={playerOfSeries?.playerId || ''}
                        onValueChange={handlePotsSelection}
                        disabled={potsApplied || isSavingPots}
                      >
                        <SelectTrigger className={`h-12 ${potsApplied ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          <SelectValue placeholder="Select Player of the Series" />
                        </SelectTrigger>
                        <SelectContent>
                          {auctionPlayers.map((player) => (
                            <SelectItem key={player.playerId} value={player.playerId}>
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-purple-500" />
                                {player.playerName} ({player.role})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      {potsApplied ? (
                        <div className="w-full h-12 flex items-center justify-center bg-green-500/20 rounded-md border border-green-500/30">
                          <span className="text-green-600 font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            Bonus Applied to {playerOfSeries?.playerName}
                          </span>
                        </div>
                      ) : (
                        <Button
                          onClick={handleApplyPotsBonus}
                          disabled={!playerOfSeries || isApplyingPotsBonus || !allMatchesProcessed}
                          className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          {isApplyingPotsBonus ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Applying Bonus...
                            </>
                          ) : (
                            <>
                              <Star className="w-4 h-4 mr-2" />
                              Apply PoTS Bonus
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {!allMatchesProcessed && allMatchesCompleted && (
                    <p className="text-xs text-amber-600 text-center">
                      ⚠️ Calculate fantasy points for all matches before applying Player of Series bonus
                    </p>
                  )}

                  {playerOfSeries && !potsApplied && (
                    <p className="text-sm text-center text-muted-foreground">
                      Selected: <span className="font-semibold text-purple-500">{playerOfSeries.playerName}</span>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
