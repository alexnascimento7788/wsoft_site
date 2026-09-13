import statesData from './brazil-states.json'

const HIGHLIGHTED: Record<string, { label: string; markerX: number; markerY: number }> = {
  mt: { label: 'Mato Grosso', markerX: 282, markerY: 281 },
  sp: { label: 'São Paulo', markerX: 396, markerY: 442 },
  mg: { label: 'Minas Gerais', markerX: 446, markerY: 376 },
}

// State outlines: @svg-maps/brazil (CC-BY-4.0, github.com/VictorCazanave/svg-maps)
export function BrazilMap() {
  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={statesData.viewBox}
        className="w-full max-w-sm"
        role="img"
        aria-label="Mapa do Brasil destacando Minas Gerais, São Paulo e Mato Grosso"
      >
        {statesData.locations.map((state) => (
          <path
            key={state.id}
            d={state.path}
            fill={HIGHLIGHTED[state.id] ? '#6BBF4E' : '#EDEDED'}
            stroke="#FFFFFF"
            strokeWidth="1"
          />
        ))}
        {Object.entries(HIGHLIGHTED).map(([id, state]) => (
          <circle key={id} cx={state.markerX} cy={state.markerY} r="7" fill="#E8671A" stroke="#FFFFFF" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {Object.values(HIGHLIGHTED).map((state) => (
          <span key={state.label} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#E8671A]" />
            {state.label}
          </span>
        ))}
      </div>
    </div>
  )
}
