'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trophy, ArrowLeft, Loader2, Settings, Target, Award, UsersIcon, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

export default function CreateTournamentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSeries, setIsLoadingSeries] = useState(true)
  const [series, setSeries] = useState<any[]>([])
  const [isLoadingFormats, setIsLoadingFormats] = useState(false)
  const [availableFormats, setAvailableFormats] = useState<any[]>([])
  const [showCodeDialog, setShowCodeDialog] = useState(false)
  const [showSquadErrorDialog, setShowSquadErrorDialog] = useState(false)
  const [squadErrorDetails, setSquadErrorDetails] = useState({ seriesName: '', message: '' })
  const [tournamentCode, setTournamentCode] = useState('')
  const [tournamentId, setTournamentId] = useState('')
  const [copied, setCopied] = useState(false)
  const [compositionEnabled, setCompositionEnabled] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    seriesId: '',
    format: '', // Selected format (Test/ODI/T20)
    bidTimer: 30, // Default 30 seconds
    scoring: {
      batting: {
        run: 1,
        four: 4,
        six: 6,
        fifty: 50,
        century: 100,
        duck: -10,
        strikeRateBonus: {
          enabled: true,
          ranges: [
            { min: 150, max: 999, points: 20 },
            { min: 120, max: 149.99, points: 10 },
            { min: 60, max: 79.99, points: -10 }
          ]
        }
      },
      bowling: {
        wicket: 25,
        maiden: 10,
        threeWicketHaul: 30,
        fiveWicketHaul: 50,
        economyRateBonus: {
          enabled: true,
          ranges: [
            { min: 0, max: 5, points: 20 },
            { min: 5, max: 6.99, points: 10 },
            { min: 10, max: 999, points: -10 }
          ]
        }
      },
      fielding: {
        catch: 10,
        runOut: 15,
        stumping: 15
      },
      captain: {
        enabled: true,
        captainMultiplier: 2,
        viceCaptainMultiplier: 1.5
      },
      awards: {
        manOfTheMatch: 50,
        playerOfTheSeries: 100
      },
      composition: {
        minBatsmen: 1,
        minBowlers: 1,
        minAllRounders: 0,
        minWicketKeepers: 1
      }
    }
  })

  useEffect(() => {
    fetchSeries()
  }, [])

  // Fetch formats when series is selected
  useEffect(() => {
    if (formData.seriesId) {
      fetchFormats(formData.seriesId)
    } else {
      setAvailableFormats([])
      setFormData(prev => ({ ...prev, format: '' }))
    }
  }, [formData.seriesId])

  const fetchSeries = async () => {
    try {
      setIsLoadingSeries(true)
      const response = await api.series.getAll()
      setSeries(response.data || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load series',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingSeries(false)
    }
  }

  const fetchFormats = async (seriesId: string) => {
    try {
      setIsLoadingFormats(true)
      setAvailableFormats([])
      console.log(`🔍 [Frontend] Fetching formats for series: ${seriesId}`)
      
      const response = await api.tournaments.getSeriesFormats(seriesId)
      
      console.log(`📦 [Frontend] Full response:`, response)
      console.log(`📊 [Frontend] response.success:`, response.success)
      console.log(`📊 [Frontend] response.data:`, response.data)
      
      if (response.success && response.data) {
        console.log(`✅ [Frontend] Got ${response.data.length} formats:`, JSON.stringify(response.data, null, 2))
        setAvailableFormats(response.data)
        console.log(`📝 [Frontend] Set availableFormats state to:`, response.data)
        
        // Auto-select if only one format available
        if (response.data.length === 1) {
          console.log(`🎯 [Frontend] Auto-selecting single format: ${response.data[0].format}`)
          setFormData(prev => ({ ...prev, format: response.data[0].format }))
        }
      } else {
        console.log(`⚠️  [Frontend] Invalid response or no data`)
      }
    } catch (error: any) {
      console.error('❌ [Frontend] Error fetching formats:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load formats for this series',
        variant: 'destructive'
      })
      // Reset series selection on error
      setFormData(prev => ({ ...prev, seriesId: '', format: '' }))
    } finally {
      setIsLoadingFormats(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.seriesId || !formData.format) {
      toast({
        title: 'Error',
        description: 'Please fill in tournament name, select a series, and choose a format',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    try {
      // If composition is disabled, set all values to 0
      const scoringRules = {
        ...formData.scoring,
        composition: compositionEnabled ? formData.scoring.composition : {
          minBatsmen: 0,
          minBowlers: 0,
          minAllRounders: 0,
          minWicketKeepers: 0
        }
      }

      const response = await api.tournaments.create({
        name: formData.name,
        seriesId: formData.seriesId,
        format: formData.format, // Include selected format
        bidTimer: formData.bidTimer,
        scoringRules: scoringRules
      })

      setTournamentCode(response.data.code)
      setTournamentId(response.data.id)
      setShowCodeDialog(true)

      toast({
        title: 'Tournament created!',
        description: `Share code: ${response.data.code}`,
      })
    } catch (error: any) {
      // Handle squad availability error with elegant dialog
      if (error.response?.data?.error === 'Squad data not available') {
        const selectedSeries = series.find(s => s.id === formData.seriesId);
        setSquadErrorDetails({
          seriesName: selectedSeries?.name || 'this series',
          message: error.response?.data?.details || error.response?.data?.message || 'Squad data not available'
        });
        setShowSquadErrorDialog(true);
      } else {
        // Regular errors still use toast
        toast({
          title: 'Failed to create tournament',
          description: error.message || 'Please try again',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(tournamentCode)
    setCopied(true)
    toast({
      title: 'Copied!',
      description: 'Tournament code copied to clipboard'
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const goToTournament = () => {
    router.push(`/tournament/${tournamentId}/lobby`)
  }

  const updateScoring = (category: string, field: string, value: number | boolean) => {
    setFormData(prev => ({
      ...prev,
      scoring: {
        ...prev.scoring,
        [category]: {
          ...prev.scoring[category as keyof typeof prev.scoring],
          [field]: value
        }
      }
    }))
  }

  const updateComposition = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      scoring: {
        ...prev.scoring,
        composition: {
          ...prev.scoring.composition,
          [field]: value
        }
      }
    }))
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Settings className="h-10 w-10 text-primary" />
            Create Tournament
          </h2>
          <p className="text-muted-foreground text-lg">
            Set up your custom tournament with scoring rules
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold">Tournament Name</Label>
                <Input
                  id="name"
                  placeholder="My Epic Cricket Tournament"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="series" className="text-base font-semibold">Cricket Series</Label>
                <Select value={formData.seriesId} onValueChange={(value) => setFormData({ ...formData, seriesId: value })}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select a series" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingSeries ? (
                      <SelectItem value="loading" disabled>Loading series...</SelectItem>
                    ) : series.length === 0 ? (
                      <SelectItem value="empty" disabled>No series available</SelectItem>
                    ) : (
                      series.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.gender})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="format" className="text-base font-semibold">Match Format</Label>
                <Select 
                  value={formData.format} 
                  onValueChange={(value) => setFormData({ ...formData, format: value })}
                  disabled={!formData.seriesId || isLoadingFormats || availableFormats.length === 0}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder={
                      !formData.seriesId ? "Select a series first" :
                      isLoadingFormats ? "Loading formats..." :
                      availableFormats.length === 0 ? "No formats available" :
                      "Select format"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingFormats ? (
                      <SelectItem value="loading" disabled>Loading formats...</SelectItem>
                    ) : availableFormats.length === 0 ? (
                      <SelectItem value="empty" disabled>No formats available</SelectItem>
                    ) : (
                      availableFormats.map((f: any) => (
                        <SelectItem key={f.format} value={f.format}>
                          {f.format} ({f.squadCount} teams)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bidTimer" className="text-base font-semibold">
                  Auction Bid Timer
                  <span className="text-sm text-muted-foreground font-normal ml-2">(seconds per player)</span>
                </Label>
                <Input
                  id="bidTimer"
                  type="number"
                  min="10"
                  max="120"
                  placeholder="30"
                  value={formData.bidTimer}
                  onChange={(e) => setFormData({ ...formData, bidTimer: parseInt(e.target.value) || 30 })}
                  className="h-12 text-base"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Time allowed for bidding on each player (recommended: 20-45 seconds)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Rules */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-secondary" />
                Scoring Configuration
              </CardTitle>
              <CardDescription>Configure points for different actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {/* Batting */}
                <AccordionItem value="batting">
                  <AccordionTrigger className="text-lg font-semibold">
                    Batting Points
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid sm:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2">
                        <Label>Runs (per run)</Label>
                        <Input
                          type="number"
                          value={formData.scoring.batting.run}
                          onChange={(e) => updateScoring('batting', 'run', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fours (Bonus)</Label>
                        <Input
                          type="number"
                          value={formData.scoring.batting.four}
                          onChange={(e) => updateScoring('batting', 'four', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sixes (Bonus)</Label>
                        <Input
                          type="number"
                          value={formData.scoring.batting.six}
                          onChange={(e) => updateScoring('batting', 'six', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>50s Bonus</Label>
                        <Input
                          type="number"
                          value={formData.scoring.batting.fifty}
                          onChange={(e) => updateScoring('batting', 'fifty', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>100s Bonus</Label>
                        <Input
                          type="number"
                          value={formData.scoring.batting.century}
                          onChange={(e) => updateScoring('batting', 'century', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duck Penalty</Label>
                        <Input
                          type="number"
                          value={formData.scoring.batting.duck}
                          onChange={(e) => updateScoring('batting', 'duck', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                    </div>

                    {/* Strike Rate Bonus */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <Label>Strike Rate Bonus</Label>
                        <Switch
                          checked={formData.scoring.batting.strikeRateBonus.enabled}
                          onCheckedChange={(checked) => setFormData(prev => ({
                            ...prev,
                            scoring: {
                              ...prev.scoring,
                              batting: {
                                ...prev.scoring.batting,
                                strikeRateBonus: { ...prev.scoring.batting.strikeRateBonus, enabled: checked }
                              }
                            }
                          }))}
                        />
                      </div>
                      {formData.scoring.batting.strikeRateBonus.enabled && (
                        <div className="space-y-3">
                          {formData.scoring.batting.strikeRateBonus.ranges.map((range: any, index: number) => (
                            <div key={index} className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50">
                              <Input
                                type="number"
                                placeholder="Min SR"
                                value={range.min}
                                onChange={(e) => {
                                  const newRanges = [...formData.scoring.batting.strikeRateBonus.ranges]
                                  newRanges[index].min = parseFloat(e.target.value) || 0
                                  setFormData(prev => ({
                                    ...prev,
                                    scoring: {
                                      ...prev.scoring,
                                      batting: {
                                        ...prev.scoring.batting,
                                        strikeRateBonus: { ...prev.scoring.batting.strikeRateBonus, ranges: newRanges }
                                      }
                                    }
                                  }))
                                }}
                              />
                              <Input
                                type="number"
                                placeholder="Max SR"
                                value={range.max}
                                onChange={(e) => {
                                  const newRanges = [...formData.scoring.batting.strikeRateBonus.ranges]
                                  newRanges[index].max = parseFloat(e.target.value) || 0
                                  setFormData(prev => ({
                                    ...prev,
                                    scoring: {
                                      ...prev.scoring,
                                      batting: {
                                        ...prev.scoring.batting,
                                        strikeRateBonus: { ...prev.scoring.batting.strikeRateBonus, ranges: newRanges }
                                      }
                                    }
                                  }))
                                }}
                              />
                              <Input
                                type="number"
                                placeholder="Points"
                                value={range.points}
                                onChange={(e) => {
                                  const newRanges = [...formData.scoring.batting.strikeRateBonus.ranges]
                                  newRanges[index].points = parseFloat(e.target.value) || 0
                                  setFormData(prev => ({
                                    ...prev,
                                    scoring: {
                                      ...prev.scoring,
                                      batting: {
                                        ...prev.scoring.batting,
                                        strikeRateBonus: { ...prev.scoring.batting.strikeRateBonus, ranges: newRanges }
                                      }
                                    }
                                  }))
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Bowling */}
                <AccordionItem value="bowling">
                  <AccordionTrigger className="text-lg font-semibold">
                    Bowling Points
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid sm:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2">
                        <Label>Wickets (per wicket)</Label>
                        <Input
                          type="number"
                          value={formData.scoring.bowling.wicket}
                          onChange={(e) => updateScoring('bowling', 'wicket', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Maidens (per maiden)</Label>
                        <Input
                          type="number"
                          value={formData.scoring.bowling.maiden}
                          onChange={(e) => updateScoring('bowling', 'maiden', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>3 Wicket Haul Bonus</Label>
                        <Input
                          type="number"
                          value={formData.scoring.bowling.threeWicketHaul}
                          onChange={(e) => updateScoring('bowling', 'threeWicketHaul', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>5 Wicket Haul Bonus</Label>
                        <Input
                          type="number"
                          value={formData.scoring.bowling.fiveWicketHaul}
                          onChange={(e) => updateScoring('bowling', 'fiveWicketHaul', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                    </div>

                    {/* Economy Rate Bonus */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <Label>Economy Rate Bonus</Label>
                        <Switch
                          checked={formData.scoring.bowling.economyRateBonus.enabled}
                          onCheckedChange={(checked) => setFormData(prev => ({
                            ...prev,
                            scoring: {
                              ...prev.scoring,
                              bowling: {
                                ...prev.scoring.bowling,
                                economyRateBonus: { ...prev.scoring.bowling.economyRateBonus, enabled: checked }
                              }
                            }
                          }))}
                        />
                      </div>
                      {formData.scoring.bowling.economyRateBonus.enabled && (
                        <div className="space-y-3">
                          {formData.scoring.bowling.economyRateBonus.ranges.map((range: any, index: number) => (
                            <div key={index} className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50">
                              <Input
                                type="number"
                                placeholder="Min ER"
                                value={range.min}
                                onChange={(e) => {
                                  const newRanges = [...formData.scoring.bowling.economyRateBonus.ranges]
                                  newRanges[index].min = parseFloat(e.target.value) || 0
                                  setFormData(prev => ({
                                    ...prev,
                                    scoring: {
                                      ...prev.scoring,
                                      bowling: {
                                        ...prev.scoring.bowling,
                                        economyRateBonus: { ...prev.scoring.bowling.economyRateBonus, ranges: newRanges }
                                      }
                                    }
                                  }))
                                }}
                              />
                              <Input
                                type="number"
                                placeholder="Max ER"
                                value={range.max}
                                onChange={(e) => {
                                  const newRanges = [...formData.scoring.bowling.economyRateBonus.ranges]
                                  newRanges[index].max = parseFloat(e.target.value) || 0
                                  setFormData(prev => ({
                                    ...prev,
                                    scoring: {
                                      ...prev.scoring,
                                      bowling: {
                                        ...prev.scoring.bowling,
                                        economyRateBonus: { ...prev.scoring.bowling.economyRateBonus, ranges: newRanges }
                                      }
                                    }
                                  }))
                                }}
                              />
                              <Input
                                type="number"
                                placeholder="Points"
                                value={range.points}
                                onChange={(e) => {
                                  const newRanges = [...formData.scoring.bowling.economyRateBonus.ranges]
                                  newRanges[index].points = parseFloat(e.target.value) || 0
                                  setFormData(prev => ({
                                    ...prev,
                                    scoring: {
                                      ...prev.scoring,
                                      bowling: {
                                        ...prev.scoring.bowling,
                                        economyRateBonus: { ...prev.scoring.bowling.economyRateBonus, ranges: newRanges }
                                      }
                                    }
                                  }))
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Fielding */}
                <AccordionItem value="fielding">
                  <AccordionTrigger className="text-lg font-semibold">
                    Fielding Points
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid sm:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2">
                        <Label>Catches (per catch)</Label>
                        <Input
                          type="number"
                          value={formData.scoring.fielding.catch}
                          onChange={(e) => updateScoring('fielding', 'catch', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Run-outs (per run-out)</Label>
                        <Input
                          type="number"
                          value={formData.scoring.fielding.runOut}
                          onChange={(e) => updateScoring('fielding', 'runOut', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Stumpings (per stumping)</Label>
                        <Input
                          type="number"
                          value={formData.scoring.fielding.stumping}
                          onChange={(e) => updateScoring('fielding', 'stumping', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Multipliers */}
                <AccordionItem value="multipliers">
                  <AccordionTrigger className="text-lg font-semibold">
                    Captain/Vice-Captain
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between">
                        <Label>Enable Captain/Vice-Captain</Label>
                        <Switch
                          checked={formData.scoring.captain.enabled}
                          onCheckedChange={(checked) => updateScoring('captain', 'enabled', checked)}
                        />
                      </div>
                      {formData.scoring.captain.enabled && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Captain Multiplier</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.scoring.captain.captainMultiplier}
                              onChange={(e) => updateScoring('captain', 'captainMultiplier', Number(e.target.value))}
                              className="h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Vice-Captain Multiplier</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.scoring.captain.viceCaptainMultiplier}
                              onChange={(e) => updateScoring('captain', 'viceCaptainMultiplier', Number(e.target.value))}
                              className="h-10"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Awards */}
                <AccordionItem value="awards">
                  <AccordionTrigger className="text-lg font-semibold">
                    Awards & Bonuses
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid sm:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2">
                        <Label>Man of the Match</Label>
                        <Input
                          type="number"
                          value={formData.scoring.awards.manOfTheMatch}
                          onChange={(e) => updateScoring('awards', 'manOfTheMatch', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Player of the Series</Label>
                        <Input
                          type="number"
                          value={formData.scoring.awards.playerOfTheSeries}
                          onChange={(e) => updateScoring('awards', 'playerOfTheSeries', Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Team Composition - OPTIONAL WITH TOGGLE */}
                <AccordionItem value="composition">
                  <AccordionTrigger className="text-lg font-semibold">
                    Team Composition Rules
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-base font-semibold">Enable Team Composition Rules</Label>
                          <p className="text-sm text-muted-foreground">
                            Require minimum players per role in teams
                          </p>
                        </div>
                        <Switch
                          checked={compositionEnabled}
                          onCheckedChange={setCompositionEnabled}
                        />
                      </div>
                      
                      {compositionEnabled && (
                        <div className="grid sm:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <Label>Min Batsmen <span className="text-destructive">*</span></Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.scoring.composition.minBatsmen}
                              onChange={(e) => updateComposition('minBatsmen', Number(e.target.value))}
                              className="h-10"
                              required={compositionEnabled}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Min Bowlers <span className="text-destructive">*</span></Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.scoring.composition.minBowlers}
                              onChange={(e) => updateComposition('minBowlers', Number(e.target.value))}
                              className="h-10"
                              required={compositionEnabled}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Min All-Rounders</Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.scoring.composition.minAllRounders}
                              onChange={(e) => updateComposition('minAllRounders', Number(e.target.value))}
                              className="h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Min Wicket-Keepers <span className="text-destructive">*</span></Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.scoring.composition.minWicketKeepers}
                              onChange={(e) => updateComposition('minWicketKeepers', Number(e.target.value))}
                              className="h-10"
                              required={compositionEnabled}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 shadow-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Creating Tournament...
              </>
            ) : (
              <>
                <Trophy className="mr-2 h-6 w-6" />
                Create Tournament
              </>
            )}
          </Button>
        </form>

        {/* Success Dialog */}
        <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                Tournament Created!
              </DialogTitle>
              <DialogDescription>
                Share this code with your friends to invite them
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-primary/10 p-6 rounded-lg border-2 border-primary/20">
                <p className="text-sm text-muted-foreground text-center mb-2">Tournament Code</p>
                <p className="text-4xl font-bold text-center text-primary tracking-wider">
                  {tournamentCode}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyCode} variant="outline" className="flex-1" size="lg">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
                <Button onClick={goToTournament} className="flex-1" size="lg">
                  Go to Tournament
                  <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Squad Unavailable Dialog */}
        <Dialog open={showSquadErrorDialog} onOpenChange={setShowSquadErrorDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                Squad Not Available
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                <span className="font-medium text-foreground">
                  {squadErrorDetails.seriesName}
                </span>
                {' '}doesn't have squad data yet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {squadErrorDetails.message}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
                  💡 <strong>Tip:</strong> Select an ongoing or recently completed series to create your tournament.
                </p>
              </div>
              <Button 
                onClick={() => setShowSquadErrorDialog(false)} 
                className="w-full" 
                size="lg"
              >
                Choose Another Series
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
