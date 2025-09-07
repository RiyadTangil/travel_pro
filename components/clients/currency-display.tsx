"use client"

type CurrencyDisplayProps = {
  amount: number
  isOverdue?: boolean
}

export function CurrencyDisplay({ amount, isOverdue = false }: CurrencyDisplayProps) {
  const formatCurrency = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) {
      return "0 BDT"
    }
    return `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} BDT`
  }

  const formatted = formatCurrency(amount)
  const colorClass = amount > 0 
    ? (isOverdue ? "text-red-600 font-semibold" : "text-orange-600 font-medium") 
    : "text-green-600"

  return <span className={colorClass}>{formatted}</span>
}