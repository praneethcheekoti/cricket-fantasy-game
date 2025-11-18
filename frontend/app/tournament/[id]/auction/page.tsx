'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trophy, ArrowLeft, Gavel, Wallet, Users, ChevronRight, Loader2, TrendingUp, Target, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

export default function AuctionPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [players, setPlayers] = useState<any[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [myTeam, setMyTeam] = useState<any[]>([])
  const [allTeams, setAllTeams] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [walletBalance, setWalletBalance] = useState(10000000000) // 100 Cr in paise
  const [bidAmount, setBidAmount] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isBidding, setIsBidding] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(30) // 30 seconds per player
  const [timerActive, setTimerActive] = useState(false)
  const [isCompletingAuction, setIsCompletingAuction] = useState(false) // Prevent duplicate calls
  const [pollingEnabled, setPollingEnabled] = useState(true) // Control polling

  // Computed values - defined early so useEffect can use them
  const currentPlayer = players[currentPlayerIndex]
  const upcomingPlayers = players.slice(currentPlayerIndex + 1, currentPlayerIndex + 6)
  const currentBid = currentPlayer?.currentPrice || currentPlayer?.basePrice || 0
  const highestBidder = currentPlayer?.highestBidder

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }
    fetchAuctionData()
    
    // Poll for updates every 3 seconds (for other users' bids)
    // But STOP polling when completing auction to prevent race conditions
    const interval = setInterval(() => {
      if (pollingEnabled && !isCompletingAuction) {
        fetchAuctionData()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [params.id, pollingEnabled, isCompletingAuction])

  // Timer countdown effect
  useEffect(() => {
    if (!currentPlayer || currentPlayer.status === 'sold' || currentPlayer.status === 'unsold') {
      setTimerActive(false)
      setIsCompletingAuction(false) // Reset flag when player changes
      return
    }

    setTimerActive(true)
    setTimeRemaining(30) // Reset to 30 seconds for new player
    setIsCompletingAuction(false) // Reset flag for new player

    const countdown = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdown)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(countdown)
    }
  }, [currentPlayer?.id])

  // Separate effect to handle timer expiry
  useEffect(() => {
    if (timeRemaining === 0 && currentPlayer && !isCompletingAuction && currentPlayer.status === 'available') {
      console.log('⏰⏰⏰ TIMER HIT ZERO! Completing player auction')
      console.log('Current player:', currentPlayer.playerName)
      completePlayerAuction()
    }
  }, [timeRemaining, currentPlayer?.id, isCompletingAuction])

  // Reset timer when new bid is placed
  useEffect(() => {
    if (currentBid > 0 && currentPlayer) {
      setTimeRemaining(30) // Reset to 30 seconds on new bid
    }
  }, [currentBid])

  const fetchAuctionData = async () => {
    try {
      // Fetch all players
      const playersRes = await api.auction.getPlayers(params.id as string)
      
      // Parse JSON strings for stats
      const parsedPlayers = (playersRes.data || []).map((player: any) => ({
        ...player,
        overallStats: typeof player.overallStats === 'string' 
          ? JSON.parse(player.overallStats) 
          : player.overallStats || {},
        vsOpponentStats: typeof player.vsOpponentStats === 'string'
          ? JSON.parse(player.vsOpponentStats)
          : player.vsOpponentStats || {}
      }))
      
      setPlayers(parsedPlayers)
      
      // Find current player (first available player - not sold, not unsold)
      const availablePlayers = parsedPlayers.filter((p: any) => p.status === 'available')
      if (availablePlayers.length > 0) {
        setCurrentPlayerIndex(parsedPlayers.indexOf(availablePlayers[0]))
      } else {
        // No more available players - auction complete
        setCurrentPlayerIndex(-1)
      }

      // Fetch my team
      const teamRes = await api.auction.getMyTeam(params.id as string)
      setMyTeam(teamRes.data.players || [])
      setWalletBalance(teamRes.data.walletBalance || 10000000000)

      // Fetch all teams
      const teamsRes = await api.auction.getAllTeams(params.id as string)
      setAllTeams(teamsRes.data || [])

      setIsLoading(false)
    } catch (error: any) {
      console.error('Failed to fetch auction data:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load auction data',
        variant: 'destructive'
      })
      setIsLoading(false)
    }
  }

  const completePlayerAuction = async () => {
    if (!currentPlayer) {
      console.log('❌ No current player to complete!')
      return
    }
    
    if (isCompletingAuction) {
      console.log('⚠️ Already completing auction for this player, skipping duplicate call')
      return
    }
    
    console.log('🛑 PAUSING POLLING - Completing player auction')
    setIsCompletingAuction(true)
    setPollingEnabled(false) // STOP polling during completion
    
    try {
      console.log('⏰ Timer expired! Completing auction for:', currentPlayer.playerName)
      console.log('🆔 Player ID:', currentPlayer.id)
      console.log('🏆 Tournament ID:', params.id)
      console.log('📊 Current Player Object:', currentPlayer)
      console.log('🔗 API URL:', `${process.env.NEXT_PUBLIC_API_URL}/auction/${params.id}/complete/${currentPlayer.id}`)
      
      // Call backend to complete the auction for this player
      console.log('📤 Sending complete auction request...')
      const response = await api.auction.completePlayerAuction(params.id as string, currentPlayer.id)
      
      console.log('✅ Complete auction response:', response)
      
      // Check if player was sold or unsold
      if (response.data?.soldTo) {
        // Player was sold
        toast({
          title: '⚡ Player Sold!',
          description: `${currentPlayer.playerName} sold to ${response.data.soldTo} for ${formatCurrency(response.data.price)}`,
        })
      } else {
        // No bids - player marked as unsold
        toast({
          title: '❌ No Bids',
          description: `${currentPlayer.playerName} goes unsold. Moving to next player...`,
          variant: 'default'
        })
      }
      
      // Immediately refresh to get updated data (next player should appear)
      await fetchAuctionData()
      
      console.log('✅ RESUMING POLLING')
      setPollingEnabled(true) // Resume polling after completion
    } catch (error: any) {
      console.error('❌ Error completing auction:', error)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error stack:', error.stack)
      console.error('❌ Full error object:', JSON.stringify(error, null, 2))
      
      // Only show error if it's not "already sold" or "concurrent request"
      if (!error.message?.includes('already sold') && !error.message?.includes('concurrent')) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to complete auction',
          variant: 'destructive'
        })
      }
      
      // Still refresh to get updated state
      await fetchAuctionData()
      
      console.log('✅ RESUMING POLLING after error')
      setPollingEnabled(true) // Resume polling even after error
    } finally {
      setIsCompletingAuction(false)
    }
  }

  const handlePlaceBid = async () => {
    if (!currentPlayer) return
    
    const bidInPaise = parseFloat(bidAmount) * 10000000 // Convert Cr to paise
    
    if (!bidInPaise || bidInPaise <= currentBid) {
      toast({
        title: 'Invalid bid',
        description: `Bid must be higher than current bid of ${formatCurrency(currentBid)}`,
        variant: 'destructive'
      })
      return
    }

    if (bidInPaise > walletBalance) {
      toast({
        title: 'Insufficient balance',
        description: 'You do not have enough funds',
        variant: 'destructive'
      })
      return
    }

    setIsBidding(true)
    try {
      await api.auction.placeBid(params.id as string, currentPlayer.id, bidInPaise)
      
      toast({
        title: 'Bid placed!',
        description: `You bid ${formatCurrency(bidInPaise)}`,
      })
      setBidAmount('')
      fetchAuctionData()
    } catch (error: any) {
      toast({
        title: 'Bid failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setIsBidding(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 10000000).toFixed(2)} Cr`
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
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-accent/10 rounded-lg border border-accent/20">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-accent" />
                <span className="font-bold text-accent">{formatCurrency(walletBalance)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Link href={`/tournament/${params.id}/lobby`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lobby
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left - Current Player Auction */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Gavel className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold">Live Auction</h2>
            </div>

            {currentPlayer ? (
              <Card className="border-2 border-primary/20 shadow-2xl">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <CardTitle className="text-3xl mb-2">{currentPlayer.playerName}</CardTitle>
                      <div className="flex items-center gap-3">
                        <Badge className="text-base px-3 py-1 bg-secondary/10 text-secondary border-secondary/20 capitalize">
                          {currentPlayer.role}
                        </Badge>
                        <Badge className="text-base px-3 py-1 bg-accent/10 text-accent border-accent/20">
                          Tier {currentPlayer.tier}
                        </Badge>
                        <Badge className="text-base px-3 py-1 bg-primary/10 text-primary border-primary/20">
                          Base: {formatCurrency(currentPlayer.basePrice)}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Users className="h-12 w-12 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Stats Tabs */}
                  <Tabs defaultValue="overall" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overall">Overall</TabsTrigger>
                      <TabsTrigger value="opposition">vs Opposition</TabsTrigger>
                      <TabsTrigger value="venue">Home/Away</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overall" className="space-y-3 mt-4">
                      <div className="grid grid-cols-2 gap-3">
                        {currentPlayer.overallStats ? (
                          <>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-sm text-muted-foreground mb-1">Matches</p>
                              <p className="text-2xl font-bold">{currentPlayer.overallStats.batting?.matches || 0}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-sm text-muted-foreground mb-1">Runs</p>
                              <p className="text-2xl font-bold text-primary">{currentPlayer.overallStats.batting?.runs || 0}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-sm text-muted-foreground mb-1">Average</p>
                              <p className="text-2xl font-bold">{currentPlayer.overallStats.batting?.average || 0}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-sm text-muted-foreground mb-1">Wickets</p>
                              <p className="text-2xl font-bold text-secondary">{currentPlayer.overallStats.bowling?.wickets || 0}</p>
                            </div>
                          </>
                        ) : (
                          <p className="col-span-2 text-center text-muted-foreground py-4">No stats available</p>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="opposition" className="space-y-3 mt-4">
                      <div className="grid grid-cols-2 gap-3">
                        {currentPlayer.vsOpponentStats ? (
                          <>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-sm text-muted-foreground mb-1">Matches</p>
                              <p className="text-2xl font-bold">{currentPlayer.vsOpponentStats.matches || 0}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-sm text-muted-foreground mb-1">Runs</p>
                              <p className="text-2xl font-bold text-primary">{currentPlayer.vsOpponentStats.runs || 0}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-sm text-muted-foreground mb-1">Average</p>
                              <p className="text-2xl font-bold">{currentPlayer.vsOpponentStats.average || 0}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-sm text-muted-foreground mb-1">Wickets</p>
                              <p className="text-2xl font-bold text-secondary">{currentPlayer.vsOpponentStats.wickets || 0}</p>
                            </div>
                          </>
                        ) : (
                          <p className="col-span-2 text-center text-muted-foreground py-4">No stats available</p>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="venue" className="space-y-3 mt-4">
                      <div className="grid grid-cols-2 gap-3">
                        {currentPlayer.vsOpponentStats ? (
                          <>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-sm text-muted-foreground mb-1">Home Average</p>
                              <p className="text-2xl font-bold">{currentPlayer.vsOpponentStats.homeAverage || 0}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                              <p className="text-sm text-muted-foreground mb-1">Away Average</p>
                              <p className="text-2xl font-bold">{currentPlayer.vsOpponentStats.awayAverage || 0}</p>
                            </div>
                          </>
                        ) : (
                          <p className="col-span-2 text-center text-muted-foreground py-4">No stats available</p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Timer */}
                  <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-game-warning/20 to-game-danger/20 border-2 border-game-warning/30">
                    <div className="flex items-center justify-center gap-3">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        timeRemaining <= 10 
                          ? 'bg-game-danger/20 border-4 border-game-danger animate-pulse' 
                          : 'bg-game-warning/20 border-4 border-game-warning'
                      }`}>
                        <span className={`text-3xl font-bold ${
                          timeRemaining <= 10 ? 'text-game-danger' : 'text-game-warning'
                        }`}>
                          {timeRemaining}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Time Remaining</p>
                        <p className="text-xs text-muted-foreground">
                          {timeRemaining <= 10 ? 'Hurry up! Auction closing soon!' : 'Place your bid now'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current Bid */}
                  <div className="p-6 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Current Bid</p>
                        <p className="text-4xl font-bold text-primary">{formatCurrency(currentBid)}</p>
                      </div>
                      {highestBidder && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">Highest Bidder</p>
                          <p className="text-xl font-bold">{highestBidder.name}</p>
                        </div>
                      )}
                    </div>

                    {/* Bid Input */}
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        placeholder="Enter bid (Cr)"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="h-12 text-base"
                        step="0.1"
                      />
                      <Button
                        onClick={handlePlaceBid}
                        size="lg"
                        className="px-8 font-bold bg-primary hover:bg-primary/90"
                        disabled={isBidding}
                      >
                        {isBidding ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Bidding...
                          </>
                        ) : (
                          <>
                            <Gavel className="mr-2 h-5 w-5" />
                            Place Bid
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Min bid: {formatCurrency(currentBid + 1000000)} • Your balance: {formatCurrency(walletBalance)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-game-success/20 bg-gradient-to-br from-game-success/5 to-primary/5">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-full bg-game-success/10 flex items-center justify-center mb-6">
                    <Trophy className="h-12 w-12 text-game-success" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2 text-game-success">Auction Completed!</h2>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    All players have been auctioned. Check your team and get ready for the matches!
                  </p>
                  <div className="flex gap-4">
                    <Link href={`/tournament/${params.id}/my-team`}>
                      <Button size="lg" className="bg-game-success hover:bg-game-success/90">
                        <Users className="mr-2 h-5 w-5" />
                        View My Team
                      </Button>
                    </Link>
                    <Link href={`/tournament/${params.id}/lobby`}>
                      <Button size="lg" variant="outline">
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back to Lobby
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Players Queue */}
            {upcomingPlayers.length > 0 && (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChevronRight className="h-5 w-5 text-secondary" />
                    Next Up
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {upcomingPlayers.map((player: any, index: number) => (
                      <div
                        key={player.id}
                        className="flex-shrink-0 p-4 rounded-lg bg-muted/50 border border-border/50 w-40"
                      >
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center mb-3 mx-auto">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <p className="font-semibold text-sm text-center mb-1 truncate">{player.playerName}</p>
                        <p className="text-xs text-muted-foreground text-center capitalize">{player.role}</p>
                        <p className="text-xs text-primary text-center mt-1">Tier {player.tier}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar - Teams */}
          <div className="space-y-6">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Your Team
                    </CardTitle>
                    <CardDescription>
                      {myTeam.length} players • {formatCurrency(walletBalance)} remaining
                    </CardDescription>
                  </div>
                  {myTeam.length > 0 && (
                    <Link href={`/tournament/${params.id}/my-team`}>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                        <Users className="h-4 w-4 mr-1" />
                        View Full Team
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {myTeam.length > 0 ? (
                      myTeam.map((player: any) => (
                        <div
                          key={player.id}
                          className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 border border-border/50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{player.playerName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground capitalize">{player.role}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {formatCurrency(player.purchasePrice)}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No players yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Start bidding to build your team!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Other Teams */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-secondary" />
                  All Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="0" className="w-full">
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(allTeams.length, 3)}, 1fr)` }}>
                    {allTeams.slice(0, 3).map((team: any, index: number) => (
                      <TabsTrigger key={index} value={index.toString()} className="text-xs truncate">
                        {team.user?.name?.split(' ')[0] || `Team ${index + 1}`}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {allTeams.map((team: any, index: number) => (
                    <TabsContent key={index} value={index.toString()} className="mt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-3">
                          <p className="font-semibold">{team.user?.name}</p>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{team.players?.length || 0} players</p>
                            <p className="text-xs text-accent">{formatCurrency(team.walletBalance || 0)}</p>
                          </div>
                        </div>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {team.players && team.players.length > 0 ? (
                              team.players.map((player: any) => (
                                <div
                                  key={player.id}
                                  className="flex justify-between items-center p-2 rounded bg-muted/30 text-sm"
                                >
                                  <div>
                                    <span className="font-medium">{player.playerName}</span>
                                    <span className="text-xs text-muted-foreground ml-2 capitalize">{player.role}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{formatCurrency(player.purchasePrice)}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">No players yet</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
