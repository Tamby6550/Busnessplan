function formatAriary(n: number) { return String(n) }

function FinancingCell({ pct, totalAmount, onPctChange, onPctBlur }: { pct: number; totalAmount: number; onPctChange: (v: number) => void; onPctBlur: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        <input
          type="number" className="editable-cell"
          style={{ width: 70, textAlign: 'right' }}
          value={pct} min={0} max={100} step={0.1}
          onChange={(e) => onPctChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
          onBlur={(e) => onPctBlur(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        />
        <span style={{ fontSize: 12 }}>%</span>
      </div>
      <div style={{ fontSize: 11 }}>
        {formatAriary(Math.round(totalAmount * pct / 100))}
      </div>
    </div>
  )
}
export default FinancingCell
