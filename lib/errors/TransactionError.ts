export class TransactionError extends Error {
  constructor(
    message: string, 
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'TransactionError'
  }

  static insufficientFunds(clientId: string, required: number, available: number) {
    return new TransactionError(
      `Insufficient funds for client ${clientId}. Required: ${required}, Available: ${available}`,
      'INSUFFICIENT_FUNDS',
      400,
      { clientId, required, available }
    )
  }

  static clientNotFound(clientId: string) {
    return new TransactionError(
      `Client with ID ${clientId} not found`,
      'CLIENT_NOT_FOUND',
      404,
      { clientId }
    )
  }

  static transactionNotFound(transactionId: string) {
    return new TransactionError(
      `Transaction with ID ${transactionId} not found`,
      'TRANSACTION_NOT_FOUND',
      404,
      { transactionId }
    )
  }

  static invalidAmount(amount: number) {
    return new TransactionError(
      `Invalid amount: ${amount}. Amount must be positive`,
      'INVALID_AMOUNT',
      400,
      { amount }
    )
  }

  static databaseError(operation: string, originalError: any) {
    return new TransactionError(
      `Database error during ${operation}`,
      'DATABASE_ERROR',
      500,
      { operation, originalError: originalError.message }
    )
  }

  static reconciliationError(clientId: string, expected: number, actual: number) {
    return new TransactionError(
      `Reconciliation failed for client ${clientId}. Expected: ${expected}, Actual: ${actual}`,
      'RECONCILIATION_ERROR',
      500,
      { clientId, expected, actual }
    )
  }
}

export class ClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'ClientError'
  }

  static contractAmountImmutable() {
    return new ClientError(
      'Contract amount cannot be modified after creation',
      'CONTRACT_AMOUNT_IMMUTABLE',
      400
    )
  }

  static initialPaymentImmutable() {
    return new ClientError(
      'Initial payment cannot be modified after creation',
      'INITIAL_PAYMENT_IMMUTABLE',
      400
    )
  }

  static passportNumberExists(passportNumber: string) {
    return new ClientError(
      `Client with passport number ${passportNumber} already exists`,
      'PASSPORT_NUMBER_EXISTS',
      400,
      { passportNumber }
    )
  }
} 