import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-background to-blue-950/20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-xl">NexFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6">
        <section className="py-24 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
            ✨ Self-hosted • Zero-cost • Open-source
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-violet-200 to-blue-200 bg-clip-text text-transparent">
            Social Media on
            <br />
            Autopilot
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Queue topics, set your schedule, and let AI generate tailored content,
            images, and hashtags—then auto-publish across all platforms.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 h-12 px-8 text-lg">
                Start Free
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                View Demo
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-12 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-violet-500/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <CardTitle>Topic Pipelines</CardTitle>
              <CardDescription>
                Queue topics like &quot;DevOps trends&quot; or &quot;SEO tips&quot;—system processes them sequentially with smart recycling.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-blue-500/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <CardTitle>AI-Powered Content</CardTitle>
              <CardDescription>
                Generates platform-optimized posts, hashtags, and images using your brand voice and topic context.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-emerald-500/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle>Smart Scheduling</CardTitle>
              <CardDescription>
                Set frequency and time (e.g., every Friday 6 PM PKT), optional review reminders, auto-proceed if ignored.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* Platforms */}
        <section className="py-12 text-center">
          <p className="text-sm text-muted-foreground mb-6">Publish to all major platforms</p>
          <div className="flex items-center justify-center gap-8 opacity-60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#1877F2]/20 flex items-center justify-center">
                <span className="text-[#1877F2] font-bold text-sm">f</span>
              </div>
              <span className="text-sm">Facebook</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#0A66C2]/20 flex items-center justify-center">
                <span className="text-[#0A66C2] font-bold text-sm">in</span>
              </div>
              <span className="text-sm">LinkedIn</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
                <span className="font-bold text-sm">𝕏</span>
              </div>
              <span className="text-sm">X (Twitter)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#E4405F]/20 flex items-center justify-center">
                <span className="text-[#E4405F] font-bold text-sm">◎</span>
              </div>
              <span className="text-sm">Instagram</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-br from-violet-950/50 to-blue-950/50 border-violet-500/20">
            <CardContent className="pt-8 pb-8">
              <h2 className="text-3xl font-bold mb-4">Ready to automate?</h2>
              <p className="text-muted-foreground mb-6">
                Join 100+ solo founders saving 10-20 hours per week on social media.
              </p>
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700">
                  Start Your Free Pipeline
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>Built by <a href="https://rapidnextech.com" className="text-violet-400 hover:underline">RapidNexTech</a> • Self-hosted • Zero vendor bills</p>
        </div>
      </footer>
    </div>
  );
}
