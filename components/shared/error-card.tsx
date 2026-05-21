import { AlertCircle } from 'lucide-react'

interface ErrorCardProps {
  message: string
}

export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl border border-[#E24B4A] bg-[#FCEBEB] animate-fade-in"
      role="alert"
    >
      <AlertCircle className="w-5 h-5 text-[#E24B4A] shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm text-[#E24B4A]">{message}</p>
    </div>
  )
}
