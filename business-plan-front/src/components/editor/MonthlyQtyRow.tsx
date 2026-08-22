/**
 * Ligne de saisie de 12 valeurs mensuelles (quantités ou coefficients).
 * Inline editable — blur déclenche la mise à jour.
 */
interface Props {
  label: string
  values: number[]
  months: string[]
  onChange: (monthIndex: number, value: number) => void
  step?: number
  isDecimal?: boolean
}

export default function MonthlyQtyRow({
  label,
  values,
  months,
  onChange,
  step = 1,
  isDecimal = false,
}: Props) {
  return (
    <div>
      <p className="form-label" style={{ marginBottom: 'var(--space-2)' }}>{label}</p>
      <div style={styles.grid}>
        {months.map((month, i) => (
          <div key={i} style={styles.cell}>
            <span style={styles.monthLabel}>{month}</span>
            <input
              type="number"
              className="editable-cell"
              style={{ width: '100%', textAlign: 'right', fontSize: 'var(--text-xs)' }}
              step={step}
              min={0}
              defaultValue={values[i] ?? 0}
              onBlur={(e) => {
                const val = isDecimal
                  ? parseFloat(e.target.value) || 0
                  : parseInt(e.target.value, 10) || 0
                onChange(i, val)
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: 4,
    overflowX: 'auto',
  },
  cell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 52,
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
}
