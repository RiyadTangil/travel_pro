import { Invoice } from "@/types/invoice"

export const dummyInvoices: Invoice[] = [
  {
    id: "inv-001",
    invoiceNo: "IO-0001",
    clientName: "Hasib Munshi",
    clientPhone: "01824466952",
    salesDate: "2025-01-19",
    dueDate: "2025-02-19",
    salesPrice: 85000,
    receivedAmount: 85000,
    dueAmount: 0,
    mrNo: "MR-0001",
    passportNo: "BG1234567",
    salesBy: "Tanvir Hasan",
    agent: "Agent X",
    status: "paid",
    createdAt: "2025-01-19T10:30:00Z",
    updatedAt: "2025-01-19T10:30:00Z"
  },
  {
    id: "inv-002",
    invoiceNo: "IO-0002",
    clientName: "Rashida Begum",
    clientPhone: "01712345678",
    salesDate: "2025-01-18",
    dueDate: "2025-02-18",
    salesPrice: 125000,
    receivedAmount: 75000,
    dueAmount: 50000,
    mrNo: "MR-0002",
    passportNo: "BG2345678",
    salesBy: "Ahmed Khan",
    agent: "Agent Y",
    status: "partial",
    createdAt: "2025-01-18T14:20:00Z",
    updatedAt: "2025-01-18T14:20:00Z"
  },
  {
    id: "inv-003",
    invoiceNo: "IO-0003",
    clientName: "Mohammad Ali",
    clientPhone: "01987654321",
    salesDate: "2025-01-17",
    dueDate: "2025-02-17",
    salesPrice: 95000,
    receivedAmount: 0,
    dueAmount: 95000,
    mrNo: "MR-0003",
    passportNo: "BG3456789",
    salesBy: "Fatima Rahman",
    agent: "Agent Z",
    status: "due",
    createdAt: "2025-01-17T09:15:00Z",
    updatedAt: "2025-01-17T09:15:00Z"
  },
  {
    id: "inv-004",
    invoiceNo: "IO-0004",
    clientName: "Nasir Ahmed",
    clientPhone: "01555666777",
    salesDate: "2025-01-16",
    dueDate: "2025-01-16",
    salesPrice: 150000,
    receivedAmount: 100000,
    dueAmount: 50000,
    mrNo: "MR-0004",
    passportNo: "BG4567890",
    salesBy: "Tanvir Hasan",
    agent: "Agent X",
    status: "overdue",
    createdAt: "2025-01-16T16:45:00Z",
    updatedAt: "2025-01-16T16:45:00Z"
  },
  {
    id: "inv-005",
    invoiceNo: "IO-0005",
    clientName: "Salma Khatun",
    clientPhone: "01666777888",
    salesDate: "2025-01-15",
    dueDate: "2025-02-15",
    salesPrice: 75000,
    receivedAmount: 75000,
    dueAmount: 0,
    mrNo: "MR-0005",
    passportNo: "BG5678901",
    salesBy: "Ahmed Khan",
    agent: "Agent Y",
    status: "paid",
    createdAt: "2025-01-15T11:30:00Z",
    updatedAt: "2025-01-15T11:30:00Z"
  },
  {
    id: "inv-006",
    invoiceNo: "IO-0006",
    clientName: "Karim Uddin",
    clientPhone: "01777888999",
    salesDate: "2025-01-14",
    dueDate: "2025-02-14",
    salesPrice: 110000,
    receivedAmount: 60000,
    dueAmount: 50000,
    mrNo: "MR-0006",
    passportNo: "BG6789012",
    salesBy: "Fatima Rahman",
    agent: "Agent Z",
    status: "partial",
    createdAt: "2025-01-14T13:20:00Z",
    updatedAt: "2025-01-14T13:20:00Z"
  },
  {
    id: "inv-007",
    invoiceNo: "IO-0007",
    clientName: "Rubina Akter",
    clientPhone: "01888999000",
    salesDate: "2025-01-13",
    dueDate: "2025-02-13",
    salesPrice: 90000,
    receivedAmount: 0,
    dueAmount: 90000,
    mrNo: "MR-0007",
    passportNo: "BG7890123",
    salesBy: "Tanvir Hasan",
    agent: "Agent X",
    status: "due",
    createdAt: "2025-01-13T08:45:00Z",
    updatedAt: "2025-01-13T08:45:00Z"
  },
  {
    id: "inv-008",
    invoiceNo: "IO-0008",
    clientName: "Abdul Hamid",
    clientPhone: "01999000111",
    salesDate: "2025-01-12",
    dueDate: "2025-02-12",
    salesPrice: 135000,
    receivedAmount: 135000,
    dueAmount: 0,
    mrNo: "MR-0008",
    passportNo: "BG8901234",
    salesBy: "Ahmed Khan",
    agent: "Agent Y",
    status: "paid",
    createdAt: "2025-01-12T15:10:00Z",
    updatedAt: "2025-01-12T15:10:00Z"
  }
]

export const generateInvoiceNumber = (): string => {
  const lastInvoice = dummyInvoices[dummyInvoices.length - 1]
  const lastNumber = parseInt(lastInvoice.invoiceNo.split('-')[1])
  return `IO-${String(lastNumber + 1).padStart(4, '0')}`
}

export const generateMRNumber = (): string => {
  const lastInvoice = dummyInvoices[dummyInvoices.length - 1]
  const lastNumber = parseInt(lastInvoice.mrNo.split('-')[1])
  return `MR-${String(lastNumber + 1).padStart(4, '0')}`
}