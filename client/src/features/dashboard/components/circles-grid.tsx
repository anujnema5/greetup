import { memo } from "react";
import { Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CIRCLES } from "../constants/mock-data";

function CirclesGridInner() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Active Circles</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Drop into a live conversation</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-primary font-medium hover:underline cursor-pointer"
        >
          See all <ChevronRight size={12} />
        </button>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-1 md:overflow-visible md:grid md:gap-3 scrollbar-none"
        style={{ gridTemplateColumns: `repeat(${CIRCLES.length}, 1fr)` }}
      >
        {CIRCLES.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group relative flex-none w-36 md:w-auto h-44 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-linear-to-br",
              c.cover
            )}
            style={{ boxShadow: "0 1px 0 0 rgba(255,255,255,0.08) inset, 0 4px 20px rgba(0,0,0,0.4)" }}
          >
            <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 group-hover:ring-white/25 transition-all duration-300 pointer-events-none" />

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[9px] font-bold text-white tracking-widest">LIVE</span>
            </div>
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-1.5 py-0.5">
              <Users size={9} className="text-white/70" />
              <span className="text-[10px] text-white font-semibold">{c.count}</span>
            </div>

            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-8 pb-3">
              <p className="text-xs font-bold text-white leading-snug drop-shadow-sm">{c.topic}</p>
              <p className="text-[10px] text-white/50 mt-0.5">by {c.host}</p>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-[11px] font-semibold text-white bg-white/15 border border-white/20 rounded-full px-3.5 py-1 backdrop-blur-sm shadow-lg">
                Join →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const CirclesGrid = memo(CirclesGridInner);
