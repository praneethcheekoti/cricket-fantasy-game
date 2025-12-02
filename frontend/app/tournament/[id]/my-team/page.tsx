'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trophy, ArrowLeft, Users, Target, Shield, Loader2, Star, Crown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

export default function MyTeamPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [tournament, setTournament] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [captain, setCaptain] = useState<string>('')
  const [viceCaptain, setViceCaptain] = useState<string>('')
  const [totalCost, setTotalCost] = useState(0)
  const [remainingBalance, setRemainingBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [captainMultiplier, setCaptainMultiplier] = useState(2)
  const [viceCaptainMultiplier, setViceCaptainMultiplier] = useState(1.5)

  useEffect(() => {
    fetchTeamData()
  }, [params.id])

  const fetchTeamData = async () => {
    try {
      // Fetch tournament details
      const tournamentRes = await api.tournaments.getById(params.id as string)
      setTournament(tournamentRes.data)
      
      // Parse captain rules (MongoDB returns objects, not strings)
      const captainRules = typeof tournamentRes.data.captainRules === 'string' 
        ? JSON.parse(tournamentRes.data.captainRules) 
        : (tournamentRes.data.captainRules || {})
      setCaptainMultiplier(captainRules.captainMultiplier || 2)
      setViceCaptainMultiplier(captainRules.viceCaptainMultiplier || 1.5)

      // Fetch my team
      const teamRes = await api.auction.getMyTeam(params.id as string)
      console.log('📊 My Team Response:', teamRes.data)
      
      const teamData = teamRes.data
      setPlayers(teamData.players || [])
      
      // Calculate total spent from players
      const spent = (teamData.players || []).reduce((sum: number, p: any) => sum + p.purchasePrice, 0)
      setTotalCost(spent)
      setRemainingBalance(teamData.walletBalance || 0)
      setCaptain(teamData.captainId || '')
      setViceCaptain(teamData.viceCaptainId || '')
    } catch (error: any) {
      console.error('Failed to fetch team data:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load team data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCaptains = async () => {
    if (!captain || !viceCaptain) {
      toast({
        title: 'Selection required',
        description: 'Please select both captain and vice-captain',
        variant: 'destructive'
      })
      return
    }

    if (captain === viceCaptain) {
      toast({
        title: 'Invalid selection',
        description: 'Captain and vice-captain must be different players',
        variant: 'destructive'
      })
      return
    }

    setIsSaving(true)
    try {
      await api.auction.setCaptain(params.id as string, captain, viceCaptain)
      
      toast({
        title: 'Captains saved!',
        description: 'Your captain and vice-captain have been set',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save captains',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 10000000).toFixed(2)} Cr`
  }

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'batsman':
        return Target
      case 'bowler':
        return Shield
      case 'all-rounder':
        return Star
      case 'wicket-keeper':
        return Users
      default:
        return Users
    }
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'batsman':
        return 'text-primary bg-primary/10 border-primary/20'
      case 'bowler':
        return 'text-secondary bg-secondary/10 border-secondary/20'
      case 'all-rounder':
        return 'text-accent bg-accent/10 border-accent/20'
      case 'wicket-keeper':
        return 'text-game-success bg-game-success/10 border-game-success/20'
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/20'
    }
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

      <div className="container mx-auto px-4 py-8 max-w-6xl">
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
            <Users className="h-10 w-10 text-primary" />
            My Team
          </h2>
          <p className="text-muted-foreground text-lg">
            {tournament?.name} {tournament?.seriesName && `(${tournament.seriesName})`}
          </p>
        </div>

        {/* Team Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardDescription>Total Players</CardDescription>
              <CardTitle className="text-4xl text-primary">{players.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-2 border-secondary/20">
            <CardHeader>
              <CardDescription>Total Spent</CardDescription>
              <CardTitle className="text-4xl text-secondary">{formatCurrency(totalCost)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-2 border-accent/20">
            <CardHeader>
              <CardDescription>Remaining Balance</CardDescription>
              <CardTitle className="text-4xl text-accent">{formatCurrency(remainingBalance)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Captain Selection */}
        {players.length > 0 && (
          <Card className="border-2 border-game-warning/20 bg-game-warning/5 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-game-warning" />
                Select Captain & Vice-Captain
              </CardTitle>
              <CardDescription>
                Captain gets {captainMultiplier}x points, 
                Vice-Captain gets {viceCaptainMultiplier}x points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Captain</label>
                  <Select value={captain} onValueChange={setCaptain}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select captain" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-game-warning" />
                            {player.playerName} - {player.role}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Vice-Captain</label>
                  <Select value={viceCaptain} onValueChange={setViceCaptain}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select vice-captain" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-game-warning" />
                            {player.playerName} - {player.role}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleSaveCaptains}
                className="w-full mt-6 h-12 text-base font-bold bg-game-warning hover:bg-game-warning/90"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Captains'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Players Grid */}
        {players.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player: any) => {
              const RoleIcon = getRoleIcon(player.role)
              const isCaptain = captain === player.id
              const isViceCaptain = viceCaptain === player.id
              
              return (
                <Card
                  key={player.id}
                  className={`border-2 hover:shadow-xl transition-all duration-300 relative overflow-hidden ${
                    isCaptain ? 'border-game-warning/50 shadow-lg shadow-game-warning/20' :
                    isViceCaptain ? 'border-game-warning/30' :
                    'hover:border-primary/50'
                  }`}
                >
                  {isCaptain && (
                    <div className="absolute top-0 right-0 bg-game-warning text-white px-3 py-1 text-xs font-bold flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      CAPTAIN
                    </div>
                  )}
                  {isViceCaptain && (
                    <div className="absolute top-0 right-0 bg-game-warning/70 text-white px-3 py-1 text-xs font-bold flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      VICE-CAPTAIN
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 rounded-lg ${getRoleColor(player.role)} flex items-center justify-center`}>
                        <RoleIcon className="h-6 w-6" />
                      </div>
                      <Badge className={getRoleColor(player.role)}>
                        {player.role}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl mb-1">{player.playerName}</CardTitle>
                    <CardDescription className="flex items-center justify-between">
                      <span className="text-primary font-bold">{formatCurrency(player.purchasePrice)}</span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-muted-foreground mb-2">
                No players in your team
              </p>
              <p className="text-muted-foreground text-center max-w-md">
                Complete the auction to build your team
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
