# Module reference (living document)

Short map of **what each module does** and **which MongoDB collections** it touches. Add new modules as sections below; keep entries numbered and scannable.

---

## 1. Bill adjustment

**Total distinct flows: 8** (all share one voucher counter and the rule: **one `BillAdjustment` row → at most one `client_transactions` row** for that voucher).

| # | Flow | Trigger | Collections / tables |
|---|------|---------|----------------------|
| **1** | Manual adjustment — **Account** | UI → `POST /api/bill-adjustment` → `createBillAdjustment` | **`bill_adjustments`** (insert), **`accounts`** (`lastBalance` ±), **`client_transactions`** (1 row, `paymentTypeId` = account, `transactionType`: `bill_adjustment`), **`counters`** (`bill_adjustment_voucher`) |
| **2** | Manual adjustment — **Client** | Same | **`bill_adjustments`**, **`clients_manager`** (`presentBalance` ±), **`client_transactions`** (1 row, `clientId` set), **`counters`** |
| **3** | Manual adjustment — **Vendor** | Same | **`bill_adjustments`**, **`vendors`** (`presentBalance` type/amount via net delta), **`client_transactions`** (1 row, `vendorId` set), **`counters`** |
| **4** | Opening balance — **Account** | `createAccount` when `lastBalance` ≠ 0 | **`accounts`** (created with `lastBalance` 0, then updated via ledger), **`bill_adjustments`** (`source: opening_balance`), **`client_transactions`** (`transactionType: opening_balance`), **`counters`** |
| **5** | Opening balance — **Client** | `createClient` when Due/Advance amount ≠ 0 | **`clients_manager`** (starts `presentBalance` 0, then ledger applies), **`bill_adjustments`** (`source: opening_balance`), **`client_transactions`** (`opening_balance`), **`counters`** |
| **6** | Opening balance — **Vendor** | `POST /api/vendors` when `openingBalance` or `presentBalance.amount` ≠ 0 | **`vendors`** (insert with `presentBalance.amount` 0, then ledger), **`bill_adjustments`** (`opening_balance`), **`client_transactions`** (`opening_balance`), **`counters`** |
| **7** | **List** adjustments | `GET /api/bill-adjustment` | **`bill_adjustments`** (read, filtered by `companyId`) |
| **8** | **Delete** adjustment | `DELETE /api/bill-adjustment/[id]` | **`bill_adjustments`** (delete), **`client_transactions`** (delete **one** row by `voucherNo` + `companyId`), **`accounts` / `clients_manager` / `vendors`** (reverse same delta as create) |

**Shared behaviour**

- **Voucher:** `BA-` + zero-padded seq from **`counters`** key `bill_adjustment_voucher`.
- **Ledger row visibility:** `client_transactions` from these flows use `isMonetoryTranseciton: false` so they stay out of the default account transaction history list (see `clientTransactionService`).
- **Source field on `bill_adjustments`:** `user` (manual UI) vs `opening_balance` (account/client/vendor create hooks).

**Gap / note**

- UI type **Combined** exists on the bill-adjustment screen; **backend `persistBillAdjustmentLedger` does not implement `Combined` yet** — only Account, Client, Vendor.

**Main code**

- Service: `services/billAdjustmentService.ts`
- API: `app/api/bill-adjustment/route.ts`, `app/api/bill-adjustment/[id]/route.ts`
- Hooks: `services/accountService.ts`, `services/clientsService.ts`, `app/api/vendors/route.ts`

---

<!-- Next module: copy the pattern (## 2. Name, table, then numbered rows). -->
