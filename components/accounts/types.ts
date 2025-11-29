export type AccountType = "Cash" | "Bank" | "Mobile banking" | "Credit Card"

export type AccountItem = {
  id: string
  name: string
  type: AccountType
  accountNo?: string
  bankName?: string
  routingNo?: string
  cardNo?: string
  branch?: string
  lastBalance: number
  hasTrxn?: boolean
}