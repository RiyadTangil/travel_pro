interface EntityRow {
  label: string
  value: string
}

interface LedgerEntityCardProps {
  title: string
  rows: EntityRow[]
}

export function LedgerEntityCard({ title, rows }: LedgerEntityCardProps) {
  return (
    <div className="flex justify-end">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {rows.map(({ label, value }) => (
            <div
              key={label}
              className="flex justify-between items-start text-sm"
            >
              <span className="text-gray-500 font-medium">
                {label}
              </span>
              <span
                className={`text-right ${
                  value
                    ? "text-amber-600 font-semibold"
                    : "text-gray-400"
                }`}
              >
                {value || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}