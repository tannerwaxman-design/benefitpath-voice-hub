import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useWarRoom } from "@/hooks/use-war-room";
import { useCountUp } from "@/hooks/use-count-up";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Phone, Calendar, Users, TrendingUp, Clock, Radio,
} from "lucide-react";

/* ── Enrollment period helper ─────────────────────────────────────────── */

function getEnrollmentInfo(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  // AEP: Oct 15 – Dec 7
  if ((month === 9 && day >= 15) || month === 10 || (month === 11 && day <= 7)) {
    const deadline = new Date(year, 11, 7, 23, 59, 59);
    return {
      name: "Annual Enrollment Period",
      dateRange: `October 15 — December 7, ${year}`,
      diff: deadline.getTime() - now.getTime(),
      closing: true,
    };
  }
  // OEP: Jan 1 – Mar 31
  if (month <= 2) {
    const deadline = new Date(year, 2, 31, 23, 59, 59);
    return {
      name: "Open Enrollment Period",
      dateRange: `January 1 — March 31, ${year}`,
      diff: deadline.getTime() - now.getTime(),
      closing: true,
    };
  }
  // Off-season → count to next AEP
  const nextAep = new Date(year, 9, 15);
  if (nextAep <= now) nextAep.setFullYear(year + 1);
  return {
    name: "Off-Season",
    dateRange: `Next AEP: October 15, ${nextAep.getFullYear()}`,
    diff: nextAep.getTime() - now.getTime(),
    closing: false,
  };
}

