import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/benefit_path_icon.svg";
import {
  Bot,
  Phone,
  BarChart3,
  Shield,
  Zap,
  Users,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Globe,
  Headphones,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Voice Agents",
    desc: "Build intelligent agents that hold natural conversations, handle objections, and book appointments — without writing a single line of code.",
  },
  {
    icon: Phone,
    title: "Outbound Campaigns",
    desc: "Launch high-volume calling campaigns with smart scheduling, retry logic, and real-time performance tracking.",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    desc: "Sentiment analysis, conversion funnels, heatmaps, and agent performance — all in real time.",
  },
  {
    icon: Shield,
    title: "TCPA Compliant",
    desc: "Built-in DNC management, consent tracking, recording disclosures, and calling-window enforcement.",
  },
  {
    icon: Zap,
    title: "Instant Transfers",
    desc: "Warm-transfer high-intent prospects to your team with context and conversation history intact.",
  },
  {
    icon: Users,
    title: "Contact Intelligence",
    desc: "Import, tag, and segment contacts. Track every interaction across campaigns and calls.",
  },
];

const stats = [
  { value: "10x", label: "More calls per rep" },
  { value: "85%", label: "Connect rate" },
  { value: "3.2x", label: "ROI increase" },
  { value: "<2min", label: "Agent setup time" },
];

const steps = [
  {
    num: "01",
    icon: Sparkles,
    title: "Build Your Agent",
    desc: "Configure voice, personality, scripts, and call objectives in our no-code builder.",
  },
  {
    num: "02",
    icon: Globe,
    title: "Connect Numbers",
    desc: "Import your Twilio numbers or provision new ones — ready to dial in seconds.",
  },
  {
    num: "03",
    icon: Headphones,
    title: "Launch Campaigns",
    desc: "Upload contacts, set schedules, and let your AI agents make thousands of calls.",
  },
  {
    num: "04",
    icon: TrendingUp,
    title: "Analyze & Optimize",
    desc: "Track outcomes, review transcripts, and refine your approach with real data.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 lg:px-20 py-5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="BenefitPath" className="h-9 w-auto" />
          <span className="text-xl font-bold tracking-tight">BenefitPath</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
              Sign In
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
              Get Started Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 md:px-12 lg:px-20 pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">



          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Your AI Sales Team
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Never Sleeps
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Deploy intelligent voice agents that make thousands of outbound calls,
            qualify leads, book appointments, and transfer hot prospects — all on autopilot.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-base px-8 py-6 shadow-xl shadow-indigo-500/25 group"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white text-base px-8 py-6"
              >
                View Demo
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> $10 free credits
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Setup in 2 min
            </span>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-y border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                {s.value}
              </p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative px-6 md:px-12 lg:px-20 py-24 md:py-32">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-indigo-400 text-sm font-semibold uppercase tracking-wider mb-3">
              Platform Features
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Everything you need to
              <br />
              <span className="text-indigo-400">scale outbound</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                  <f.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-6 md:px-12 lg:px-20 py-24 md:py-32 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              From zero to calling
              <br />
              <span className="text-emerald-400">in minutes</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                <span className="text-6xl font-black text-slate-800 absolute -top-4 -left-2 select-none">
                  {step.num}
                </span>
                <div className="relative z-10 pt-8">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                    <step.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 md:px-12 lg:px-20 py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Ready to automate
            <br />
            your outbound calls?
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
            Join teams that are booking 3x more appointments with AI voice agents. Start your free trial today.
          </p>
          <Link to="/signup">
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-base px-10 py-6 shadow-xl shadow-indigo-500/25 group"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 md:px-12 lg:px-20 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="BenefitPath" className="h-7 w-auto" />
            <span className="font-semibold text-sm">BenefitPath Voice AI</span>
          </div>
          <p className="text-sm text-slate-600">
            © {new Date().getFullYear()} BenefitPath. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
