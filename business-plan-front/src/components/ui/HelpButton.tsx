import { useState } from 'react'

interface HelpButtonProps {
  title: string
  content: string
}

export default function HelpButton({ title, content }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Aide"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 16px',
          borderRadius: 999,
          border: '1.5px solid var(--color-primary)',
          background: 'var(--color-primary)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          lineHeight: 1,
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget
          btn.style.background = 'var(--color-primary-hover)'
          btn.style.borderColor = 'var(--color-primary-hover)'
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget
          btn.style.background = 'var(--color-primary)'
          btn.style.borderColor = 'var(--color-primary)'
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <i className="fas fa-circle-question" style={{ fontSize: 15 }} />
        Aide
      </button>

      {open && (
        <>
          {/* Overlay sombre pour fermer en cliquant dehors */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 998,
              background: 'rgba(0,0,0,0.35)',
            }}
          />

          {/* Modal centré */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 999,
              width: 'min(560px, 92vw)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              padding: 'var(--space-6)',
            }}
          >
            {/* En-tête */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              <strong style={{ fontSize: 'var(--text-md)', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--color-primary)', fontSize: 16 }}>?</span>
                {title}
              </strong>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Contenu */}
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.8, whiteSpace: 'pre-line', maxHeight: '60vh', overflowY: 'auto' }}>
              {content}
            </div>
          </div>
        </>
      )}
    </div>
  )
}