'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Switch } from '@/components/ui/switch'
import { Trophy, ArrowLeft, Loader2, Settings, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

export default function EditRulesPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [tournament, setTournament] = useState<any>(null)
  const [compositionEnabled, setCompositionEnabled] = useState(false)
  const [scoringRules, setScoringRules] = useState({
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
  })

  useEffect(() => {
    fetchTournament()
  }, [params.id])

  const fetchTournament = async () => {
    try {
      setIsLoading(true)
      const response = await api.tournaments.getDetails(params.id as string)
      setTournament(response.data)
      
      // Parse and set existing scoring rules from separate fields
      if (response.data.battingRules || response.data.bowlingRules) {
        const rules = {
          batting: response.data.battingRules || scoringRules.batting,
          bowling: response.data.bowlingRules || scoringRules.bowling,
          fielding: response.data.fieldingRules || scoringRules.fielding,
          captain: response.data.captainRules || scoringRules.captain,
          awards: response.data.awardRules || scoringRules.awards,
          composition: response.data.compositionRules || scoringRules.composition
        }
        
        setScoringRules(rules)
        
        // Check if composition is enabled
        if (rules.composition && (
          rules.composition.minBatsmen > 0 || 
          rules.composition.minBowlers > 0 || 
          rules.composition.minAllRounders > 0 || 
          rules.composition.minWicketKeepers > 0
        )) {
          setCompositionEnabled(true)
        }
      }
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

  const handleUpdateRules = async () => {
    try {
      setIsSaving(true)
      
      // If composition is disabled, set all to 0
      const finalRules = {
        ...scoringRules,
        composition: compositionEnabled ? scoringRules.composition : {
          minBatsmen: 0,
          minBowlers: 0,
          minAllRounders: 0,
          minWicketKeepers: 0
        }
      }

      await api.tournaments.updateRules(params.id as string, finalRules)
      
      toast({
        title: 'Rules Updated!',
        description: 'Scoring rules have been updated successfully',
      })
      
      // Navigate back to lobby
      router.push(`/tournament/${params.id}/lobby`)
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update rules',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
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
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Cricket Fantasy
            </h1>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href={`/tournament/${params.id}/lobby`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lobby
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Edit Scoring Rules</h1>
          <p className="text-muted-foreground">
            Update the scoring rules for {tournament?.name} {tournament?.seriesName && `(${tournament.seriesName})`}
          </p>
        </div>

        {/* Scoring Rules */}
        <Card className="border-2 mb-6">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Settings className="h-6 w-6 text-secondary" />
              Customize Scoring Rules
            </CardTitle>
            <CardDescription>
              Modify points for batting, bowling, fielding, and awards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={['batting', 'bowling', 'fielding', 'captain', 'awards', 'composition']} className="w-full">
              {/* Batting Points */}
              <AccordionItem value="batting">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    Batting Points
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <Label htmlFor="run">Runs (per run)</Label>
                      <Input
                        id="run"
                        type="number"
                        value={scoringRules.batting.run}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          batting: { ...scoringRules.batting, run: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="four">Four</Label>
                      <Input
                        id="four"
                        type="number"
                        value={scoringRules.batting.four}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          batting: { ...scoringRules.batting, four: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="six">Six</Label>
                      <Input
                        id="six"
                        type="number"
                        value={scoringRules.batting.six}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          batting: { ...scoringRules.batting, six: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fifty">Fifty (50+ runs)</Label>
                      <Input
                        id="fifty"
                        type="number"
                        value={scoringRules.batting.fifty}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          batting: { ...scoringRules.batting, fifty: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="century">Century (100+ runs)</Label>
                      <Input
                        id="century"
                        type="number"
                        value={scoringRules.batting.century}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          batting: { ...scoringRules.batting, century: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duck">Duck (0 runs)</Label>
                      <Input
                        id="duck"
                        type="number"
                        value={scoringRules.batting.duck}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          batting: { ...scoringRules.batting, duck: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>

                  {/* Strike Rate Bonus */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <Label>Strike Rate Bonus</Label>
                      <Switch
                        checked={scoringRules.batting.strikeRateBonus.enabled}
                        onCheckedChange={(checked) => setScoringRules({
                          ...scoringRules,
                          batting: {
                            ...scoringRules.batting,
                            strikeRateBonus: { ...scoringRules.batting.strikeRateBonus, enabled: checked }
                          }
                        })}
                      />
                    </div>
                    {scoringRules.batting.strikeRateBonus.enabled && (
                      <div className="space-y-3">
                        {scoringRules.batting.strikeRateBonus.ranges.map((range: any, index: number) => (
                          <div key={index} className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50">
                            <Input
                              type="number"
                              placeholder="Min SR"
                              value={range.min}
                              onChange={(e) => {
                                const newRanges = [...scoringRules.batting.strikeRateBonus.ranges]
                                newRanges[index].min = parseFloat(e.target.value) || 0
                                setScoringRules({
                                  ...scoringRules,
                                  batting: {
                                    ...scoringRules.batting,
                                    strikeRateBonus: { ...scoringRules.batting.strikeRateBonus, ranges: newRanges }
                                  }
                                })
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Max SR"
                              value={range.max}
                              onChange={(e) => {
                                const newRanges = [...scoringRules.batting.strikeRateBonus.ranges]
                                newRanges[index].max = parseFloat(e.target.value) || 0
                                setScoringRules({
                                  ...scoringRules,
                                  batting: {
                                    ...scoringRules.batting,
                                    strikeRateBonus: { ...scoringRules.batting.strikeRateBonus, ranges: newRanges }
                                  }
                                })
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Points"
                              value={range.points}
                              onChange={(e) => {
                                const newRanges = [...scoringRules.batting.strikeRateBonus.ranges]
                                newRanges[index].points = parseFloat(e.target.value) || 0
                                setScoringRules({
                                  ...scoringRules,
                                  batting: {
                                    ...scoringRules.batting,
                                    strikeRateBonus: { ...scoringRules.batting.strikeRateBonus, ranges: newRanges }
                                  }
                                })
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Bowling Points */}
              <AccordionItem value="bowling">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    Bowling Points
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <Label htmlFor="wicket">Wicket</Label>
                      <Input
                        id="wicket"
                        type="number"
                        value={scoringRules.bowling.wicket}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          bowling: { ...scoringRules.bowling, wicket: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maiden">Maiden Over</Label>
                      <Input
                        id="maiden"
                        type="number"
                        value={scoringRules.bowling.maiden}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          bowling: { ...scoringRules.bowling, maiden: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="threeWicket">3 Wicket Haul</Label>
                      <Input
                        id="threeWicket"
                        type="number"
                        value={scoringRules.bowling.threeWicketHaul}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          bowling: { ...scoringRules.bowling, threeWicketHaul: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fiveWicket">5 Wicket Haul</Label>
                      <Input
                        id="fiveWicket"
                        type="number"
                        value={scoringRules.bowling.fiveWicketHaul}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          bowling: { ...scoringRules.bowling, fiveWicketHaul: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>

                  {/* Economy Rate Bonus */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <Label>Economy Rate Bonus</Label>
                      <Switch
                        checked={scoringRules.bowling.economyRateBonus.enabled}
                        onCheckedChange={(checked) => setScoringRules({
                          ...scoringRules,
                          bowling: {
                            ...scoringRules.bowling,
                            economyRateBonus: { ...scoringRules.bowling.economyRateBonus, enabled: checked }
                          }
                        })}
                      />
                    </div>
                    {scoringRules.bowling.economyRateBonus.enabled && (
                      <div className="space-y-3">
                        {scoringRules.bowling.economyRateBonus.ranges.map((range: any, index: number) => (
                          <div key={index} className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50">
                            <Input
                              type="number"
                              placeholder="Min ER"
                              value={range.min}
                              onChange={(e) => {
                                const newRanges = [...scoringRules.bowling.economyRateBonus.ranges]
                                newRanges[index].min = parseFloat(e.target.value) || 0
                                setScoringRules({
                                  ...scoringRules,
                                  bowling: {
                                    ...scoringRules.bowling,
                                    economyRateBonus: { ...scoringRules.bowling.economyRateBonus, ranges: newRanges }
                                  }
                                })
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Max ER"
                              value={range.max}
                              onChange={(e) => {
                                const newRanges = [...scoringRules.bowling.economyRateBonus.ranges]
                                newRanges[index].max = parseFloat(e.target.value) || 0
                                setScoringRules({
                                  ...scoringRules,
                                  bowling: {
                                    ...scoringRules.bowling,
                                    economyRateBonus: { ...scoringRules.bowling.economyRateBonus, ranges: newRanges }
                                  }
                                })
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Points"
                              value={range.points}
                              onChange={(e) => {
                                const newRanges = [...scoringRules.bowling.economyRateBonus.ranges]
                                newRanges[index].points = parseFloat(e.target.value) || 0
                                setScoringRules({
                                  ...scoringRules,
                                  bowling: {
                                    ...scoringRules.bowling,
                                    economyRateBonus: { ...scoringRules.bowling.economyRateBonus, ranges: newRanges }
                                  }
                                })
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Fielding Points */}
              <AccordionItem value="fielding">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    Fielding Points
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <Label htmlFor="catch">Catch</Label>
                      <Input
                        id="catch"
                        type="number"
                        value={scoringRules.fielding.catch}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          fielding: { ...scoringRules.fielding, catch: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="runOut">Run Out</Label>
                      <Input
                        id="runOut"
                        type="number"
                        value={scoringRules.fielding.runOut}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          fielding: { ...scoringRules.fielding, runOut: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="stumping">Stumping</Label>
                      <Input
                        id="stumping"
                        type="number"
                        value={scoringRules.fielding.stumping}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          fielding: { ...scoringRules.fielding, stumping: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Captain Settings */}
              <AccordionItem value="captain">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-game-success"></div>
                    Captain & Vice-Captain
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label>Enable Captain/Vice-Captain</Label>
                      <Switch
                        checked={scoringRules.captain.enabled}
                        onCheckedChange={(checked) => setScoringRules({
                          ...scoringRules,
                          captain: { ...scoringRules.captain, enabled: checked }
                        })}
                      />
                    </div>
                    {scoringRules.captain.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="captainMultiplier">Captain Multiplier</Label>
                          <Input
                            id="captainMultiplier"
                            type="number"
                            step="0.1"
                            value={scoringRules.captain.captainMultiplier}
                            onChange={(e) => setScoringRules({
                              ...scoringRules,
                              captain: { ...scoringRules.captain, captainMultiplier: parseFloat(e.target.value) || 1 }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="viceCaptainMultiplier">Vice-Captain Multiplier</Label>
                          <Input
                            id="viceCaptainMultiplier"
                            type="number"
                            step="0.1"
                            value={scoringRules.captain.viceCaptainMultiplier}
                            onChange={(e) => setScoringRules({
                              ...scoringRules,
                              captain: { ...scoringRules.captain, viceCaptainMultiplier: parseFloat(e.target.value) || 1 }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Awards */}
              <AccordionItem value="awards">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-game-warning"></div>
                    Awards
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <Label htmlFor="motm">Man of the Match</Label>
                      <Input
                        id="motm"
                        type="number"
                        value={scoringRules.awards.manOfTheMatch}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          awards: { ...scoringRules.awards, manOfTheMatch: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pots">Player of the Series</Label>
                      <Input
                        id="pots"
                        type="number"
                        value={scoringRules.awards.playerOfTheSeries}
                        onChange={(e) => setScoringRules({
                          ...scoringRules,
                          awards: { ...scoringRules.awards, playerOfTheSeries: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Team Composition */}
              <AccordionItem value="composition">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-game-info"></div>
                    Team Composition (Optional)
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label>Enforce Minimum Requirements</Label>
                      <Switch
                        checked={compositionEnabled}
                        onCheckedChange={setCompositionEnabled}
                      />
                    </div>
                    {compositionEnabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="minBatsmen">Min Batsmen</Label>
                          <Input
                            id="minBatsmen"
                            type="number"
                            min="0"
                            value={scoringRules.composition.minBatsmen}
                            onChange={(e) => setScoringRules({
                              ...scoringRules,
                              composition: { ...scoringRules.composition, minBatsmen: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="minBowlers">Min Bowlers</Label>
                          <Input
                            id="minBowlers"
                            type="number"
                            min="0"
                            value={scoringRules.composition.minBowlers}
                            onChange={(e) => setScoringRules({
                              ...scoringRules,
                              composition: { ...scoringRules.composition, minBowlers: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="minAllRounders">Min All-Rounders</Label>
                          <Input
                            id="minAllRounders"
                            type="number"
                            min="0"
                            value={scoringRules.composition.minAllRounders}
                            onChange={(e) => setScoringRules({
                              ...scoringRules,
                              composition: { ...scoringRules.composition, minAllRounders: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="minWicketKeepers">Min Wicket-Keepers</Label>
                          <Input
                            id="minWicketKeepers"
                            type="number"
                            min="0"
                            value={scoringRules.composition.minWicketKeepers}
                            onChange={(e) => setScoringRules({
                              ...scoringRules,
                              composition: { ...scoringRules.composition, minWicketKeepers: parseInt(e.target.value) || 0 }
                            })}
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

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={handleUpdateRules}
            size="lg"
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Save Rules
              </>
            )}
          </Button>
          <Link href={`/tournament/${params.id}/lobby`} className="flex-1">
            <Button variant="outline" size="lg" className="w-full">
              Cancel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

