'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, ArrowLeft, Calendar, CheckCircle2, Loader2, Activity, Clock, MapPin, Calculator } from 'lucide-react'
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

  const handleCalculatePoints = async (matchId: string) => {
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
      await fetchMatches()
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
                        </div>

                        {/* Action Button */}
                        <div className="ml-4">
                          {match.status === 'completed' && !match.isProcessed && (
                            <Button
                              onClick={() => handleCalculatePoints(match.id)}
                              disabled={isCalculating === match.id}
                              className="bg-gradient-to-r from-primary to-secondary"
                            >
                              {isCalculating === match.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Calculating...
                                </>
                              ) : (
                                <>
                                  <Calculator className="w-4 h-4 mr-2" />
                                  Calculate Fantasy Points
                                </>
                              )}
                            </Button>
                          )}

                          {match.status === 'completed' && match.isProcessed && (
                            <div className="text-center">
                              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                              <p className="text-sm font-medium text-green-600">
                                Fantasy Points Calculated
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {match.playerCount} players processed
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
      </main>
    </div>
  )
}
