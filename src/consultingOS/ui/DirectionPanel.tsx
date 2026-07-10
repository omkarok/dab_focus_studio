// Part I — Direction: Vision, Mission, the seven non-negotiables, the flywheel.
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  VISION,
  VISION_DETAIL,
  MISSION,
  MISSION_DETAIL,
  NON_NEGOTIABLES,
  FLYWHEEL,
  OS_VERSION,
} from "../os";
import { Compass, Target, ShieldAlert, RefreshCw, ArrowDown } from "lucide-react";

export default function DirectionPanel() {
  return (
    <div className="space-y-6">
      {/* Vision + Mission */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-accent">
              <Compass className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Vision</span>
            </div>
            <p className="text-base font-semibold leading-snug text-foreground">{VISION}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{VISION_DETAIL}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-center gap-2 text-accent">
              <Target className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Mission</span>
            </div>
            <p className="text-base font-semibold leading-snug text-foreground">{MISSION}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{MISSION_DETAIL}</p>
          </CardContent>
        </Card>
      </div>

      {/* Non-negotiables */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">The Non-Negotiables — Operating Doctrine</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {NON_NEGOTIABLES.map((d) => (
            <div
              key={d.n}
              className="rounded-xl border border-border bg-card p-3.5 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                  {d.n}
                </span>
                <span className="text-sm font-semibold leading-tight">{d.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Flywheel */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">Operating Strategy — The Flywheel</h2>
        </div>
        <Card className="rounded-2xl">
          <CardContent className="pt-5">
            <div className="flex flex-col gap-2 max-w-2xl mx-auto">
              {FLYWHEEL.map((node, i) => (
                <React.Fragment key={node.id}>
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-2.5">
                    <div className="text-sm font-semibold text-foreground">{node.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {node.detail}
                    </div>
                  </div>
                  {i < FLYWHEEL.length - 1 && (
                    <ArrowDown className="h-4 w-4 text-muted-foreground/50 mx-auto" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed border-t border-border pt-3">
              <strong className="text-foreground">Capital model:</strong> services gross margin is
              the investment budget — allocated every quarter across platform IP, research, and
              reserve. Distribution of profit is what's left after the flywheel is fed, not the
              other way around.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-2 pt-1">
        <Badge variant="secondary" className="text-[10px]">
          bots.ai Operating System · v{OS_VERSION}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          Canonical core, variance externalized as data. The engine never forks.
        </span>
      </div>
    </div>
  );
}
