import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Trophy, Users, Zap, TrendingUp, Shield, Target } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              JOKA Cricket Fantasy
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="font-semibold">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-4">
            <span className="text-primary font-semibold text-sm">🏏 Live Fantasy Cricket Gaming</span>
          </div>
          
          <h2 className="text-5xl lg:text-7xl font-bold text-balance leading-tight">
            Build Your Dream{' '}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Cricket Team
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Create tournaments, auction players, compete with friends, and track live scores. 
            Experience the thrill of fantasy cricket like never before.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/40 font-bold">
                <Trophy className="mr-2 h-5 w-5" />
                Create Tournament
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground font-bold">
                <Users className="mr-2 h-5 w-5" />
                Join Tournament
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center mb-16">
          <h3 className="text-3xl lg:text-4xl font-bold mb-4">
            How It <span className="text-primary">Works</span>
          </h3>
          <p className="text-muted-foreground text-lg">
            Four simple steps to fantasy cricket glory
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Trophy,
              title: 'Create Tournament',
              description: 'Set up your custom tournament with unique scoring rules',
              color: 'text-primary',
              bg: 'bg-primary/10'
            },
            {
              icon: Users,
              title: 'Invite Friends',
              description: 'Share your tournament code and gather competitors',
              color: 'text-secondary',
              bg: 'bg-secondary/10'
            },
            {
              icon: Target,
              title: 'Auction Players',
              description: 'Bid strategically to build your dream team',
              color: 'text-accent',
              bg: 'bg-accent/10'
            },
            {
              icon: TrendingUp,
              title: 'Track & Win',
              description: 'Watch live scores and climb the leaderboard',
              color: 'text-game-success',
              bg: 'bg-game-success/10'
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-14 h-14 rounded-lg ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`h-7 w-7 ${feature.color}`} />
              </div>
              <h4 className="text-xl font-bold mb-2">{feature.title}</h4>
              <p className="text-muted-foreground text-balance">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="bg-gradient-to-r from-primary via-secondary to-accent rounded-2xl p-12 text-center shadow-2xl">
          <Zap className="h-16 w-16 mx-auto mb-6 text-white" />
          <h3 className="text-4xl font-bold text-white mb-4 text-balance">
            Ready to Start Your Fantasy Journey?
          </h3>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto text-balance">
            Join thousands of cricket fans competing in exciting fantasy tournaments. 
            Your next victory is just a click away!
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-lg px-10 py-6 bg-white text-primary hover:bg-white/90 font-bold shadow-xl">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 Cricket Fantasy. Built for the love of cricket and gaming.</p>
        </div>
      </footer>
    </div>
  )
}
