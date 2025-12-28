export type AccountType = string

export type AccountItem = {
  id: string
  name: string
  type: AccountType
  accountTypeId?: string
  accountNo?: string
  bankName?: string
  routingNo?: string
  cardNo?: string
  branch?: string
  lastBalance: number
  hasTrxn?: boolean
}
