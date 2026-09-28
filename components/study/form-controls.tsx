'use client'

/**
 * Controles de formulario del instrumento de evaluación.
 *
 * Accesibilidad: controles NATIVOS (input radio/checkbox/text, textarea) dentro
 * de fieldset/legend, cada uno con su <label>; los errores se enlazan con
 * aria-describedby y aria-invalid. Así funcionan con teclado (Tab / flechas /
 * Espacio) y con lectores de pantalla sin depender de roles ARIA simulados.
 */

import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8] focus-visible:ring-offset-1 ' +
  'aria-[invalid=true]:border-[#B42318]'

export const primaryButtonClass = 'bg-[#4B45A8] hover:bg-[#3D3890] text-white'

/** Marca visual "*" + texto para lectores de pantalla (aria-required no vale en fieldset). */
function Required() {
  return (
    <>
      <span className="text-[#B42318]" aria-hidden="true"> *</span>
      <span className="sr-only"> (obligatorio)</span>
    </>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-xs text-[#B42318] mt-1">
      {message}
    </p>
  )
}

export function Hint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="text-xs text-muted-foreground mt-1">
      {children}
    </p>
  )
}

interface Option<T extends string> {
  value: T
  label: string
}

const toOptions = <T extends string>(opts: [T, string][]): Option<T>[] => opts.map(([value, label]) => ({ value, label }))

export function RadioGroupField<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  hint,
  required,
  inline = true,
}: {
  legend: string
  name: string
  options: [T, string][]
  value: T | null
  onChange: (v: T) => void
  error?: string
  hint?: string
  required?: boolean
  inline?: boolean
}) {
  const uid = useId()
  const errId = `${uid}-err`
  const hintId = `${uid}-hint`
  return (
    <fieldset
      aria-describedby={[error ? errId : '', hint ? hintId : ''].filter(Boolean).join(' ') || undefined}
    >
      <legend className="text-sm font-medium text-foreground mb-1.5">
        {legend}
        {required && <Required />}
      </legend>
      <div className={cn('gap-2', inline ? 'flex flex-wrap' : 'grid')}>
        {toOptions(options).map((o) => {
          const id = `${uid}-${o.value}`
          return (
            <label
              key={o.value}
              htmlFor={id}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#4B45A8]',
                value === o.value ? 'border-[#4B45A8] bg-[#EEEDFE] text-[#2E2A6B]' : 'border-border text-foreground'
              )}
            >
              <input
                id={id}
                type="radio"
                name={`${uid}-${name}`}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                className="accent-[#4B45A8]"
              />
              {o.label}
            </label>
          )
        })}
      </div>
      {hint && <Hint id={hintId}>{hint}</Hint>}
      <FieldError id={errId} message={error} />
    </fieldset>
  )
}

export function CheckboxGroupField<T extends string>({
  legend,
  options,
  values,
  onChange,
  error,
  hint,
  required,
}: {
  legend: string
  options: [T, string][]
  values: T[]
  onChange: (v: T[]) => void
  error?: string
  hint?: string
  required?: boolean
}) {
  const uid = useId()
  const errId = `${uid}-err`
  const hintId = `${uid}-hint`
  const toggle = (v: T) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  return (
    <fieldset
      aria-describedby={[error ? errId : '', hint ? hintId : ''].filter(Boolean).join(' ') || undefined}
    >
      <legend className="text-sm font-medium text-foreground mb-1.5">
        {legend}
        {required && <Required />}
      </legend>
      <div className="flex flex-wrap gap-2">
        {toOptions(options).map((o) => {
          const id = `${uid}-${o.value}`
          const checked = values.includes(o.value)
          return (
            <label
              key={o.value}
              htmlFor={id}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#4B45A8]',
                checked ? 'border-[#4B45A8] bg-[#EEEDFE] text-[#2E2A6B]' : 'border-border text-foreground'
              )}
            >
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={() => toggle(o.value)}
                className="accent-[#4B45A8]"
              />
              {o.label}
            </label>
          )
        })}
      </div>
      {hint && <Hint id={hintId}>{hint}</Hint>}
      <FieldError id={errId} message={error} />
    </fieldset>
  )
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  placeholder,
  autoComplete = 'off',
  className,
  inputClassName,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  required?: boolean
  placeholder?: string
  autoComplete?: string
  className?: string
  inputClassName?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-foreground block mb-1.5">
        {label}
        {required && <Required />}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined}
        className={cn(inputClass, inputClassName)}
      />
      {hint && <Hint id={`${id}-hint`}>{hint}</Hint>}
      <FieldError id={`${id}-err`} message={error} />
    </div>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  rows?: number
  placeholder?: string
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground block mb-1.5">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(inputClass, 'resize-y')}
      />
      {hint && <Hint id={`${id}-hint`}>{hint}</Hint>}
    </div>
  )
}

/** Escala 1–5 con opción explícita "No preguntado" (null). */
export function LikertField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  const uid = useId()
  const opts: [string, string][] = [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['na', 'No preguntado']]
  return (
    <fieldset className="py-2" aria-describedby={hint ? `${uid}-hint` : undefined}>
      <legend className="text-sm text-foreground">{label}</legend>
      {hint && (
        <p id={`${uid}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {opts.map(([v, text]) => {
          const id = `${uid}-${v}`
          const checked = v === 'na' ? value === null : value === Number(v)
          return (
            <label
              key={v}
              htmlFor={id}
              className={cn(
                'flex items-center justify-center min-w-9 h-9 px-2 rounded-lg border text-sm cursor-pointer',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#4B45A8]',
                checked ? 'border-[#4B45A8] bg-[#4B45A8] text-white' : 'border-border text-foreground'
              )}
            >
              <input
                id={id}
                type="radio"
                name={uid}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(v === 'na' ? null : Number(v))}
              />
              {text}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
