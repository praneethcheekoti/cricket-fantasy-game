'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trophy, ArrowLeft, Gavel, Wallet, Users, ChevronRight, Loader2, TrendingUp, Target, Shield, PieChart, X } from 'lucide-react'
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
  const [walletBalance, setWalletBalance] = useState(2000000000) // 200 Cr in paise (default)
  const [bidAmount, setBidAmount] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isBidding, setIsBidding] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(30) // 30 seconds per player
  const [timerActive, setTimerActive] = useState(false)
  const [isCompletingAuction, setIsCompletingAuction] = useState(false) // Prevent duplicate calls
  const [pollingEnabled, setPollingEnabled] = useState(true) // Control polling
  const [bidHistory, setBidHistory] = useState<any[]>([]) // Bid history for current player
  const [tournament, setTournament] = useState<any>(null) // Tournament data including bidTimer
  const bidTimerDuration = tournament?.bidTimer || 30 // Use tournament's bidTimer or default to 30
  const [dynamicStats, setDynamicStats] = useState<any>(null) // Dynamic stats for current player
  const [isLoadingStats, setIsLoadingStats] = useState(false) // Loading state for dynamic stats
  const [isPaused, setIsPaused] = useState(false) // Auction pause state
  const [pausedBy, setPausedBy] = useState<string | null>(null) // User who paused
  const [pausedByName, setPausedByName] = useState<string>('') // Name of user who paused
  const [isPauseActionLoading, setIsPauseActionLoading] = useState(false) // Loading state for pause/unpause
  const [showCelebration, setShowCelebration] = useState(false) // Celebration modal state
  const [celebrationData, setCelebrationData] = useState<any>(null) // Data for celebration (player, buyer, price)
  const [celebratedPlayerIds, setCelebratedPlayerIds] = useState<Set<string>>(new Set()) // Track ALL celebrated players to avoid duplicates
  const [isInitialLoad, setIsInitialLoad] = useState(true) // Track if this is the initial page load (to skip celebration on return)
  const [selectedTeam, setSelectedTeam] = useState<any>(null) // For Squad Details Dialog
  const [expandedTeamIndex, setExpandedTeamIndex] = useState<number | null>(null) // For Accordion logic
  
  // Ref to track isBidding state for timer (avoids stale closure)
  const isBiddingRef = useRef(false)
  
  // Update ref whenever isBidding changes
  useEffect(() => {
    isBiddingRef.current = isBidding
  }, [isBidding])

  // Computed values - defined early so useEffect can use them
  const currentPlayer = players[currentPlayerIndex]
  const upcomingPlayers = players.slice(currentPlayerIndex + 1, currentPlayerIndex + 6)
  const unsoldPlayers = players.filter((p: any) => p.status === 'unsold')
  const availablePlayers = players.filter((p: any) => p.status === 'available')
  const isAuctionComplete = players.length > 0 && availablePlayers.length === 0 && currentPlayerIndex === -1
  const currentBid = currentPlayer?.currentPrice || currentPlayer?.basePrice || 0
  const highestBidder = currentPlayer?.highestBidder

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }
    fetchAuctionData()
    
    // 🛡️ LAYER 3: Fast polling (1 second) for near real-time sync
    // Poll for updates every 1 second to ensure all users see bids quickly
    // This prevents sniping by keeping everyone's view synchronized
    const interval = setInterval(() => {
      if (pollingEnabled && !isCompletingAuction) {
        fetchAuctionData()
        // Also fetch bid history for current player so everyone sees real-time bids
        if (currentPlayer?.id) {
          fetchBidHistory(currentPlayer.id)
        }
      }
    }, 1000) // Changed from 3000ms to 1000ms for faster updates
    return () => clearInterval(interval)
  }, [params.id, pollingEnabled, isCompletingAuction, currentPlayer?.id])

  // Timer countdown effect
  useEffect(() => {
    if (!currentPlayer || currentPlayer.status === 'sold' || currentPlayer.status === 'unsold') {
      setTimerActive(false)
      setIsCompletingAuction(false) // Reset flag when player changes
      return
    }

    setTimerActive(true)
    setTimeRemaining(bidTimerDuration) // Reset to tournament's bid timer for new player
    setIsCompletingAuction(false) // Reset flag for new player

    const countdown = setInterval(() => {
      setTimeRemaining((prev) => {
        // Don't decrement if auction is paused OR if someone is placing a bid
        // Use ref for isBidding to avoid stale closure
        if (isPaused || isBiddingRef.current) {
          return prev // Keep current value, don't decrement
        }
        
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
  }, [currentPlayer?.id, bidTimerDuration, isPaused])
  // Note: isBidding removed from dependencies - we check it inside the state update instead

  // Separate effect to handle timer expiry
  useEffect(() => {
    if (timeRemaining === 0 && currentPlayer && !isCompletingAuction && !isPaused && !isBidding && currentPlayer.status === 'available') {
      console.log('⏰⏰⏰ TIMER HIT ZERO! Completing player auction')
      console.log('Current player:', currentPlayer.playerName)
      completePlayerAuction()
    }
  }, [timeRemaining, currentPlayer?.id, isCompletingAuction, isPaused, isBidding])

  // 🛡️ LAYER 2: Reset timer when new bid is placed
  // This ensures ALL users get full bidding time after any bid
  // Prevents sniping by giving everyone fair chance to respond
  useEffect(() => {
    if (currentBid > 0 && currentPlayer) {
      console.log(`🔄 TIMER RESET: New bid detected (${currentBid / 10000000} Cr), resetting timer to ${bidTimerDuration}s`);
      console.log(`   Current isBidding state: ${isBidding}`);
      console.log(`   Current timeRemaining before reset: ${timeRemaining}s`);
      setTimeRemaining(bidTimerDuration) // Full reset to tournament's bid timer
      setTimerActive(true) // Ensure timer is active
      console.log(`   ✅ Timer reset complete, should count from ${bidTimerDuration}s`);
    }
  }, [currentBid, bidTimerDuration])

  // Auto-populate bid input with minimum bid when player changes or bid updates
  useEffect(() => {
    if (currentPlayer && currentBid >= 0) {
      const minBidInCr = (currentBid + 10000000) / 10000000 // Current bid + 1 Cr
      setBidAmount(minBidInCr.toString())
    } else {
      setBidAmount('')
    }
  }, [currentPlayer?.id, currentBid])

  // Fetch bid history when current player changes
  useEffect(() => {
    if (currentPlayer?.id) {
      fetchBidHistory(currentPlayer.id)
    } else {
      setBidHistory([])
    }
  }, [currentPlayer?.id])

  // Fetch dynamic stats when current player changes and has no stats
  useEffect(() => {
    if (currentPlayer?.id) {
      // Check if player has structured stats data (not just empty object)
      // Look for structure (batting/bowling fields), not values (runs/wickets)
      const hasStats = currentPlayer.overallStats && 
                       typeof currentPlayer.overallStats === 'object' &&
                       Object.keys(currentPlayer.overallStats).length > 0 &&
                       (currentPlayer.overallStats.batting !== undefined || 
                        currentPlayer.overallStats.bowling !== undefined)
      
      if (!hasStats) {
        console.log(`⚠️  Player ${currentPlayer.playerName} has no structured stats, fetching dynamic stats...`)
        fetchDynamicStats(currentPlayer.id)
      } else {
        console.log(`✅ Player ${currentPlayer.playerName} has structured stats (batting/bowling data exists)`)
        setDynamicStats(null) // Clear dynamic stats if player already has stats
      }
    } else {
      setDynamicStats(null)
    }
  }, [currentPlayer?.id])

  const fetchBidHistory = async (playerId: string) => {
    try {
      const response = await api.auction.getPlayerBidHistory(params.id as string, playerId)
      setBidHistory(response.data || [])
    } catch (error) {
      console.error('Failed to fetch bid history:', error)
      setBidHistory([])
    }
  }

  const fetchAuctionData = async () => {
    try {
      // Fetch tournament details (includes bidTimer and pause state)
      const tournamentRes = await api.tournaments.getDetails(params.id as string)
      setTournament(tournamentRes.data)
      
      // Update pause state
      setIsPaused(tournamentRes.data.isPaused || false)
      setPausedBy(tournamentRes.data.pausedBy || null)
      setPausedByName(tournamentRes.data.pausedByName || '')

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
      
      // 📊 Stats availability report (for debugging CricketData API issues)
      const playersWithStats = parsedPlayers.filter((p: any) => 
        p.overallStats && 
        Object.keys(p.overallStats).length > 0 &&
        (p.overallStats.batting !== undefined || p.overallStats.bowling !== undefined)
      )
      const playersWithoutStats = parsedPlayers.filter((p: any) => 
        !p.overallStats || 
        Object.keys(p.overallStats).length === 0 ||
        (p.overallStats.batting === undefined && p.overallStats.bowling === undefined)
      )
      console.log(`📊 [PLAYER STATS REPORT] Total: ${parsedPlayers.length} | With Stats: ${playersWithStats.length} | Without Stats: ${playersWithoutStats.length}`)
      if (playersWithoutStats.length > 0) {
        console.log(`⚠️  Players missing stats:`, playersWithoutStats.map((p: any) => `${p.playerName} (${p.tier})`))
      }
      
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
      setWalletBalance(teamRes.data.walletBalance || 2000000000)

      // Fetch all teams
      const teamsRes = await api.auction.getAllTeams(params.id as string)
      setAllTeams(teamsRes.data || [])

      // Check if a player just got sold (for celebration across all users)
      // ONLY show celebration during polling updates, NOT on initial page load
      // This prevents the celebration from popping up when returning to the auction page
      if (!isInitialLoad) {
        // Find a sold player that we haven't celebrated yet
        const uncelebratedSoldPlayer = parsedPlayers.find((p: any) => 
          p.status === 'sold' && 
          !celebratedPlayerIds.has(p.id) &&
          p.soldTo // Has buyer info
        )

        if (uncelebratedSoldPlayer) {
          // Check if this is a recent sale (within last 10 seconds)
          // We estimate based on player order - if it's before current player, it's recent
          const soldPlayerIndex = parsedPlayers.indexOf(uncelebratedSoldPlayer)
          const currentAvailableIndex = availablePlayers.length > 0 ? parsedPlayers.indexOf(availablePlayers[0]) : parsedPlayers.length
          
          // If sold player is within 5 positions before current, show celebration
          if (currentAvailableIndex - soldPlayerIndex <= 5 && currentAvailableIndex - soldPlayerIndex > 0) {
            console.log('🎉 Detected recent sale during polling - showing celebration for:', uncelebratedSoldPlayer.playerName)
            
            // Get buyer name
            const buyerTeam = teamsRes.data?.find((t: any) => t.id === uncelebratedSoldPlayer.soldTo)
            
            setCelebrationData({
              playerName: uncelebratedSoldPlayer.playerName,
              soldTo: buyerTeam?.user?.name || 'Unknown',
              price: uncelebratedSoldPlayer.currentPrice
            })
            setShowCelebration(true)
            
            // Add to celebrated set (immutable update)
            setCelebratedPlayerIds(prev => new Set([...prev, uncelebratedSoldPlayer.id]))
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
              setShowCelebration(false)
            }, 5000)
          } else {
            // Player is too far back - add to celebrated without showing
            setCelebratedPlayerIds(prev => new Set([...prev, uncelebratedSoldPlayer.id]))
          }
        }
      } else {
        // On initial load, track ALL already-sold players to avoid celebrating them later
        const soldPlayers = parsedPlayers.filter((p: any) => p.status === 'sold')
        if (soldPlayers.length > 0) {
          // Add all sold player IDs to the celebrated set
          const soldIds = new Set(soldPlayers.map((p: any) => p.id))
          setCelebratedPlayerIds(soldIds)
          console.log('📋 Initial load - tracking', soldPlayers.length, 'already sold players')
        }
        // Mark initial load as complete after first fetch
        setIsInitialLoad(false)
      }

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

  // Fetch dynamic stats for a player (on-demand)
  const fetchDynamicStats = async (playerId: string) => {
    try {
      console.log(`🔍 [Dynamic Stats] Fetching stats for player: ${playerId}`)
      setIsLoadingStats(true)
      setDynamicStats(null) // Clear previous stats
      
      const response = await api.auction.getDynamicPlayerStats(params.id as string, playerId)
      
      if (response.success && response.data) {
        console.log(`✅ [Dynamic Stats] Got stats from ${response.data.source}:`, response.data)
        setDynamicStats(response.data)
      } else {
        console.log(`⚠️  [Dynamic Stats] No stats available - will show zeros`)
        setDynamicStats(null)
        // Don't show error toast, just silently fall back to showing zeros
      }
    } catch (error: any) {
      console.error('❌ [Dynamic Stats] Failed to fetch:', error)
      // If it's a 503 (API not configured), log but don't show error
      if (error.response?.status === 503) {
        console.log('⚠️  [Dynamic Stats] Stats API not configured in production')
      }
      setDynamicStats(null)
      // Don't show error toast, just silently fall back to showing zeros
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Pause the auction
  const handlePauseAuction = async () => {
    try {
      setIsPauseActionLoading(true)
      console.log('⏸️  Pausing auction...')
      
      const response = await api.auction.pauseAuction(params.id as string)
      
      if (response.success) {
        setIsPaused(true)
        setPausedBy(response.data.pausedBy)
        setPausedByName(response.data.pausedByName)
        
        toast({
          title: '⏸️  Auction Paused',
          description: `Auction paused by ${response.data.pausedByName}`,
        })
        
        console.log('✅ Auction paused successfully')
      }
    } catch (error: any) {
      console.error('❌ Failed to pause auction:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to pause auction',
        variant: 'destructive'
      })
    } finally {
      setIsPauseActionLoading(false)
    }
  }

  // Unpause the auction
  const handleUnpauseAuction = async () => {
    try {
      setIsPauseActionLoading(true)
      console.log('▶️  Unpausing auction...')
      
      const response = await api.auction.unpauseAuction(params.id as string)
      
      if (response.success) {
        setIsPaused(false)
        setPausedBy(null)
        setPausedByName('')
        
        toast({
          title: '▶️  Auction Resumed',
          description: 'Auction has been resumed',
        })
        
        console.log('✅ Auction resumed successfully')
      }
    } catch (error: any) {
      console.error('❌ Failed to unpause auction:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to unpause auction',
        variant: 'destructive'
      })
    } finally {
      setIsPauseActionLoading(false)
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
        // Player was sold - Show celebration modal!
        console.log('🎉 Player sold - triggering celebration modal');
        setCelebrationData({
          playerName: currentPlayer.playerName,
          soldTo: response.data.soldTo,
          price: response.data.price
        })
        setShowCelebration(true)
        setCelebratedPlayerIds(prev => new Set([...prev, currentPlayer.id])) // Mark as celebrated
        
        // Auto-dismiss after 5 seconds and load next player
        setTimeout(() => {
          setShowCelebration(false)
          setCelebrationData(null)
        }, 5000)
      } else {
        // No bids - player marked as unsold (no celebration, just continue)
        console.log('❌ Player unsold - loading next player without celebration');
        toast({
          title: '❌ No Bids',
          description: `${currentPlayer.playerName} goes unsold. Moving to next player...`,
          variant: 'default'
        })
      }
      
      // Immediately refresh to get updated data (next player should appear after celebration)
      await fetchAuctionData()
      
      console.log('✅ RESUMING POLLING')
      setPollingEnabled(true) // Resume polling after completion
    } catch (error: any) {
      // 🛡️ ANTI-SNIPE: If backend detected recent bid, this is expected
      // Don't log error or show toast - just refresh data and let timer reset naturally
      if (error.message?.includes('Recent bid detected') || error.message?.includes('recent bid')) {
        console.log('🛡️ Anti-sniping protection triggered - bid placed in last 5 seconds, refreshing data');
        // Immediately fetch updated data so timer resets
        await fetchAuctionData()
        if (currentPlayer?.id) {
          await fetchBidHistory(currentPlayer.id)
        }
        setPollingEnabled(true)
        setIsCompletingAuction(false)
        return; // Don't show error toast
      }
      
      // Only log errors for unexpected failures
      console.error('❌ Error completing auction:', error)
      console.error('❌ Error message:', error.message)
      
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
      
      // Optimistic UI update - immediately show new bid
      setPlayers(prevPlayers => prevPlayers.map(p => 
        p.id === currentPlayer.id 
          ? { ...p, currentPrice: bidInPaise, highestBidder: currentUser }
          : p
      ))
      
      // Reset timer to full duration (anti-snipe)
      setTimeRemaining(bidTimerDuration)
      
      // Reset to next minimum bid after successful bid
      const nextMinBid = (bidInPaise + 10000000) / 10000000
      setBidAmount(nextMinBid.toString())
      
      // Let polling handle the full sync (happens every 1 second anyway)
      // This makes bid submission feel instant
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

  const handleRebid = async (playerId: string, playerName: string) => {
    try {
      await api.auction.rebidPlayer(params.id as string, playerId)
      
      toast({
        title: 'Player back in auction!',
        description: `${playerName} is now available for bidding`,
      })
      
      await fetchAuctionData()
    } catch (error: any) {
      toast({
        title: 'Failed to re-bid',
        description: error.message || 'Please try again',
        variant: 'destructive'
      })
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
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl text-primary">Cricket Fantasy</span>
          </div>
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <Link 
            href={`/tournament/${params.id}/lobby`} 
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lobby
          </Link>
        </div>

        <div className="flex items-center gap-4">
            {/* Pause Controls */}
            <Button
              onClick={isPaused ? handleUnpauseAuction : handlePauseAuction}
              variant="ghost"
              size="sm"
              disabled={isPauseActionLoading}
              className={isPaused ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-gray-500 hover:text-gray-900"}
            >
              {isPauseActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPaused ? (
                <span className="flex items-center gap-2">▶️ Resume</span>
              ) : (
                <span className="flex items-center gap-2">Pause</span>
              )}
            </Button>

            <div className="px-4 py-2 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-orange-600" />
                <span className="font-bold text-orange-700">{formatCurrency(walletBalance)}</span>
              </div>
            </div>
        </div>
      </header>

      <div className="h-[calc(100vh-65px)] p-4 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 h-full">
          
          {/* LEFT SIDEBAR - Queue (2 Cols - 16.7%) */}
          <div className="col-span-2 flex flex-col gap-3 h-full min-w-0 overflow-hidden">
            {/* Next Up (Top ~65%) */}
            <Card className="h-[65%] flex flex-col min-h-0 border-0 shadow-sm bg-white ring-1 ring-gray-100">
              <div className="px-3 pt-1.5 pb-1 border-b border-gray-100 bg-white shrink-0">
                <h3 className="text-[10px] font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Users className="h-3 w-3 text-primary" /> Next Up
                </h3>
              </div>
              <CardContent className="flex-1 overflow-y-auto px-1 pt-1 pb-1 space-y-1 scrollbar-thin min-h-0 bg-gray-50/30">
                {upcomingPlayers.length > 0 ? upcomingPlayers.map((player: any) => (
                  <div key={player.id} className="flex items-center gap-2 p-1.5 rounded-lg border border-gray-100 bg-white hover:border-gray-200 transition-all">
                    {/* Avatar/Icon */}
                    <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-900 truncate leading-tight">{player.playerName}</p>
                      <p className="text-[9px] text-gray-500 capitalize truncate leading-tight">{player.role}</p>
                    </div>
                    
                    {/* Tier Badge */}
                    <Badge variant="secondary" className="shrink-0 text-[8px] h-4 px-1 bg-gray-100 text-gray-600 font-medium border-gray-200">
                      Tier {player.tier}
                    </Badge>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-400 text-xs">No upcoming players</div>
                )}
              </CardContent>
            </Card>

            {/* Unsold (Bottom ~35% minus gap) */}
            <Card className="flex-1 flex flex-col min-h-0 border-0 shadow-sm bg-white ring-1 ring-gray-100">
              <div className="px-3 pt-1.5 pb-1 border-b border-gray-100 bg-white shrink-0">
                <h3 className="text-[10px] font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Shield className="h-3 w-3 text-gray-400" /> Unsold ({unsoldPlayers.length})
                </h3>
              </div>
              <CardContent className="flex-1 overflow-y-auto p-1 pt-1 space-y-1 scrollbar-thin min-h-0">
                {unsoldPlayers.map((player: any) => (
                  <div key={player.id} className="flex items-center justify-between p-1.5 rounded bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                    <span className="text-[11px] font-medium text-gray-600 truncate max-w-[90px] leading-none">{player.playerName}</span>
                    <span className="text-[9px] font-mono text-gray-400 leading-none">{formatCurrency(player.basePrice)}</span>
                  </div>
                ))}
                {unsoldPlayers.length === 0 && (
                   <div className="text-center py-4 text-gray-400 text-[10px]">No unsold players</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CENTER - Main Stage (7 Cols - 58.3%) */}
          <div className="col-span-7 flex flex-col h-full min-w-0">
            {currentPlayer ? (
              <Card className="h-full border-0 shadow-sm bg-white flex flex-col overflow-hidden ring-1 ring-gray-100">
                 {/* Top Gradient Line */}
                 <div className="h-1 w-full bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 shrink-0"></div>
                 
                 <div className="p-5 flex flex-col h-full overflow-hidden">
                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-4 shrink-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                           <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 uppercase tracking-wider text-[10px] font-bold px-2 py-0.5">
                              {currentPlayer.role}
                           </Badge>
                           <Badge className="bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 text-[10px] font-bold px-2 py-0.5">
                              Tier {currentPlayer.tier}
                           </Badge>
                           {!isPaused && (
                             <Badge className="bg-green-50 text-green-600 border-green-100 animate-pulse flex items-center gap-1 text-[10px] font-bold px-2 py-0.5">
                               <span className="relative flex h-1.5 w-1.5">
                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                 <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                               </span> Live
                             </Badge>
                           )}
                           {isPaused && (
                             <Badge className="bg-yellow-50 text-yellow-600 border-yellow-100 flex items-center gap-1 text-[10px] px-2 py-0.5">
                               ⏸️ Paused
                             </Badge>
                           )}
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{currentPlayer.playerName}</h1>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Base Price</p>
                        <p className="text-xl font-bold text-gray-400 opacity-60">{formatCurrency(currentPlayer.basePrice)}</p>
                      </div>
                    </div>

                    {/* Bidding Control Bar */}
                    <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3 mb-4 shadow-sm shrink-0">
                       <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Current Bid</p>
                             <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-primary tracking-tight">{formatCurrency(currentBid)}</span>
                                {highestBidder && (
                                  <span className="text-xs text-gray-500 font-medium truncate max-w-[120px]">by {highestBidder.name}</span>
                                )}
                             </div>
                          </div>

                          {/* Timer Circle */}
                          <div className="relative flex items-center justify-center px-2">
                             <div className={`w-14 h-14 rounded-full border-[3px] flex items-center justify-center bg-white shadow-sm transition-colors duration-300 ${
                                timeRemaining <= 10 ? 'border-red-500 text-red-600 scale-110' : 'border-gray-200 text-gray-700'
                             }`}>
                                <span className={`text-xl font-bold ${timeRemaining <= 10 ? 'animate-pulse' : ''}`}>{timeRemaining}</span>
                             </div>
                          </div>

                          {/* Bid Input & Button */}
                          <div className="flex items-center justify-end gap-2">
                             <div className="flex flex-col items-end">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₹</span>
                                  <Input 
                                    type="number" 
                                    className="pl-6 w-28 h-10 text-base font-bold border-gray-300 focus:ring-primary focus:border-primary bg-white"
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    disabled={isPaused}
                                  />
                                </div>
                                <span className="text-[9px] text-gray-400 mt-0.5">Min Inc: +1 Cr</span>
                             </div>
                             <Button 
                                size="lg" 
                                className="h-10 px-6 text-base font-bold bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95"
                                onClick={handlePlaceBid}
                                disabled={isBidding || isPaused}
                             >
                                {isBidding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'BID'}
                             </Button>
                          </div>
                       </div>
                    </div>

                    {/* Player Details Grid (Avatar + Stats) */}
                    <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                       {/* Avatar */}
                       <div className="col-span-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100/50 flex items-center justify-center relative overflow-hidden group h-full max-h-[350px]">
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                          <Users className="h-24 w-24 text-indigo-200 group-hover:scale-110 transition-transform duration-500 drop-shadow-md" />
                       </div>

                       {/* Stats Card */}
                       <Card className="col-span-7 border border-gray-200 shadow-sm bg-white flex flex-col h-full overflow-hidden">
                          <CardHeader className="bg-gray-50/50 py-2 px-4 border-b border-gray-100 shrink-0">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wide">
                                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Performance Stats
                              </CardTitle>
                              {dynamicStats && dynamicStats.source === 'dynamic' && (
                                <Badge variant="outline" className="text-[9px] border-green-200 text-green-600 bg-green-50 px-1.5 py-0">Live</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="p-0 flex-1 overflow-y-auto scrollbar-thin">
                            {(() => {
                               const stats = dynamicStats?.stats || currentPlayer.overallStats || {}
                               return (
                                 <div className="text-sm h-full flex flex-col">
                                    {/* Matches Header */}
                                    <div className="px-4 py-2 flex justify-between items-center bg-gray-50/30 border-b border-gray-50 shrink-0">
                                       <span className="text-gray-500 font-medium text-xs">Matches Played</span>
                                       <span className="text-lg font-bold text-gray-900">{stats.batting?.matches || 0}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 divide-x divide-gray-100 flex-1">
                                       {/* Batting */}
                                       <div className="p-3 space-y-2">
                                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 opacity-80">Batting</p>
                                          <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Runs</span> <span className="font-bold text-gray-800">{stats.batting?.runs || 0}</span></div>
                                          <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Avg</span> <span className="font-bold text-gray-800">{stats.batting?.average?.toFixed(2) || '-'}</span></div>
                                          <div className="flex justify-between items-center"><span className="text-xs text-gray-500">SR</span> <span className="font-bold text-gray-800">{stats.batting?.strikeRate?.toFixed(2) || '-'}</span></div>
                                          <div className="flex justify-between items-center"><span className="text-xs text-gray-500">100s/50s</span> <span className="font-bold text-gray-800">{stats.batting?.centuries || 0}/{stats.batting?.halfCenturies || stats.batting?.fifties || 0}</span></div>
                                       </div>
                                       
                                       {/* Bowling */}
                                       <div className="p-3 space-y-2">
                                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1 opacity-80">Bowling</p>
                                          <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Wickets</span> <span className="font-bold text-gray-800">{stats.bowling?.wickets || 0}</span></div>
                                          <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Avg</span> <span className="font-bold text-gray-800">{stats.bowling?.average?.toFixed(2) || '-'}</span></div>
                                          <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Econ</span> <span className="font-bold text-gray-800">{stats.bowling?.economy?.toFixed(2) || '-'}</span></div>
                                          <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Best</span> <span className="font-bold text-gray-800">{stats.bowling?.bestFigures || '-'}</span></div>
                                       </div>
                                    </div>
                                 </div>
                               )
                            })()}
                          </CardContent>
                       </Card>
                    </div>
                 </div>
              </Card>
            ) : (
               <Card className="h-full border-0 shadow-sm bg-white flex items-center justify-center ring-1 ring-gray-100">
                  <div className="text-center">
                    {players.length > 0 ? (
                      <>
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                          <Trophy className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Auction Completed!</h2>
                        <p className="text-gray-500 mt-2 mb-6">All players have been auctioned.</p>
                        <div className="flex justify-center gap-3">
                           <Link href={`/tournament/${params.id}/my-team`}>
                              <Button size="lg" className="bg-primary">View Final Teams</Button>
                           </Link>
                           <Link href={`/tournament/${params.id}/lobby`}>
                              <Button size="lg" variant="outline">Back to Lobby</Button>
                           </Link>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                         <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                         <p className="text-gray-500 font-medium">Loading auction data...</p>
                      </div>
                    )}
                  </div>
               </Card>
            )}
          </div>

          {/* RIGHT SIDEBAR - Info (3 Cols - 25%) */}
          <div className="col-span-3 flex flex-col gap-3 h-full min-w-0 overflow-hidden">
             {/* Bid History (Top ~50%) */}
             <Card className="flex-1 flex flex-col min-h-0 border-0 shadow-sm bg-white ring-1 ring-gray-100">
                <div className="px-3 pt-1.5 pb-1 border-b border-gray-100 bg-white shrink-0">
                   <h3 className="text-[10px] font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <Gavel className="h-3 w-3 text-primary" /> Bid History
                   </h3>
                </div>
                <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin min-h-0">
                   {bidHistory.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                         {bidHistory.map((bid: any) => (
                            <div key={bid.id} className="flex items-center justify-between p-2 hover:bg-gray-50/50 transition-colors">
                               <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[9px] font-bold border border-indigo-100">
                                     {bid.user?.name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                  <div className="min-w-0">
                                     <p className="text-[11px] font-bold text-gray-900 leading-none truncate max-w-[80px]">{bid.user?.name || 'Unknown'}</p>
                                     <p className="text-[9px] text-gray-400 mt-0.5 font-mono">
                                        {new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                     </p>
                                  </div>
                               </div>
                               <span className="font-bold text-primary text-[10px] bg-primary/5 px-1.5 py-0.5 rounded">{formatCurrency(bid.amount)}</span>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="text-center py-12 text-gray-400 text-xs flex flex-col items-center gap-2">
                         <Gavel className="h-8 w-8 text-gray-200" />
                         <span>No bids yet.</span>
                      </div>
                   )}
                </CardContent>
             </Card>

             {/* My Team / Standings Tabs (Bottom ~50%) */}
             <Card className="flex-1 flex flex-col min-h-0 border-0 shadow-sm bg-white ring-1 ring-gray-100">
                <Tabs defaultValue="my-team" className="flex-1 flex flex-col h-full">
                   <div className="px-3 pt-1.5 pb-1 border-b border-gray-100 bg-white shrink-0">
                      <TabsList className="w-full h-6 bg-gray-100 p-0.5 rounded-sm">
                         <TabsTrigger value="my-team" className="flex-1 text-[10px] h-5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase tracking-wide">My Team</TabsTrigger>
                         <TabsTrigger value="standings" className="flex-1 text-[10px] h-5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase tracking-wide">Standings</TabsTrigger>
                      </TabsList>
                   </div>
                   
                   <TabsContent value="my-team" className="flex-1 overflow-y-auto p-0 m-0 scrollbar-thin min-h-0">
                      {myTeam.length > 0 ? (
                         <div className="divide-y divide-gray-50">
                            {myTeam.map((player: any) => (
                               <div key={player.id} className="flex items-center justify-between p-2 hover:bg-gray-50/30">
                                  <div className="flex flex-col">
                                     <span className="text-[11px] font-bold text-gray-700 truncate max-w-[120px]">{player.playerName}</span>
                                     <span className="text-[9px] text-gray-400 capitalize">{player.role}</span>
                                  </div>
                                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100 text-[9px] px-1.5 py-0 h-4 font-mono">{formatCurrency(player.purchasePrice)}</Badge>
                               </div>
                            ))}
                         </div>
                      ) : (
                         <div className="text-center py-8 text-gray-400 text-xs px-4 flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-gray-200" />
                            <span>Your squad is empty.</span>
                         </div>
                      )}
                   </TabsContent>

                   <TabsContent value="standings" className="flex-1 overflow-y-auto p-0 m-0 scrollbar-thin min-h-0">
                      <div className="divide-y divide-gray-50">
                         {allTeams.map((team: any, index: number) => (
                            <div key={index} className="group">
                               <div 
                                  className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => setExpandedTeamIndex(expandedTeamIndex === index ? null : index)}
                               >
                                  <div className="flex items-center gap-2 min-w-0">
                                     <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600 shrink-0">
                                        {index + 1}
                                     </div>
                                     <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold text-gray-700 truncate max-w-[90px] flex items-center gap-1">
                                           {team.user?.name}
                                           <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform ${expandedTeamIndex === index ? 'rotate-90' : ''}`} />
                                        </span>
                                        <span className="text-[9px] text-gray-400">{team.players?.length || 0} Players</span>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-bold text-gray-700 bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 font-mono">
                                        {formatCurrency(team.walletBalance || 0)}
                                     </span>
                                     <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       className="h-6 w-6 text-gray-400 hover:text-primary hover:bg-primary/5"
                                       onClick={(e) => {
                                          e.preventDefault() 
                                          e.stopPropagation() 
                                          setSelectedTeam(team)
                                       }}
                                     >
                                       <PieChart className="h-3.5 w-3.5" />
                                     </Button>
                                  </div>
                               </div>
                               
                               {/* Expanded Squad List (Quick View) - Controlled by State */}
                               {expandedTeamIndex === index && (
                                  <>
                                     {team.players && team.players.length > 0 ? (
                                        <div className="bg-gray-50/50 border-t border-gray-100 pl-9 pr-2 py-2 animate-in slide-in-from-top-1 duration-200">
                                           <div className="flex justify-between items-center mb-2">
                                              <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Quick Squad View</p>
                                              <p className="text-[9px] text-gray-500">Spent: {formatCurrency(team.players.reduce((sum: number, p: any) => sum + (p.purchasePrice || 0), 0))}</p>
                                           </div>
                                           <div className="space-y-1">
                                              {team.players.map((p: any) => (
                                                 <div key={p.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                                                    <div className="flex items-center gap-2">
                                                       <span className="text-[10px] font-bold text-gray-700">{p.playerName}</span>
                                                       <span className="text-[8px] px-1 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-wide">
                                                          {p.role?.substring(0, 3)}
                                                       </span>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-gray-600">
                                                       {formatCurrency(p.purchasePrice)}
                                                    </span>
                                                 </div>
                                              ))}
                                           </div>
                                        </div>
                                     ) : (
                                        <div className="bg-gray-50/50 px-2 pb-2 border-t border-gray-50 pl-9 text-[9px] text-gray-400 italic animate-in slide-in-from-top-1 duration-200">
                                           No players yet
                                        </div>
                                     )}
                                  </>
                               )}
                            </div>
                         ))}
                      </div>
                   </TabsContent>
                </Tabs>
             </Card>
          </div>

        </div>
      </div>

      {/* 🎉 Celebration Modal - Player Sold */}
      {showCelebration && celebrationData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Confetti Animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10px',
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              >
                <div 
                  className="text-2xl"
                  style={{
                    transform: `rotate(${Math.random() * 360}deg)`
                  }}
                >
                  {['🎉', '🎊', '⚡', '🏆', '✨', '🌟'][Math.floor(Math.random() * 6)]}
                </div>
              </div>
            ))}
          </div>

          {/* Celebration Card */}
          <Card className="relative z-10 w-full max-w-2xl mx-4 border-4 border-white/20 shadow-2xl animate-in zoom-in duration-500 bg-white/10 backdrop-blur-md text-white">
            <CardContent className="p-12 text-center space-y-6">
              <div className="text-8xl animate-bounce">🎉</div>
              <div className="space-y-2">
                <h2 className="text-6xl font-black text-white drop-shadow-lg animate-pulse tracking-tight">
                  SOLD!
                </h2>
              </div>

              <div className="space-y-4 py-6">
                <div>
                  <p className="text-sm text-white/70 uppercase tracking-wide mb-2">Player</p>
                  <p className="text-5xl font-bold text-white drop-shadow-md">{celebrationData.playerName}</p>
                </div>

                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="h-px w-16 bg-white/30"></div>
                  <p className="text-xl text-white/80 italic">sold to</p>
                  <div className="h-px w-16 bg-white/30"></div>
                </div>

                <div>
                  <p className="text-sm text-white/70 uppercase tracking-wide mb-2">Winner</p>
                  <p className="text-4xl font-bold text-yellow-300 drop-shadow-md">{celebrationData.soldTo}</p>
                </div>

                <div className="mt-8 inline-block px-8 py-4 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md">
                  <p className="text-xs text-white/70 uppercase tracking-wide mb-1">Final Price</p>
                  <p className="text-5xl font-black text-white">{formatCurrency(celebrationData.price)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Squad Details Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <Card className="w-full max-w-md border-0 shadow-2xl bg-[#FDFBF7] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-start justify-between bg-[#FDFBF7]">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedTeam.user?.name}'s Squad</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Total Spent: {formatCurrency(selectedTeam.players?.reduce((sum: number, p: any) => sum + (p.purchasePrice || 0), 0) || 0)} | Remaining: {formatCurrency(selectedTeam.walletBalance)}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -mt-1 -mr-1 text-gray-400 hover:text-gray-600"
                onClick={() => setSelectedTeam(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 overflow-y-auto scrollbar-thin">
              {/* Role Counts */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: 'Batsmen', icon: Target, count: selectedTeam.players?.filter((p: any) => p.role?.toLowerCase().includes('batsman')).length || 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Bowlers', icon: Trophy, count: selectedTeam.players?.filter((p: any) => p.role?.toLowerCase().includes('bowler')).length || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'All-Rounders', icon: Users, count: selectedTeam.players?.filter((p: any) => p.role?.toLowerCase().includes('all')).length || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Wicket-Keepers', icon: Shield, count: selectedTeam.players?.filter((p: any) => p.role?.toLowerCase().includes('keeper')).length || 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map((role, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full ${role.bg} flex items-center justify-center shrink-0`}>
                      <role.icon className={`h-5 w-5 ${role.color}`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">{role.label}</p>
                      <p className="text-xl font-black text-gray-900 leading-none mt-0.5">{role.count}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Player List */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-3">Player List</h4>
                <div className="bg-[#F6F5F0] rounded-xl border border-[#EBE9E0] p-1">
                  {selectedTeam.players && selectedTeam.players.length > 0 ? (
                    <div className="divide-y divide-gray-200/50">
                      {selectedTeam.players.map((player: any) => (
                        <div key={player.id} className="flex items-center justify-between p-3 hover:bg-black/5 transition-colors rounded-lg">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800">{player.playerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-gray-200 text-gray-600 border-transparent text-[10px] h-5 font-medium">
                              {player.role}
                            </Badge>
                            <span className="text-sm font-mono font-bold text-gray-600 bg-[#EBE9E0] px-2 py-0.5 rounded">
                              {formatCurrency(player.purchasePrice)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm italic">
                      No players purchased yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Confetti CSS Animation */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotateZ(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  )
}