function fmtCountdown(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = String(Math.floor((t % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");
  return { d, h, m, s };
}

/* ── Call timer (ticking) ─────────────────────────────────────────────── */

function CallTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const origin = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - origin) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return (
    <span>
      {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
    </span>
  );
}

/* ── Stat card ────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  displayOverride,
  sub,
  positive,
}: {
  label: string;
  value: number;
  displayOverride?: string;
  sub: string;
  positive?: boolean;
}) {
  const animated = useCountUp(Math.round(value), 600);
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 md:p-6 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <span className="text-4xl md:text-5xl font-black text-white tabular-nums leading-tight">
        {displayOverride ?? animated}
      </span>
      <span
        className={`text-xs ${
          positive === true
            ? "text-emerald-400"
            : positive === false
            ? "text-red-400"
            : "text-slate-400"
        }`}
      >
        {sub}
      </span>
    </div>
  );
}

/* ── Pulsing dot ──────────────────────────────────────────────────────── */

function PulseDot({ active, size = "h-3 w-3" }: { active: boolean; size?: string }) {
  if (!active) return <span className={`inline-flex rounded-full ${size} bg-slate-600`} />;
  return (
    <span className={`relative flex ${size}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className={`relative inline-flex rounded-full ${size} bg-red-500`} />
    </span>
  );
}

/* ── Main page ────────────────────────────────────────────────────────── */

export default function WarRoom() {
  const {
    stats,
    activeCalls,
    leaderboard,
    appointmentFeed,
    hourlyBreakdown,
    campaigns,
    hasActiveCalls,
  } = useWarRoom();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const enrollment = getEnrollmentInfo(now);
  const cd = fmtCountdown(enrollment.diff);

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-auto">
        {/* ── TOP BAR ─────────────────────────────────────────────────── */}
        <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <PulseDot active={hasActiveCalls} />
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    hasActiveCalls ? "text-red-400" : "text-slate-500"
                  }`}
                >
                  {hasActiveCalls ? "LIVE" : "STANDBY"}
                </span>
              </div>
              <h1 className="text-base md:text-lg font-bold text-white">
                BenefitPath War Room
              </h1>
              <span className="text-xs md:text-sm text-slate-400 hidden sm:inline">
                {format(now, "EEEE, MMMM d, yyyy")} — {format(now, "h:mm:ss a")}
              </span>
            </div>

            {/* Right — enrollment countdown */}
            <div className="flex items-center gap-5">
              <div className="text-right hidden md:block">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {enrollment.name}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">{enrollment.dateRange}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                  {enrollment.closing ? "CLOSES IN" : "STARTS IN"}
                </p>
                <p className="text-xl md:text-2xl font-black text-white tabular-nums">
                  {cd.d > 0 && (
                    <span>
                      {cd.d}
                      <span className="text-xs text-slate-500 ml-0.5 mr-1.5">d</span>
                    </span>
                  )}
                  {cd.h}
                  <span className="text-xs text-slate-500">:</span>
                  {cd.m}
                  <span className="text-xs text-slate-500">:</span>
                  {cd.s}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ── BODY ────────────────────────────────────────────────────── */}
        <div className="p-4 md:p-6 space-y-6">
          {/* ROW 1 — Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              label="Calls Today"
              value={stats.totalCalls}
              sub={`${stats.vsYesterdayPercent >= 0 ? "▲" : "▼"} ${Math.abs(stats.vsYesterdayPercent).toFixed(0)}% vs yesterday`}
              positive={stats.vsYesterdayPercent >= 0}
            />
            <StatCard
              label="Connected"
              value={stats.connected}
              sub={`Connect rate: ${stats.connectRate.toFixed(1)}%`}
              positive={stats.connectRate > 40}
            />
            <StatCard
              label="Appointments Booked"
              value={stats.appointments}
              sub={`Conversion: ${stats.conversionRate.toFixed(1)}%`}
              positive={stats.conversionRate > 10}
            />
            <StatCard
              label="Dollars Spent Today"
              value={stats.dollarsSpent}
              displayOverride={`$${stats.dollarsSpent.toFixed(2)}`}
              sub={
                stats.appointments > 0
                  ? `Avg cost per appt: $${stats.avgCostPerAppt.toFixed(2)}`
                  : "No appointments yet"
              }
            />
          </div>

          {/* ROW 2 — Live Calls */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-red-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Live Calls ({activeCalls.length} active)
              </h2>
            </div>

            {activeCalls.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {activeCalls.map((call) => (
                  <div
                    key={call.id}
                    className="min-w-[220px] bg-slate-900/80 border border-red-500/20 rounded-xl p-4 shrink-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <PulseDot active size="h-2 w-2" />
                      <span className="text-lg font-bold text-white tabular-nums">
                        <CallTimer startedAt={call.started_at} />
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white truncate">
                      {call.contact_name || "Unknown Contact"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Agent: {(call as any).agents?.agent_name || "—"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 tabular-nums">
                      {call.to_number}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8 text-center">
                <p className="text-sm text-slate-500">No active calls right now.</p>
              </div>
            )}
          </section>

          {/* ROW 3 — Leaderboard + Appointment Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
            {/* Leaderboard */}
            <section className="lg:col-span-3">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-blue-400" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Agent Leaderboard — Today
                </h2>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="text-left p-3">#</th>
                      <th className="text-left p-3">Agent</th>
                      <th className="text-right p-3">Calls</th>
                      <th className="text-right p-3 hidden sm:table-cell">Connected</th>
                      <th className="text-right p-3">Appts</th>
                      <th className="text-right p-3">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length > 0 ? (
                      leaderboard.map((agent, i) => (
                        <tr
                          key={agent.agentId}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="p-3 text-slate-400">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                          </td>
                          <td className="p-3 text-white font-medium truncate max-w-[160px]">
                            {agent.name}
                          </td>
                          <td className="p-3 text-right text-slate-300 tabular-nums">
                            {agent.calls}
                          </td>
                          <td className="p-3 text-right text-slate-300 tabular-nums hidden sm:table-cell">
                            {agent.connected}
                          </td>
                          <td className="p-3 text-right text-emerald-400 font-bold tabular-nums">
                            {agent.appointments}
                          </td>
                          <td className="p-3 text-right text-slate-300 tabular-nums">
                            {agent.rate.toFixed(1)}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                          No calls today yet.
                        </td>
                      </tr>
                    )}
                    {leaderboard.length > 1 && (
                      <tr className="bg-slate-800/30 font-semibold">
                        <td className="p-3" />
                        <td className="p-3 text-slate-300">TEAM TOTAL</td>
                        <td className="p-3 text-right text-white tabular-nums">
                          {stats.totalCalls}
                        </td>
                        <td className="p-3 text-right text-white tabular-nums hidden sm:table-cell">
                          {stats.connected}
                        </td>
                        <td className="p-3 text-right text-emerald-400 tabular-nums">
                          {stats.appointments}
                        </td>
                        <td className="p-3 text-right text-white tabular-nums">
                          {stats.conversionRate.toFixed(1)}%
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Appointment Feed */}
            <section className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Appointments — Live Feed
                </h2>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 max-h-[400px] overflow-y-auto">
                {appointmentFeed.length > 0 ? (
                  <div className="space-y-2">
                    {appointmentFeed.map((appt) => (
                      <div
                        key={appt.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/30 transition-colors"
                      >
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {appt.contactName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {format(new Date(appt.time), "h:mm a")} · Agent:{" "}
                            {appt.agentName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No appointments booked today yet.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* ROW 4 — Hourly Chart */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Today by Hour
              </h2>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-6">
              {hourlyBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourlyBreakdown}>
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={(h: number) =>
                        `${h > 12 ? h - 12 : h || 12}${h >= 12 ? "PM" : "AM"}`
                      }
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="calls"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="Calls"
                    />
                    <Bar
                      dataKey="appointments"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      name="Appointments"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">
                  No call data today yet.
                </p>
              )}
            </div>
          </section>

          {/* ROW 5 — Campaign Status */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-violet-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Active Campaigns
              </h2>
            </div>
            <div className="space-y-3">
              {campaigns.length > 0 ? (
                campaigns.map((c) => {
                  const pct =
                    c.total_contacts > 0
                      ? (c.contacts_called / c.total_contacts) * 100
                      : 0;
                  return (
                    <div
                      key={c.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                        <span className="text-sm font-medium text-white">
                          {c.name}
                        </span>
                        <span className="text-xs text-slate-400 tabular-nums">
                          {c.contacts_called}/{c.total_contacts} contacts ·{" "}
                          {pct.toFixed(1)}% · {c.appointments_set} appts
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6 text-center">
                  <p className="text-sm text-slate-500">No active campaigns.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
