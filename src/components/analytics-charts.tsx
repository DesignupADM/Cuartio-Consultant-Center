"use client"

import * as React from "react"
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// --- Custom Colors for High-Contrast Theme ---
const colors = {
  primary: "hsl(var(--primary))",
  muted: "hsl(var(--muted))",
  border: "hsl(var(--border))",
  foreground: "hsl(var(--foreground))",
  accent: "hsl(var(--accent))",
  vibrant: ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"]
}

// --- 1. Pipeline Funnel (Simplified Bar Chart) ---
export function PipelineFunnel({ data }: { data: any[] }) {
  return (
    <Card className="border-none ring-1 ring-border bg-card/50 shadow-none overflow-hidden">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider opacity-70">Mandate Pipeline</CardTitle>
        <CardDescription className="text-xs">Conversion funnel from application to hire.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="stage" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                width={100} 
                fontSize={10}
                className="font-bold uppercase tracking-tighter"
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border px-3 py-2 rounded-lg shadow-xl ring-1 ring-border">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">{payload[0].payload.stage}</p>
                        <p className="text-sm font-bold">{payload[0].value} Candidates</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : `hsla(var(--primary), ${1 - (index * 0.2)})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// --- 2. Geographical Distribution (Bar Chart) ---
export function GeographicalReach({ data }: { data: any[] }) {
  return (
    <Card className="border-none ring-1 ring-border bg-card/50 shadow-none overflow-hidden">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider opacity-70">Geographical Presence</CardTitle>
        <CardDescription className="text-xs">Network penetration by global region.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="region" axisLine={false} tickLine={false} fontSize={10} className="font-medium" />
              <YAxis axisLine={false} tickLine={false} fontSize={10} className="font-medium" />
              <Tooltip 
                cursor={{ fill: 'hsla(var(--primary), 0.05)' }}
                content={({ active, payload }) => {
                   if (active && payload && payload.length) {
                     return (
                       <div className="bg-background border px-3 py-2 rounded-lg shadow-xl ring-1 ring-border">
                         <p className="text-[10px] font-black uppercase text-muted-foreground">{payload[0].payload.region}</p>
                         <p className="text-sm font-bold">{payload[0].value} Consultants</p>
                       </div>
                     )
                   }
                   return null
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// --- 3. Skills Radar Chart ---
export function SkillsMatrix({ data }: { data: any[] }) {
  return (
    <Card className="border-none ring-1 ring-border bg-card/50 shadow-none overflow-hidden">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider opacity-70">Competency Matrix</CardTitle>
        <CardDescription className="text-xs">Demand vs. Available skills in the network.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} />
              <Radar
                name="Demand"
                dataKey="A"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name="Supply"
                dataKey="B"
                stroke="hsl(var(--accent))"
                fill="hsl(var(--accent))"
                fillOpacity={0.1}
                strokeWidth={2}
              />
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border px-3 py-2 rounded-lg shadow-xl ring-1 ring-border text-xs">
                      <p className="font-black uppercase mb-1">{payload[0].payload.subject}</p>
                      {payload.map((p: any) => (
                        <div key={p.name} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-muted-foreground">{p.name}:</span>
                          <span className="font-bold">{p.value}%</span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 20 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// --- 4. Efficiency Metrics Card ---
export function EfficiencyMetrics({ label, value, trend, trendValue }: { label: string, value: string, trend: "up" | "down", trendValue: string }) {
  return (
    <div className="p-6 rounded-2xl ring-1 ring-border bg-card/50">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-2xl font-bold tracking-tighter">{value}</h3>
        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${trend === 'up' ? 'text-emerald-500 bg-emerald-500/5' : 'text-rose-500 bg-rose-500/5'}`}>
          {trend === 'up' ? '▲' : '▼'} {trendValue}
        </div>
      </div>
    </div>
  )
}
