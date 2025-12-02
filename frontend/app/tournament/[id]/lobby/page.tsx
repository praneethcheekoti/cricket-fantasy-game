'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Trophy, ArrowLeft, Users, Lock, Unlock, Copy, Check, Loader2, Play, Settings, Gavel, Trash2, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

export default function TournamentLobbyPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [tournament, setTournament] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [isStartingAuction, setIsStartingAuction] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }
    fetchTournamentDetails()
  }, [params.id])

  const fetchTournamentDetails = async () => {
    try {
      const response = await api.tournaments.getById(params.id as string)
      console.log('📊 Tournament Data from Backend:', response.data)
      console.log('🏆 Tournament Status:', response.data.status)
      console.log('👥 Participants:', response.data.participants)
      
      setTournament(response.data)
      
      // Map participants with user data
      const participantsData = response.data.participants.map((p: any) => ({
        userId: p.user.id,
        name: p.user.name,
        email: p.user.email,
        rulesLocked: p.rulesLocked
      }))
      
      console.log('👥 Mapped Participants:', participantsData)
      console.log('🔒 Rules Locked Count:', participantsData.filter((p: any) => p.rulesLocked).length)
      console.log('✅ All Locked?:', participantsData.every((p: any) => p.rulesLocked))
      
      setParticipants(participantsData)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load tournament',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tournament?.code || '')
    setCopied(true)
    toast({
      title: 'Copied!',
      description: 'Tournament code copied to clipboard',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLockRules = async () => {
    setIsLocking(true)
    try {
      const response = await api.tournaments.lockRules(params.id as string)
      
      console.log('🔒 Lock Rules Response:', response.data)
      
      toast({
        title: response.data.allLocked ? '🎉 All players ready!' : 'Rules locked!',
        description: response.data.allLocked 
          ? 'Everyone has confirmed - auction can begin!' 
          : 'You have confirmed the tournament rules',
      })
      
      // Wait a moment for backend to update, then refresh
      setTimeout(() => {
        fetchTournamentDetails()
      }, 500)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to lock rules',
        variant: 'destructive'
      })
    } finally {
      setIsLocking(false)
    }
  }

  const handleStartAuction = async () => {
    setIsStartingAuction(true)
    try {
      // If auction is already started (status = 'auction'), just navigate
      if (tournament?.status === 'auction') {
        toast({
          title: '🔄 Resuming Auction',
          description: 'Taking you back to the auction...',
        })
        router.push(`/tournament/${params.id}/auction`)
      } else {
        // Start new auction
        await api.tournaments.startAuction(params.id as string)
        
        toast({
          title: '🎉 Auction Started!',
          description: 'Players have been generated. Good luck!',
        })
        
        // Navigate to auction page
        router.push(`/tournament/${params.id}/auction`)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start auction',
        variant: 'destructive'
      })
    } finally {
      setIsStartingAuction(false)
    }
  }

  const handleDeleteTournament = async () => {
    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      await api.tournaments.deleteTournament(params.id as string)
      
      toast({
        title: 'Tournament Deleted',
        description: 'Tournament has been successfully deleted',
      })
      
      // Navigate back to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete tournament',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const allParticipantsLocked = participants.every(p => p.rulesLocked)
  const isCreator = tournament?.creatorId === currentUser?.id
  const currentUserLocked = participants.find(p => p.userId === currentUser?.id)?.rulesLocked

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

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          {/* Delete Tournament - Only show if creator and only 1 participant */}
          {isCreator && participants.length === 1 && (
            <Button
              onClick={handleDeleteTournament}
              variant="destructive"
              size="sm"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Tournament
                </>
              )}
            </Button>
          )}
        </div>

        {/* Tournament Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-4xl font-bold mb-2">{tournament?.name}</h2>
              <p className="text-muted-foreground text-lg">
                {tournament?.seriesName || tournament?.series?.name} ({tournament?.format || tournament?.series?.format}{tournament?.series?.gender ? ` - ${tournament?.series?.gender}` : ''})
              </p>
            </div>
            <Badge className="text-lg px-4 py-2 bg-accent/10 text-accent border-accent/20 capitalize">
              {tournament?.status}
            </Badge>
          </div>

          {/* Tournament Code */}
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-semibold">Tournament Code</p>
                  <p className="text-3xl font-bold text-primary tracking-wider">{tournament?.code}</p>
                </div>
                <Button
                  onClick={handleCopyCode}
                  size="lg"
                  variant="outline"
                  className="border-2 border-primary/20 hover:bg-primary/10"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-5 w-5 text-game-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-5 w-5" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scoring Rules */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Settings className="h-6 w-6 text-secondary" />
                    Scoring Rules
                  </CardTitle>
                  {isCreator && !allParticipantsLocked && (
                    <Link href={`/tournament/${params.id}/edit-rules`}>
                      <Button variant="outline" size="sm">
                        Edit Rules
                      </Button>
                    </Link>
                  )}
                </div>
                <CardDescription>Review the points system for this tournament</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="batting">
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        Batting Points
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Runs (per run)</span>
                          <span className="font-bold text-primary">{tournament?.battingRules?.run}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Fours (Bonus)</span>
                          <span className="font-bold text-primary">{tournament?.battingRules?.four}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Sixes (Bonus)</span>
                          <span className="font-bold text-primary">{tournament?.battingRules?.six}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">50s Bonus</span>
                          <span className="font-bold text-primary">{tournament?.battingRules?.fifty}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">100s Bonus</span>
                          <span className="font-bold text-primary">{tournament?.battingRules?.century}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Duck Penalty</span>
                          <span className="font-bold text-game-danger">{tournament?.battingRules?.duck}</span>
                        </div>
                      </div>

                      {/* Strike Rate Bonus */}
                      {tournament?.battingRules?.strikeRateBonus?.enabled && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold mb-3 text-primary">Strike Rate Bonus (min 10 balls)</h4>
                          <div className="space-y-2">
                            {tournament.battingRules.strikeRateBonus.ranges?.map((range: any, index: number) => (
                              <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <span className="text-sm text-muted-foreground">
                                  SR {range.min} - {range.max}
                                </span>
                                <span className={`font-bold text-sm ${range.points > 0 ? 'text-game-success' : range.points < 0 ? 'text-game-danger' : 'text-muted-foreground'}`}>
                                  {range.points > 0 ? '+' : ''}{range.points} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="bowling">
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-secondary"></div>
                        Bowling Points
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Wickets</span>
                          <span className="font-bold text-secondary">{tournament?.bowlingRules?.wicket}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Maidens</span>
                          <span className="font-bold text-secondary">{tournament?.bowlingRules?.maiden}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">3 Wicket Haul</span>
                          <span className="font-bold text-secondary">{tournament?.bowlingRules?.threeWicketHaul}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">5 Wicket Haul</span>
                          <span className="font-bold text-secondary">{tournament?.bowlingRules?.fiveWicketHaul}</span>
                        </div>
                      </div>

                      {/* Economy Rate Bonus */}
                      {tournament?.bowlingRules?.economyRateBonus?.enabled && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold mb-3 text-secondary">Economy Rate Bonus (min 2 overs)</h4>
                          <div className="space-y-2">
                            {tournament.bowlingRules.economyRateBonus.ranges?.map((range: any, index: number) => (
                              <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                                <span className="text-sm text-muted-foreground">
                                  Economy {range.min} - {range.max}
                                </span>
                                <span className={`font-bold text-sm ${range.points > 0 ? 'text-game-success' : range.points < 0 ? 'text-game-danger' : 'text-muted-foreground'}`}>
                                  {range.points > 0 ? '+' : ''}{range.points} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="fielding">
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent"></div>
                        Fielding Points
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Catches</span>
                          <span className="font-bold text-accent">{tournament?.fieldingRules?.catch}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Run-outs</span>
                          <span className="font-bold text-accent">{tournament?.fieldingRules?.runOut}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Stumpings</span>
                          <span className="font-bold text-accent">{tournament?.fieldingRules?.stumping}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="multipliers">
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-game-warning"></div>
                        Multipliers & Bonuses
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {tournament?.captainRules?.enabled ? (
                          <>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                              <span className="text-muted-foreground">Captain Multiplier</span>
                              <span className="font-bold text-game-warning">{tournament?.captainRules?.captainMultiplier}x</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                              <span className="text-muted-foreground">Vice-Captain Multiplier</span>
                              <span className="font-bold text-game-warning">{tournament?.captainRules?.viceCaptainMultiplier}x</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground p-3">Captain/Vice-Captain not enabled</p>
                        )}
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Man of the Match</span>
                          <span className="font-bold text-game-warning">{tournament?.awardRules?.manOfTheMatch}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-muted-foreground">Player of the Series</span>
                          <span className="font-bold text-game-warning">{tournament?.awardRules?.playerOfTheSeries}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Lock/Unlock Rules Action */}
            {!currentUserLocked ? (
              <Card className="border-2 border-game-success/20 bg-game-success/5">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Unlock className="h-8 w-8 text-game-success" />
                      <div>
                        <p className="font-bold text-lg">Confirm Tournament Rules</p>
                        <p className="text-sm text-muted-foreground">
                          Lock in these rules to proceed to auction
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleLockRules}
                      size="lg"
                      className="bg-game-success hover:bg-game-success/90 font-bold"
                      disabled={isLocking}
                    >
                      {isLocking ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Locking...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-5 w-5" />
                          Lock Rules
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-green-500/20 bg-green-500/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Lock className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-bold">Rules Locked</p>
                      <p className="text-sm text-muted-foreground">
                        Waiting for other players to confirm the rules...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Start/Continue/Completed Auction - For Creators */}
            {allParticipantsLocked && isCreator && tournament?.status !== 'completed' && (
              <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Play className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-bold text-lg">
                          {tournament?.status === 'auction' ? 'Auction In Progress' : 'All Players Ready!'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {tournament?.status === 'auction' 
                            ? 'Click to continue the auction' 
                            : 'Everyone has locked in - time to start the auction'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleStartAuction}
                      size="lg"
                      className="bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 font-bold text-lg px-8"
                      disabled={isStartingAuction}
                    >
                      {isStartingAuction ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          {tournament?.status === 'auction' ? 'Continue Auction' : 'Start Auction'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Join Auction - For Non-Creators (during auction) */}
            {tournament?.status === 'auction' && !isCreator && (
              <Card className="border-2 border-secondary/20 bg-gradient-to-r from-secondary/10 to-accent/10">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Gavel className="h-8 w-8 text-secondary" />
                      <div>
                        <p className="font-bold text-lg">Auction Live!</p>
                        <p className="text-sm text-muted-foreground">
                          Join the bidding now
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(`/tournament/${params.id}/auction`)}
                      size="lg"
                      className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-bold text-lg px-8"
                    >
                      <Gavel className="mr-2 h-5 w-5" />
                      Join Auction
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Auction Completed - Show for all participants */}
            {tournament?.status === 'completed' && (
              <>
                <Card className="border-2 border-game-success/20 bg-gradient-to-r from-game-success/10 to-primary/10">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Trophy className="h-8 w-8 text-game-success" />
                        <div>
                          <p className="font-bold text-lg text-game-success">Auction Completed!</p>
                          <p className="text-sm text-muted-foreground">
                            All players have been auctioned. Check your team!
                          </p>
                        </div>
                      </div>
                      <Link href={`/tournament/${params.id}/my-team`}>
                        <Button
                          size="lg"
                          className="bg-game-success hover:bg-game-success/90 font-bold text-lg px-8"
                        >
                          <Users className="mr-2 h-5 w-5" />
                          View My Team
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* View Matches */}
                <Card className="border-2 border-secondary/20">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-6 w-6 text-secondary" />
                        <div>
                          <p className="font-semibold">Match Center</p>
                          <p className="text-sm text-muted-foreground">
                            View series matches and scores
                          </p>
                        </div>
                      </div>
                      <Link href={`/tournament/${params.id}/matches`}>
                        <Button variant="outline" size="default">
                          View Matches
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* View Leaderboard */}
                <Card className="border-2 border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-purple-500" />
                        <div>
                          <p className="font-semibold">Leaderboard</p>
                          <p className="text-sm text-muted-foreground">
                            View tournament standings and rankings
                          </p>
                        </div>
                      </div>
                      <Link href={`/tournament/${params.id}/leaderboard`}>
                        <Button variant="outline" size="default" className="border-purple-500/50">
                          View Rankings
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* View My Team - Show during auction only */}
            {tournament?.status === 'auction' && (
              <Card className="border-2 border-accent/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-6 w-6 text-accent" />
                      <div>
                        <p className="font-semibold">My Team</p>
                        <p className="text-sm text-muted-foreground">
                          View your purchased players
                        </p>
                      </div>
                    </div>
                    <Link href={`/tournament/${params.id}/my-team`}>
                      <Button variant="outline" size="default">
                        View Team
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Participants */}
          <div className="lg:col-span-1">
            <Card className="border-2 sticky top-24">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Participants ({participants.length})
                </CardTitle>
                <CardDescription>
                  {allParticipantsLocked ? 'All players ready!' : 'Waiting for players to lock rules'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {participants.map((participant: any, index: number) => (
                    <div
                      key={participant.userId}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        participant.rulesLocked 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-yellow-500/10 border-yellow-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white">
                          {participant.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold">{participant.name}</p>
                          <div className="flex gap-2 items-center">
                            {participant.userId === tournament?.creatorId && (
                              <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                                Creator
                              </Badge>
                            )}
                            {participant.rulesLocked ? (
                              <Badge className="text-xs bg-green-600 text-white">
                                ✓ Locked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                                ⏳ Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        {participant.rulesLocked ? (
                          <Lock className="h-6 w-6 text-green-600" />
                        ) : (
                          <Unlock className="h-6 w-6 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
