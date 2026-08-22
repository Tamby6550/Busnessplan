import { useState, useEffect, useRef, forwardRef } from 'react'

interface NumInputProps {
  defaultValue: number
  onBlur: (value: number) => void
  className?: string
  style?: React.CSSProperties
  min?: number
  step?: number
  placeholder?: string
  disabled?: boolean
}

/**
 * Parse une saisie utilisateur en nombre : retire les espaces (séparateur de milliers,
 * y compris espace insécable) et remplace la virgule décimale par un point.
 * Exportée pour être réutilisée par les grilles qui lisent une valeur via ref (ex: "Enregistrer tout").
 */
export function parseFormattedNum(raw: string): number {
  const cleaned = raw.replace(/[\s  ]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

function formatNum(value: number, isDecimal: boolean): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: isDecimal ? 2 : 0 }).format(value)
}

/**
 * Champ numérique avec séparateur de milliers pendant la saisie (ex: "3 000").
 * Affiche la valeur brute (sans séparateur) une fois le champ focus pour une édition simple,
 * puis reformate au blur. Transmet un ref vers l'input DOM sous-jacent (utile pour les grilles
 * qui lisent plusieurs cellules d'un coup via ref, ex: "Enregistrer tout").
 */
const NumInput = forwardRef<HTMLInputElement, NumInputProps>(function NumInput({
  defaultValue,
  onBlur,
  className,
  style,
  min,
  step,
  placeholder,
  disabled,
}, ref) {
  const isDecimal = step !== undefined && Number(step) < 1
  const [display, setDisplay] = useState<string>(() => formatNum(defaultValue, isDecimal))
  const [editing, setEditing] = useState(false)
  const prevDefault = useRef(defaultValue)

  useEffect(() => {
    if (!editing && defaultValue !== prevDefault.current) {
      prevDefault.current = defaultValue
      setDisplay(formatNum(defaultValue, isDecimal))
    }
  }, [defaultValue, editing, isDecimal])

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    const input = e.target
    setEditing(true)
    // Convertir l'affichage courant (ex: "5 000 000") en nombre brut (ex: "5000000")
    // pour faciliter la saisie. On utilise le display courant et non defaultValue,
    // car defaultValue peut être périmé si l'API n'a pas encore répondu à la
    // sauvegarde précédente — ce qui ferait apparaître l'ancienne valeur au lieu
    // de ce que l'utilisateur vient de saisir.
    setDisplay(String(parseFormattedNum(display)))
    // Le changement de valeur ci-dessus (formaté "12 345" → brut "12345") ne se reflète
    // dans le DOM qu'au prochain rendu React. Appeler select() ici sélectionne encore
    // l'ancien texte formaté, et le re-rendu qui suit annule cette sélection — invisible
    // dès que le formatage ajoute un séparateur de milliers (donc à partir de 4 chiffres).
    // On reporte donc select() juste après le commit du rendu (imperceptible, < 16ms).
    requestAnimationFrame(() => input.select())
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setEditing(false)
    const parsed = parseFormattedNum(e.target.value)
    setDisplay(formatNum(parsed, isDecimal))
    // Ne déclenche la sauvegarde (et donc la requête réseau) que si la valeur a
    // vraiment changé — sinon un simple focus/blur sans modification (ex: tabulation
    // pour parcourir les champs) déclenchait une requête PATCH inutile à chaque fois.
    if (parsed !== defaultValue) {
      onBlur(parsed)
    }
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode={isDecimal ? 'decimal' : 'numeric'}
      className={className}
      style={style}
      value={display}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      onChange={(e) => setDisplay(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  )
})

export default NumInput
