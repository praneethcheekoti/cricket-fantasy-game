'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trophy, Plus, LogIn, Users, Calendar, Loader2, LogOut, MoreVertical, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [tournaments, setTournaments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [deletingTournamentId, setDeletingTournamentId] = useState<string | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    
    if (!userData || !token) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
    fetchTournaments(token)
  }, [router])

  const fetchTournaments = async (token: string) => {
    try {
      const { api } = await import('@/lib/api')
      const response = await api.tournaments.getUserTournaments()
      setTournaments(response.data || [])
    } catch (error) {
      console.error('Failed to fetch tournaments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournaments',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinTournament = async () => {
    if (!joinCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a tournament code',
        variant: 'destructive'
      })
      return
    }

    setIsJoining(true)
    try {
      const { api } = await import('@/lib/api')
      const response = await api.tournaments.join(joinCode)
      
      toast({
        title: 'Success!',
        description: 'Joined tournament successfully',
      })
      
      // Refresh tournaments list
      const token = localStorage.getItem('token')
      if (token) await fetchTournaments(token)
      
      router.push(`/tournament/${response.data.tournamentId}/lobby`)
    } catch (error: any) {
      toast({
        title: 'Failed to join',
        description: error.message || 'Invalid tournament code',
        variant: 'destructive'
      })
    } finally {
      setIsJoining(false)
      setJoinCode('')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const handleDeleteTournament = async (tournamentId: string, e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation
    e.stopPropagation() // Stop event bubbling
    
    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return
    }

    setDeletingTournamentId(tournamentId)
    try {
      const { api } = await import('@/lib/api')
      await api.tournaments.deleteTournament(tournamentId)
      
      toast({
        title: 'Tournament Deleted',
        description: 'Tournament has been successfully deleted',
      })
      
      // Refresh tournaments list
      const token = localStorage.getItem('token')
      if (token) await fetchTournaments(token)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete tournament',
        variant: 'destructive'
      })
    } finally {
      setDeletingTournamentId(null)
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2">
            Welcome back, <span className="text-primary">{user?.name}</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Ready to dominate the fantasy cricket world?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          <Link href="/tournament/create">
            <Card className="border-2 border-primary/20 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-2xl">Create Tournament</CardTitle>
                <CardDescription className="text-base">
                  Set up a new tournament with custom rules and invite friends
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Dialog>
            <DialogTrigger asChild>
              <Card className="border-2 border-secondary/20 hover:border-secondary/50 hover:shadow-xl hover:shadow-secondary/20 transition-all duration-300 cursor-pointer group">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <LogIn className="h-7 w-7 text-secondary" />
                  </div>
                  <CardTitle className="text-2xl">Join Tournament</CardTitle>
                  <CardDescription className="text-base">
                    Enter a tournament code to join an existing competition
                  </CardDescription>
                </CardHeader>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-2xl">Join Tournament</DialogTitle>
                <DialogDescription>
                  Enter the tournament code shared by your friend
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-base font-semibold">Tournament Code</Label>
                  <Input
                    id="code"
                    placeholder="Enter code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="h-12 text-base uppercase"
                  />
                </div>
                <Button
                  onClick={handleJoinTournament}
                  className="w-full h-12 text-base font-bold bg-secondary hover:bg-secondary/90"
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Tournament'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Tournaments */}
        <div>
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Your Tournaments
          </h3>
          
          {tournaments.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-muted-foreground mb-2">
                  No tournaments yet
                </p>
                <p className="text-muted-foreground text-center max-w-md">
                  Create your first tournament or join one using a code to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament: any) => {
                const canDelete = tournament.creatorId === user?.id && 
                                 tournament.participants?.length === 1
                
                return (
                  <div key={tournament.id} className="relative">
                    <Link href={`/tournament/${tournament.id}/lobby`}>
                      <Card className="border-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                              <Trophy className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-semibold rounded-full capitalize">
                                {tournament.status}
                              </span>
                              {canDelete && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 rounded-full hover:bg-destructive/10"
                                      disabled={deletingTournamentId === tournament.id}
                                    >
                                      {deletingTournamentId === tournament.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <MoreVertical className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                      onClick={(e) => handleDeleteTournament(tournament.id, e)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Tournament
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            {tournament.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {tournament.participants?.length || 0} players
                            </span>
                            <span className="text-xs">
                              {tournament.series?.name} ({tournament.series?.format})
                            </span>
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
