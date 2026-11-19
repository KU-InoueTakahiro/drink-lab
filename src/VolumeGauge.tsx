import { drinks, type Layer } from "./drinks";
import { CAPACITY, mixColor, totalVolume } from "./engine";

export function VolumeGauge({
  layers,
  mixing,
  mixed,
}: {
  layers: Layer[];
  mixing: boolean;
  mixed: boolean;
}) {
  const total = totalVolume(layers);
  return (
    <div
      className="volume-track"
      role="progressbar"
      aria-label="グラスの容量"
      aria-valuemin={0}
      aria-valuemax={CAPACITY}
      aria-valuenow={Math.round(total)}
      aria-valuetext={`${Math.round(total)} / ${CAPACITY} ml、${mixed ? "混合済み" : mixing ? "混合中" : "注いだ順に層表示"}`}
    >
      <div
        className="volume-stack"
        style={{ width: `${(total / CAPACITY) * 100}%` }}
        aria-hidden="true"
      >
        {layers.map((layer, index) => (
          <span
            key={index}
            className="volume-segment"
            data-drink-id={layer.drinkId}
            style={{
              width: `${(layer.ml / total) * 100}%`,
              backgroundColor: drinks.find(
                (drink) => drink.id === layer.drinkId,
              )!.color,
            }}
          />
        ))}
        {(mixing || mixed) && (
          <span
            className={`volume-blend ${mixed ? "is-mixed" : "is-mixing"}`}
            style={{ backgroundColor: mixColor(layers) }}
          />
        )}
      </div>
    </div>
  );
}
