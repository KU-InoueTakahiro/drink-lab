import { useId } from "react";
import type { DrinkId, Layer } from "./drinks";
import { drinks, carbonatedDrinks } from "./drinks";
import { CAPACITY, mixColor, totalVolume } from "./engine";
export function Glass({
  layers,
  active,
  mixing,
  mixed,
  settling = 0,
}: {
  layers: Layer[];
  active: DrinkId | null;
  mixing: boolean;
  mixed: boolean;
  settling?: number;
}) {
  const id = useId().replace(/:/g, "");
  const total = totalVolume(layers);
  let bottom = 254;
  return (
    <svg
      className={`glass ${mixing ? "mixing" : ""}`}
      viewBox="0 0 300 300"
      role="img"
      aria-label={`グラスの中に${Math.round(total)}ml${mixed ? "、混合済み" : ""}`}
    >
      <defs>
        <clipPath id={id}>
          <path d="M71 66 Q150 77 229 66 L210 248 Q208 266 150 268 Q92 266 90 248 Z" />
        </clipPath>
        <linearGradient id={`${id}shine`}>
          <stop stopColor="white" stopOpacity=".5" />
          <stop offset=".5" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="white" stopOpacity=".25" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="279" rx="88" ry="10" fill="#6b4e40" opacity=".09" />
      <path
        d="M68 65 Q150 80 232 65 L213 251 Q210 273 150 276 Q90 273 87 251 Z"
        fill="#fff"
        fillOpacity=".32"
        stroke="#A3C4BF"
        strokeWidth="3"
      />
      <g clipPath={`url(#${id})`}>
        {layers.map((layer, index) => {
          const height = (layer.ml / CAPACITY) * 182;
          bottom -= height;
          return (
            <rect
              style={
                { "--layer-number": index } as import("react").CSSProperties
              }
              className="liquid-layer"
              key={index}
              x="70"
              y={bottom}
              width="162"
              height={height + 0.5}
              fill={drinks.find((d) => d.id === layer.drinkId)!.color}
            />
          );
        })}
        {(mixing || mixed) && (
          <rect
            className={`blended ${mixed ? "visible" : ""} ${mixing ? "blending" : ""}`}
            x="70"
            y={254 - (total / CAPACITY) * 182}
            width="162"
            height={(total / CAPACITY) * 182 + 14}
            fill={mixColor(layers)}
          />
        )}
        {total > 0 && (
          <>
            <ellipse
              key={`surface-${settling}`}
              className={
                active || mixing
                  ? "surface ripple"
                  : settling
                    ? "surface settling"
                    : "surface"
              }
              cx="150"
              cy={254 - (total / CAPACITY) * 182}
              rx="80"
              ry="5"
              fill={
                mixed || mixing
                  ? mixColor(layers)
                  : drinks.find((d) => d.id === layers.at(-1)?.drinkId)!.color
              }
            />
            <g fill="white" opacity=".5">
              {[0, 1, 2, 3, 4].map((n) => (
                <circle
                  className={
                    active && carbonatedDrinks.has(active)
                      ? "bubble floating fizzy"
                      : "bubble"
                  }
                  key={n}
                  cx={108 + n * 21}
                  cy={246 - (n % 3) * 15}
                  r={2 + (n % 2)}
                  style={{ animationDelay: `${n * 0.2}s` }}
                />
              ))}
            </g>
          </>
        )}
        <path
          d="M88 84 L103 240 Q104 247 113 248"
          fill="none"
          stroke="white"
          strokeOpacity=".6"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M211 89 L198 226"
          stroke="white"
          strokeOpacity=".3"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect
          x="70"
          y="65"
          width="162"
          height="210"
          fill={`url(#${id}shine)`}
        />
      </g>
      <ellipse
        cx="150"
        cy="65"
        rx="82"
        ry="10"
        fill="white"
        fillOpacity=".15"
        stroke="#A3C4BF"
        strokeWidth="3"
      />
      {[0, 1, 2].map((n) => (
        <g key={n}>
          <path
            d={`M211 ${111 + n * 48}h11`}
            stroke="#83A6A0"
            strokeWidth="2"
          />
          <text x="238" y={115 + n * 48} fontSize="9" fill="#8C9D96">
            {300 - n * 100}
          </text>
        </g>
      ))}
      {!total && (
        <>
          <text
            x="150"
            y="178"
            textAnchor="middle"
            fill="#A3B8AE"
            fontSize="22"
          >
            ✧
          </text>
          <text
            x="150"
            y="203"
            textAnchor="middle"
            fill="#8CA69D"
            fontSize="11"
          >
            なにを注ごう？
          </text>
        </>
      )}
      {active && (
        <path
          className="stream"
          d={`M150 0 Q145 28 150 52 L150 ${254 - (total / CAPACITY) * 182}`}
          stroke={drinks.find((d) => d.id === active)!.color}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {mixed && (
        <g className="sparkles" fill="#E5B956">
          <text x="45" y="110" fontSize="25">
            ✦
          </text>
          <text x="244" y="165" fontSize="20">
            ✧
          </text>
          <text x="230" y="45" fontSize="28">
            ✦
          </text>
        </g>
      )}
    </svg>
  );
}
