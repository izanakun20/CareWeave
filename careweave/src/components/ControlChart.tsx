"use client";

import React from "react";

interface ControlChartProps {
  weeklyZ: number[];
  departmentName: string;
}

const W = 560;
const H = 170;
const PAD_LEFT = 28;
const PAD_RIGHT = 14;
const PAD_TOP = 12;
const PAD_BOTTOM = 18;

function xCoord(i: number): number {
  return PAD_LEFT + (i * (W - PAD_LEFT - PAD_RIGHT)) / 51;
}

function yCoord(v: number): number {
  const clamped = Math.max(-4, Math.min(4, v));
  return H / 2 - (clamped * (H / 2 - PAD_TOP)) / 4;
}

export default function ControlChart({ weeklyZ, departmentName }: ControlChartProps) {
  const lines: Array<{ y: number; stroke: string; dash: string; label: string }> = [
    { y: 3, stroke: "#E5484D", dash: "", label: "+3σ" },
    { y: -3, stroke: "#E5484D", dash: "", label: "-3σ" },
    { y: 2, stroke: "#94a3b8", dash: "4 4", label: "+2σ" },
    { y: -2, stroke: "#94a3b8", dash: "4 4", label: "-2σ" },
    { y: 0, stroke: "#334155", dash: "", label: "" },
  ];

  const octX = xCoord(39);
  const polylinePoints = weeklyZ
    .map((v, i) => `${xCoord(i)},${yCoord(v)}`)
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Weekly wait z-score for ${departmentName}. Dashed lines at ±2 sigma, solid red lines at ±3 sigma. Oct to Dec shaded.`}
        className="w-full h-auto"
        style={{ maxHeight: 200 }}
      >
        {/* Oct–Dec shading (weeks 39–51) */}
        <rect
          x={octX}
          y={0}
          width={W - PAD_RIGHT - octX}
          height={H}
          fill="#19E3F5"
          opacity={0.05}
        />

        {/* Reference lines */}
        {lines.map((l) => (
          <line
            key={l.y}
            x1={PAD_LEFT}
            x2={W - PAD_RIGHT}
            y1={yCoord(l.y)}
            y2={yCoord(l.y)}
            stroke={l.stroke}
            strokeDasharray={l.dash}
            strokeWidth={1}
          />
        ))}

        {/* Data polyline */}
        <polyline
          fill="none"
          stroke="#19E3F5"
          strokeWidth={1.5}
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* Data points */}
        {weeklyZ.map((v, i) => {
          const isOutlier = Math.abs(v) > 3;
          return (
            <circle
              key={i}
              cx={xCoord(i)}
              cy={yCoord(v)}
              r={isOutlier ? 4 : 2}
              fill={isOutlier ? "#E5484D" : "#19E3F5"}
            >
              <title>
                Week {i + 1}: z = {v.toFixed(1)}
              </title>
            </circle>
          );
        })}

        {/* Labels */}
        <g fill="#64748b" fontSize={10}>
          <text x={2} y={yCoord(3) + 4}>
            +3
          </text>
          <text x={2} y={yCoord(-3) + 4}>
            -3
          </text>
          <text x={2} y={yCoord(2) + 4}>
            +2
          </text>
          <text x={2} y={yCoord(-2) + 4}>
            -2
          </text>
          <text x={octX + 4} y={12} fill="#19E3F5" opacity={0.7} fontSize={9}>
            Oct–Dec
          </text>
          <text x={PAD_LEFT} y={H - 2}>
            Jan
          </text>
          <text x={W - PAD_RIGHT - 26} y={H - 2}>
            Dec
          </text>
        </g>
      </svg>
      <p className="text-xs text-slate-500 mt-1">
        Dashed: ±2σ · Solid red: ±3σ · Shaded: Oct–Dec (unseen when model was fit)
      </p>
    </div>
  );
}
