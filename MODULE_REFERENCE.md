# Module reference (living document)

Short map of **what each module does**, **which MongoDB collections** it touches, and **one worked example** per module. Add new modules as sections below.

---

## 1. Bill adjustment

**Total distinct flows: 8** (one `BillAdjustment` row → at most one matching `client_transactions` row per voucher; voucher prefix **`BA-`** from **`counters.bill_adjustment_voucher`**).

| # | Flow | Trigger | Collections |
|---|------|---------|-------------|
| **1** | Manual — **Account** | `POST /api/bill-adjustment` | `bill_adjustments`, `accounts` (`lastBalance`), `client_transactions`, `counters` |
| **2** | Manual — **Client** | Same | `bill_adjustments`, `clients_manager`, `client_transactions`, `counters` |
| **3** | Manual — **Vendor** | Same | `bill_adjustments`, `vendors`, `client_transactions`, `counters` |
| **4** | Opening — **Account** | `createAccount` when opening `lastBalance` ≠ 0 | `accounts`, `bill_adjustments` (`source: opening_balance`), `client_transactions` (`opening_balance`), `counters` |
| **5** | Opening — **Client** | `createClient` with Due/Advance amount | `clients_manager`, `bill_adjustments`, `client_transactions`, `counters` |
| **6** | Opening — **Vendor** | `POST /api/vendors` with non-zero opening | `vendors`, `bill_adjustments`, `client_transactions`, `counters` |
| **7** | **List** | `GET /api/bill-adjustment` | `bill_adjustments` (read) |
| **8** | **Delete** | `DELETE /api/bill-adjustment/[id]` | Reverses balance on target entity, deletes one `client_transactions` by `voucherNo`, deletes `bill_adjustments` row |

**Shared:** Ledger rows use `isMonetoryTranseciton: false` so they stay off the default account transaction list. `source` on `bill_adjustments`: `user` vs `opening_balance`. **Combined** in UI is not implemented in `persistBillAdjustmentLedger` yet.

### Example (all 8 impacts in one narrative)

Assume company **C** and dates in **2026-04**.

1. **Manual Account:** User posts Account adjustment **DEBIT 1,000** on bank account **A** → `bill_adjustments` (+1 row, `type: Account`), `accounts.A.lastBalance` decreases by 1,000, `client_transactions` (+1, `paymentTypeId: A`, `bill_adjustment`), `counters` seq +1.  
2. **Manual Client:** **CREDIT 500** on client **CL** → `bill_adjustments`, `clients_manager.CL.presentBalance` −500, `client_transactions` (+`clientId`), `counters` +1.  
3. **Manual Vendor:** **DEBIT 300** on vendor **V** → `bill_adjustments`, `vendors.V.presentBalance` net updated, `client_transactions` (+`vendorId`), `counters` +1.  
4. **Opening Account:** Create account with opening last balance **10,000** → account row stored at 0 then ledger applies +10,000; **`bill_adjustments`** +1 (`opening_balance`), **`client_transactions`** +1 (`opening_balance`), **`counters`** +1; final `accounts.lastBalance` = 10,000, **`hasTrxn`** becomes true via update hook.  
5. **Opening Client:** New client Due **2,000** → `clients_manager` starts at 0 then opening ledger sets −2,000; **`bill_adjustments`** +1, **`client_transactions`** +1, **`counters`** +1.  
6. **Opening Vendor:** New vendor due **2,000** (from `openingBalance` / type) → vendor inserted with `presentBalance.amount` 0 then opening ledger; **`bill_adjustments`** +1, **`client_transactions`** +1, **`counters`** +1; vendor balance shows due 2,000.  
7. **List:** `GET /api/bill-adjustment` returns paginated rows from **`bill_adjustments`** for **C**.  
8. **Delete:** User deletes the voucher from step 1 → **`accounts.A.lastBalance`** +1,000 (reversed), **`client_transactions`** row for that `voucherNo` removed, **`bill_adjustments`** row removed; steps 2–6 deletions reverse client/vendor/account deltas the same way.

**Code:** `services/billAdjustmentService.ts`, `app/api/bill-adjustment/*`, hooks in `accountService`, `clientsService`, `app/api/vendors/route.ts`.

---

## 2. Accounts (list / create / update / delete UI)

**Total operations: 5**

| # | Operation | Trigger | Collections / notes |
|---|-----------|---------|---------------------|
| **1** | **List** | `GET /api/accounts?q&page&pageSize` + `x-company-id` | `accounts` (read; Mongoose `listAccounts`) |
| **2** | **Create** | `POST /api/accounts` | `accounts` insert; if opening `lastBalance` ≠ 0 → also **bill adjustment opening** flow (§1 row **4**) |
| **3** | **Update** | `PUT /api/accounts/[id]` | Native `updateOne` on `accounts` (Mongoose hooks on `Account` model do not run here) |
| **4** | **Delete** | `DELETE /api/accounts/[id]` | Soft delete: `deleted: true` on `accounts` if `hasTrxn` is false |
| **5** | **`hasTrxn` flag** | Mongoose `Account` model | On **first `save`**, changing `lastBalance` does **not** set `hasTrxn`. On **updates** (`save` after insert, or `findOneAndUpdate` / `$inc` / `$set` `lastBalance`), `hasTrxn` becomes **true** |

### Example

1. **Create** “Petty Cash”, type Cash, **last balance left blank** → API sends `lastBalance: 0` → one row in **`accounts`**, `hasTrxn: false`, no bill adjustment.  
2. **Create** “Main Bank” with opening **50,000** → **`accounts`** row with `lastBalance` 0 then opening adjustment (§1#4): **`bill_adjustments`**, **`client_transactions`**, **`counters`**, final balance 50,000, **`hasTrxn: true`**.  
3. **List** with search “Main” → **`GET /api/accounts?q=Main`** returns matching **`accounts`**.  
4. **Update** name only → **`PUT`** updates **`accounts`** document.  
5. **Delete** an account with **`hasTrxn: false`** → document marked **`deleted: true`**; if **`hasTrxn: true`**, API returns 403.

**UI:** `app/dashboard/accounts/page.tsx` (Ant Design `Table`, `PageWrapper`, `FilterToolbar` = search + refresh only). **Modal:** `components/accounts/account-modal.tsx` (opening balance optional; empty → 0).

**Feedback:** Prefer routing all account writes through **Mongoose** (`accountService` + `Account` model) so `hasTrxn` and any future hooks stay consistent with **`PUT /api/accounts/[id]`** (currently raw Mongo `updateOne`).

**UI delete:** Row delete uses shared **`DeleteButton`** (confirm dialog + `isLoading` while `DELETE` runs). Accounts with **`hasTrxn: true`** stay disabled.

---

## 3. Non-invoice income

**Total operations: 4** (voucher prefix **`NII-####`** from counter key **`voucher_nii`** on `counters`).

| # | Operation | Trigger | Collections / notes |
|---|-----------|---------|---------------------|
| **1** | **List** | `GET /api/non-invoice-incomes?page&pageSize&search&dateFrom&dateTo` + `x-company-id` | `non_invoice_incomes` (read, paginated, text search on voucher, company name, note, account name) |
| **2** | **Create** | `POST /api/non-invoice-incomes` | `non_invoice_incomes`, **`accounts.lastBalance`** += amount, **`client_transactions`** (+1, `invoiceType: NON_INVOICE_INCOME`, `direction: receiv`), **`counters`** seq |
| **3** | **Update** | `PUT /api/non-invoice-incomes/[id]` | Transaction: revert old account delta + delete old `client_transactions` by `voucherNo`; re-apply new company/account/amount/date; recreate `client_transactions`; update row |
| **4** | **Delete** | `DELETE /api/non-invoice-incomes/[id]` | **`accounts.lastBalance`** -= amount, delete matching `client_transactions` by `voucherNo`, delete income row |

### Example

1. User adds income **5,000** to **Bank A** for non-invoice company **NIC-1** → new **`non_invoice_incomes`** row with **`NII-0001`**, **`accounts.A.lastBalance`** +5,000, **`client_transactions`** ledger row with that voucher and running **`lastTotalAmount`**.  
2. **List** with date range and search “NII” returns matching rows for the company header.  
3. **Edit** changes amount to **3,000** → old 5,000 reversed on **A**, new +3,000 applied, ledger row replaced (same `voucherNo`).  
4. **Delete** removes the row, reverses **3,000** on **A**, removes the ledger row.

**Code:** `app/api/non-invoice-incomes/route.ts`, `app/api/non-invoice-incomes/[id]/route.ts`, models `non-invoice-income`, UI `app/dashboard/accounts/non-invoice-income/page.tsx`, modal `components/accounts/NonInvoiceIncomeModal.tsx`.

**UI:** Ant Design `Table`, `FilterToolbar` (date range, debounced search, refresh), `TableRowActions` (View placeholder, Edit, Delete with confirm + row loading).

---

## 4. Balance transfer

**Total operations: 4** (voucher prefix **`BT-####`**; counter key **`voucher_bt`** on `counters`).

| # | Operation | Trigger | Collections / notes |
|---|-----------|---------|---------------------|
| **1** | **List** | `GET /api/balance-transfer?page&pageSize&search&dateFrom&dateTo` + `x-company-id` | `account_balance_transfers` (paginated; search on `voucherNo`, `note`) |
| **2** | **Create** | `POST /api/balance-transfer` (Zod: distinct accounts, positive `amount`, optional `transferCharge`) | **`accounts`**: from −(amount+charge), to +amount; **`account_balance_transfers`**; **`client_transactions`** ×2 (same `voucherNo`, `BALANCE_TRANSFER`, payout on sender / receiv on receiver) |
| **3** | **Update** | `PUT /api/balance-transfer/[id]` | Reverts old balances + deletes old ledger rows by `voucherNo`; applies new amounts; recreates two `client_transactions` |
| **4** | **Delete** | `DELETE /api/balance-transfer/[id]` | Restores sender/receiver balances; requires existing `client_transactions` for that voucher; deletes transfer row |

### Example

Transfer **1,000** + charge **50** from **Bank A** to **Cash B**: **A** loses **1,050**, **B** gains **1,000**; voucher **`BT-0001`**; ledger shows payout on **A** and receipt on **B**. Delete reverses those balance deltas.

**Code:** `controllers/balanceTransferController.ts`, `services/balanceTransferService.ts`, `app/api/balance-transfer/*`, UI `app/dashboard/accounts/balance-transfer/page.tsx`, `components/accounts/BalanceTransferModal.tsx`.

**UI:** `FilterToolbar`, Ant `Table`, `TableRowActions`, debounced search; modal uses `Controller` + error borders on required fields.

---

## 5. Investments

**Total operations: 4** (voucher prefix **`IVT-####`** per company; counter key **`voucher_investment_{companyId}`**).

| # | Operation | Trigger | Collections / notes |
|---|-----------|---------|---------------------|
| **1** | **List** | `GET /api/investments?...` + `x-company-id` | `investments` (search on voucher, target company name, account name, note) |
| **2** | **Create** | `POST /api/investments` | Resolves **target company** from `NonInvoiceCompany` via `companyId` in body; **`accounts.lastBalance`** += `amount`; **`investments`**; **`client_transactions`** (`INVESTMENT`, `receiv`) |
| **3** | **Update** | `PUT /api/investments/[id]` | Reverts old account delta; applies new company/account/amount; replaces ledger rows for voucher |
| **4** | **Delete** | `DELETE /api/investments/[id]` | **`accounts`** −amount; removes `client_transactions` for voucher; deletes investment |

### Example

User records **20,000** against **Company X** into **Bank A** → **`investments`** row with **`IVT-0001`**, **`accounts.A.lastBalance`** +20,000, ledger row tagged **`INVESTMENT`**.

**Code:** `controllers/investmentController.ts`, `services/investmentService.ts`, `app/api/investments/*`, UI `app/dashboard/accounts/investments/page.tsx`, `components/accounts/InvestmentModal.tsx`.

**UI:** Same list pattern as non-invoice income (`FilterToolbar`, Ant `Table`, `TableRowActions`); modal validation mirrors **`NonInvoiceIncomeModal`**.

---

## 6. Balance status

**Total operations: 1** (read-only snapshot).

| # | Operation | Trigger | Collections / notes |
|---|-----------|---------|---------------------|
| **1** | **Report** | `GET /api/accounts/balance-status` + `x-company-id` | Returns all active **`accounts`** via `getAllAccounts`, plus **`account_types`** names for grouping |

### Example

API returns every cash/bank/etc. account for the company; UI groups rows by **`accounts.type`** (aligned with type names from **`account_types`**), shows subtotal per group and a **grand total** footer.

**Code:** `controllers/balanceStatusController.ts`, `app/api/accounts/balance-status/route.ts`, UI `app/dashboard/accounts/balance-status/page.tsx`, `components/accounts/BalanceStatusTable.tsx`.

**UI:** No filters; Ant `Table` per group with summary row; grand total in a card below.

---

## 7. Transaction history (account ledger)

**Total operations: 1** (read-only list).

| # | Operation | Trigger | Collections / notes |
|---|-----------|---------|---------------------|
| **1** | **List** | `GET /api/client-transactions?page&pageSize&accountId?&dateFrom&dateTo` + `x-company-id` | Reads **`client_transactions`** (monetary rows for the account filter / date range) |

### Example

User picks **Main Bank** and April 2026 → paged debits/credits with running **`lastTotalAmount`**, voucher labels, and invoice-type-derived particulars in the UI mapper.

**Code:** `app/api/client-transactions/*` (and related service), UI `app/dashboard/accounts/transactions/page.tsx`.

**UI:** `FilterToolbar` with date range, **account** `<Select>` as `filterExtras`, refresh, print; primary actions (back, print) in toolbar **children**; Ant `Table` with horizontal scroll.

---

## 8. Expense heads (categories)

**Total operations: 4**

| # | Operation | Trigger | Collections / notes |
|---|-----------|---------|---------------------|
| **1** | **List** | `GET /api/expense-heads?page&pageSize&search` + `x-company-id` | `expense_heads` (company-scoped filter in service) |
| **2** | **Create** | `POST /api/expense-heads` `{ name }` | Insert **`expense_heads`** (Zod + service validation) |
| **3** | **Update** | `PUT /api/expense-heads/[id]` | Update name |
| **4** | **Delete** | `DELETE /api/expense-heads/[id]` | Remove head if allowed by service rules |

### Example

Company adds heads **“Fuel”**, **“Office”** → rows in **`expense_heads`**; expense entry forms load these via `GET` with `pageSize=100`.

**Code:** `controllers/expenseHeadController.ts`, `services/expenseHeadService.ts`, `app/api/expense-heads/*`, UI `app/dashboard/expenses/head/page.tsx`, `components/expenses/ExpenseHeadModal.tsx`.

**UI:** `FilterToolbar` (search + refresh + Add), Ant `Table`, **`TableRowActions`** with **`showView={false}`** (no View button), optional **`editLoading` / `editDisabled`** while saving; delete uses built-in confirm dialog.

---

## 9. Expenses (history / vouchers)

**Total operations: 4** (voucher prefix **`EX-####`**; counter key **`voucher_ex`**).

| # | Operation | Trigger | Collections / notes |
|---|-----------|---------|---------------------|
| **1** | **List** | `GET /api/expenses?page&pageSize&search&dateFrom&dateTo` + `x-company-id` | **`expenses`** (text search on voucher, account name, note, item head names) |
| **2** | **Create** | `POST /api/expenses` (Zod: date, accountId, paymentMethod, ≥1 item with positive amounts) | **`expenses`**, **`accounts.lastBalance`**, **`client_transactions`** (payout), **`counters`** |
| **3** | **Update** | `PUT /api/expenses/[id]` | Same shape as create; service reverses old ledger/account effects and re-applies |
| **4** | **Delete** | `DELETE /api/expenses/[id]` | Reverses balances and removes ledger rows for voucher |

### Example

User posts **EX-0001** with two lines (Fuel 500, Office 300) from **Bank A** → one **`expenses`** document, **A** balance reduced by **800**, **`client_transactions`** debit row with running balance.

**Code:** `services/expenseService.ts`, `app/api/expenses/*`, UI `app/dashboard/expenses/history/page.tsx`, `components/expenses/ExpenseModal.tsx`.

**UI:** `FilterToolbar` (date range, debounced search, refresh, Add), Ant `Table`, **`TableRowActions`** (View placeholder, Edit with row loading, Delete). **`ExpenseModal`:** `Controller` for **payment method** and **date** with red borders + messages; line items still validated before submit.

**Feedback:** `listExpenses` currently sets each row’s **`paymentMethod`** from **`accountId.type`** while create/update persist a separate **`paymentMethod`** field—if edits should round-trip the same value as the form, align list mapping with the stored field.

---

<!-- Next module: copy the pattern (## N. Name, table, example, code paths). -->

---

## 10. Vendors (list / create / update / delete / status)

**Total operations: 6**

| # | Operation | Trigger | Collections touched |
|---|-----------|---------|---------------------|
| **1** | **List** | `GET /api/vendors?page&pageSize&search` + `x-company-id` | `vendors` (read, paginated, text search on name/mobile/email) |
| **2** | **Create** | `POST /api/vendors` | `vendors` insert; if `openingBalance > 0` → also **bill adjustment opening** (§1 flow 6): `bill_adjustments`, `client_transactions`, `counters` |
| **3** | **Update** | `PUT /api/vendors/[id]` | `vendors` (raw `updateOne`, native MongoDB driver) |
| **4** | **Delete** | `DELETE /api/vendors/[id]` | `vendors` hard delete — only allowed when `presentBalance.amount === 0` |
| **5** | **Toggle status** | `PATCH /api/vendors/[id]` `{ active }` | `vendors.active` field |
| **6** | **View** | `GET /api/vendors/[id]` | `vendors` (read single document) |

### Vendor `presentBalance` shape

```
presentBalance: { type: "due" | "advance", amount: number }
```

- `type: "due"` — company owes money **to** the vendor (vendor performed service, not yet paid).
- `type: "advance"` — company paid **more** than owed; vendor holds a credit.
- `amount` is always positive; direction is encoded in `type`.

### Example

1. **Create** vendor "Omor Faruk" with opening due **5,000** → `vendors` row inserted with `presentBalance: { type: "due", amount: 5000 }`; bill-adjustment service also fires: `bill_adjustments` +1 (`opening_balance`), `client_transactions` +1, `counters` +1.
2. **List** with search "Omor" → `GET /api/vendors?search=Omor` returns matching rows.
3. **Update** mobile number → `PUT /api/vendors/[id]` patches the `vendors` document.
4. **Toggle inactive** → `PATCH /api/vendors/[id]` sets `active: false`; row still appears in list but disabled.
5. **Delete** attempted while balance is due → API returns 403 ("Settle balance first"); once balance is 0 → `vendors` row removed.

**Code:** `app/api/vendors/route.ts`, `app/api/vendors/[id]/route.ts`, `services/vendorService.ts` (if exists) or inline in routes, UI `app/dashboard/vendors/page.tsx`, `components/vendors/vendor-table.tsx`, `components/vendors/vendor-add-modal.tsx`, `components/vendors/vendor-view-modal.tsx`.

**UI:** `FilterToolbar` (search + refresh + Add Vendor), Ant `Table` with name linked to vendor ledger report, `StatusSwitch` per row, **"+ Add Payment"** button visible only when `presentBalance.amount !== 0` (opens `PaymentModal` pre-filled with the vendor — no redirect needed).

---

## 11. Vendor Advance Return

**Total operations: 4** (voucher prefix **`ADVR-####`**; counter key **`vendor_advance_return_voucher`** on `counters`).

**Purpose:** Records the return of a previously given advance from a vendor. The vendor's advance balance decreases and the company's account balance increases.

| # | Operation | Trigger | Collections touched |
|---|-----------|---------|---------------------|
| **1** | **List** | `GET /api/vendors/advance-return?page&pageSize&search&dateFrom&dateTo` + `x-company-id` | `vendor_advance_returns` (read, paginated; search on `voucherNo`, `note`) |
| **2** | **Create** | `POST /api/vendors/advance-return` | `vendor_advance_returns` +1; `vendors.presentBalance` (advance ↓ by amount); `accounts.lastBalance` +amount; `client_transactions` +1 (`VENDOR_ADVANCE_RETURN`, direction `receiv`) |
| **3** | **Update** | `PUT /api/vendors/advance-return/[id]` | Full reversal then re-apply: reverts old `vendors` + `accounts` + deletes old `client_transactions`; applies new values in same transaction |
| **4** | **Delete** | `DELETE /api/vendors/advance-return/[id]` | Reverses: `vendors.presentBalance` advance +amount; `accounts.lastBalance` −amount; deletes `client_transactions` row; deletes `vendor_advance_returns` row |

### Balance mechanics

- **Create:** `vendors.presentBalance` advance decreases by `amount` (if advance balance drops below zero, it flips to `due`). `accounts.lastBalance` increases by `amount` (money received into the account).
- **Delete:** Fully reversed — vendor advance restored, account balance reduced.

### Example

Vendor "Shahadat" has advance balance **10,000**. Company retrieves **3,000** back via bank transfer:

1. **Create** ADVR-0001: `vendor_advance_returns` +1; `vendors.presentBalance` becomes `{ type: "advance", amount: 7000 }`; `accounts["Main Bank"].lastBalance` +3,000; `client_transactions` ledger row `VENDOR_ADVANCE_RETURN`, direction `receiv`.
2. **Edit** to change amount to **4,000**: old entry reversed (advance back to 10,000, account −3,000, ledger deleted); new entry applied (advance → 6,000, account +4,000, new ledger row).
3. **Delete** ADVR-0001: `vendors.presentBalance` advance → 10,000 (restored), `accounts["Main Bank"].lastBalance` −4,000, ledger row deleted, `vendor_advance_returns` row deleted.

**Code:** `services/vendorAdvanceReturnService.ts`, `controllers/vendorAdvanceReturnController.ts`, `app/api/vendors/advance-return/*`, `models/vendor-advance-return.ts`, UI `app/dashboard/vendors/advance-return/page.tsx`.

**UI:** `FilterToolbar` (date range, search, refresh, Add), Ant `Table`, inline `AddModal` and `EditModal` (Shadcn Dialog), inline `fetch` calls for API.

---

## 12. Vendor Payment

**Total operations: 6** (voucher prefix **`VP-####`**; counter key **`vendor_payment_voucher`** on `counters`).

**Purpose:** Records a payment made **to** a vendor. Four distinct payment types control which collections are affected and how the payment is linked to invoice items.

| # | Operation | Trigger | Collections touched (always) |
|---|-----------|---------|------------------------------|
| **1** | **List** | `GET /api/vendors/payment?page&pageSize&search&startDate&endDate` + `x-company-id` | `vendor_payments` (read, paginated) |
| **2** | **Create** | `POST /api/vendors/payment` | `vendor_payments`, `vendors.presentBalance`, `accounts.lastBalance`, `client_transactions`; **+ type-specific** (see below) |
| **3** | **Update** | `PUT /api/vendors/payment/[id]` | Full reversal then re-apply across all same collections |
| **4** | **Delete** | `DELETE /api/vendors/payment/[id]` | Reverses all balance and ledger effects; for "invoice"/"ticket" also restores `invoice_items.paidAmount` |
| **5** | **View** | `GET /api/vendors/payment/[id]` | `vendor_payments` (read, populated) |
| **6** | **Allocate** | `POST /api/vendors/payment/[id]/allocations` | `vendor_payment_allocations`, `invoice_items.paidAmount` (only for "overall"/"advance" type) |

### Payment types

#### Type 1 — Overall (`paymentTo: "overall"`)

A general payment to a vendor not linked to any specific invoice or ticket.

**Collections affected:**

| Collection | Change |
|-----------|--------|
| `vendor_payments` | +1 row (`paymentTo: "overall"`) |
| `vendors` | `presentBalance` reduced by `amount` (due ↓ or advance ↑) |
| `accounts` | `lastBalance` −`totalAmount` (money out) |
| `client_transactions` | +1 row (`VENDOR_PAYMENT`, direction `payout`) |

**Allocation (post-payment):** After creating an Overall payment, the user can open the payment view page and click **"Add Invoice"** to allocate the amount to specific vendor invoice items. Each allocation:
- Creates a `vendor_payment_allocations` row
- Updates `invoice_items.paidAmount` and `dueAmount` for that vendor's items in the chosen invoice

**Example:**

Company pays **20,000** to vendor "Omor Faruk" (overall, no invoice reference) via "Main Bank":
- `vendor_payments` +1 (`VP-0001`, `paymentTo: "overall"`, `amount: 20000`)
- `vendors["Omor Faruk"].presentBalance` due decreases by 20,000 (e.g. 30,000 → 10,000 due)
- `accounts["Main Bank"].lastBalance` −20,000
- `client_transactions` +1 (`VENDOR_PAYMENT`, `payout`, `amount: 20000`)

User then allocates 12,000 to Invoice INV-001 and 8,000 to INV-002:
- `vendor_payment_allocations` +2 rows
- `invoice_items` for vendor in INV-001: `paidAmount` +12,000
- `invoice_items` for vendor in INV-002: `paidAmount` +8,000

**Delete VP-0001:** `vendors.presentBalance` due +20,000 (restored), `accounts.lastBalance` +20,000, `client_transactions` row deleted, `vendor_payments` deleted.

---

#### Type 2 — Advance (`paymentTo: "advance"`)

Pre-payment to a vendor before any invoice is raised. Increases vendor's advance balance.

**Collections affected:**

| Collection | Change |
|-----------|--------|
| `vendor_payments` | +1 row (`paymentTo: "advance"`) |
| `vendors` | `presentBalance` shifts toward advance (net += amount) |
| `accounts` | `lastBalance` −`totalAmount` |
| `client_transactions` | +1 row (`VENDOR_ADVANCE`, direction `payout`) |

**Allocation (post-payment):** Same as Overall — user can later allocate advance amounts to specific invoice items via the payment view page.

**Example:**

Company pre-pays **15,000** to vendor "Shahadat" (advance) via Cash:
- `vendor_payments` +1 (`VP-0002`, `paymentTo: "advance"`, `amount: 15000`)
- `vendors["Shahadat"].presentBalance` → advance increases by 15,000 (e.g. was due 5,000 → now advance 10,000)
- `accounts["Cash"].lastBalance` −15,000
- `client_transactions` +1 (`VENDOR_ADVANCE`, `payout`)

**Delete VP-0002:** Advance reversed — `vendors.presentBalance` advance −15,000, `accounts["Cash"].lastBalance` +15,000, ledger row deleted.

---

#### Type 3 — Specific Invoice (`paymentTo: "invoice"`)

Payment tied to a specific invoice. Allows selecting multiple vendor rows within that invoice and setting individual amounts.

**Collections affected:**

| Collection | Change |
|-----------|--------|
| `vendor_payments` | +1 row (`paymentTo: "invoice"`, with `invoiceId` and `invoiceVendors[]`) |
| `vendors` | `presentBalance` reduced by `totalAmount` |
| `accounts` | `lastBalance` −`totalAmount` |
| `client_transactions` | +1 row (`VENDOR_PAYMENT`, `payout`) |
| `invoice_items` | Each selected item: `paidAmount` +allocated amount, `dueAmount` updated |

**`invoiceVendors` array** (stored on the payment):

```
invoiceVendors: [{ vendorId, invoiceItemId, amount }]
```

Each entry maps one `invoice_items` row to a payment amount.

**Example:**

Invoice INV-003 has two vendor cost lines:
- Omor Faruk: totalCost 8,000 | paid 0 | due 8,000
- Shahadat: totalCost 5,000 | paid 0 | due 5,000

Company pays both in one VP:
- `vendor_payments` +1 (`VP-0003`, `paymentTo: "invoice"`, `invoiceId: INV-003`, `invoiceVendors: [{Omor, item1, 8000}, {Shahadat, item2, 5000}]`, `totalAmount: 13000`)
- `vendors["Omor Faruk"].presentBalance` due −8,000
- `vendors["Shahadat"].presentBalance` due −5,000
- `accounts["Main Bank"].lastBalance` −13,000
- `invoice_items[item1].paidAmount` = 8,000; `dueAmount` = 0
- `invoice_items[item2].paidAmount` = 5,000; `dueAmount` = 0
- `client_transactions` +1

**Delete VP-0003:** All reversed — `invoice_items.paidAmount` restored to 0, vendor balances restored, account balance +13,000, ledger deleted.

**Update VP-0003:** Service fully reverses old effects (restores `invoice_items`, vendor balance, account, ledger) then applies new values atomically in a Mongoose transaction.

---

#### Type 4 — Specific Ticket (`paymentTo: "ticket"`)

Payment for non-commission ticket cost lines (`invoice_items` with `itemType: "ticket"`, `product: "non_commission_ticket"`). Selection is vendor-first (pick vendor → pick individual ticket lines).

**Collections affected:**

| Collection | Change |
|-----------|--------|
| `vendor_payments` | +1 row (`paymentTo: "ticket"`, with `invoiceVendors[]` referencing ticket `invoice_items`) |
| `vendors` | `presentBalance` reduced by `totalAmount` |
| `accounts` | `lastBalance` −`totalAmount` |
| `client_transactions` | +1 row (`VENDOR_PAYMENT`, `payout`) |
| `invoice_items` | Each selected ticket item: `paidAmount` +allocated amount, `dueAmount` updated |

**Key difference from "invoice":** Selection UI starts with a **vendor selector** (not an invoice selector). Then it loads all non-commission ticket items for that vendor across all invoices, letting the user pick individual ticket lines.

**Example:**

Vendor "Omor Faruk" has two non-commission ticket items across two different invoices:
- Ticket TKT-001 in INV-005: totalCost 3,000 | paid 0 | due 3,000
- Ticket TKT-002 in INV-007: totalCost 4,500 | paid 1,000 | due 3,500

Company pays both tickets:
- `vendor_payments` +1 (`VP-0004`, `paymentTo: "ticket"`, `invoiceVendors: [{item:TKT-001, amount:3000}, {item:TKT-002, amount:3500}]`, `totalAmount: 6500`)
- `vendors["Omor Faruk"].presentBalance` due −6,500
- `accounts["Cash"].lastBalance` −6,500
- `invoice_items[TKT-001].paidAmount` = 3,000; `dueAmount` = 0
- `invoice_items[TKT-002].paidAmount` = 4,500; `dueAmount` = 0
- `client_transactions` +1

**Delete VP-0004:** All reversed — `invoice_items.paidAmount` restored, vendor balance +6,500, account +6,500, ledger deleted.

---

### Allocation sub-module (Overall / Advance only)

`vendor_payment_allocations` collection links a payment to one or more invoices post-hoc.

| # | Operation | Trigger | Collections |
|---|-----------|---------|-------------|
| **1** | **List** | `GET /api/vendors/payment/[id]/allocations` | `vendor_payment_allocations` + `invoices` (read) |
| **2** | **Create** | `POST /api/vendors/payment/[id]/allocations` | `vendor_payment_allocations` +rows; `invoice_items.paidAmount` updated per vendor per invoice |
| **3** | **Delete** | `DELETE /api/vendors/payment/[id]/allocations/[allocId]` | `vendor_payment_allocations` −1; `invoice_items.paidAmount` restored |

Remaining amount = `payment.amount` − sum of all `vendor_payment_allocations.appliedAmount` for that payment.

### Helper API routes

| Route | Purpose |
|-------|---------|
| `GET /api/vendors/payment/invoices` | All invoices that have vendor cost items (for "invoice" payment dropdown) |
| `GET /api/vendors/payment/invoices/[id]/vendors` | Vendor summary rows for a specific invoice (totalCost / paid / due per vendor) |
| `GET /api/vendors/payment/ticket-vendors` | Vendors that have at least one non-commission ticket item |
| `GET /api/vendors/payment/ticket-vendors/[id]/lines` | Non-commission ticket lines for a given vendor |
| `GET /api/vendors/[id]/invoices` | All invoices containing items for a given vendor (used by allocation modal) |

### Code paths

- **Model:** `models/vendor-payment.ts`, `models/vendor-payment-allocation.ts`
- **Service:** `services/vendorPaymentService.ts`
- **Controller:** `controllers/vendorPaymentController.ts`
- **API routes:** `app/api/vendors/payment/*`
- **UI list:** `app/dashboard/vendors/payment/page.tsx`
- **UI view:** `app/dashboard/vendors/payment/[id]/page.tsx`
- **Components:** `components/vendors/payment-modal.tsx`, `components/vendors/specific-invoice-payment.tsx`, `components/vendors/VendorPaymentAllocateModal.tsx`

### UI patterns

- **List page:** `FilterToolbar` (date range, search, refresh, Add Payment), Ant `Table` with `TableRowActions` (View → navigates to detail page, Edit, Delete with confirm).
- **Add/Edit modal** (`PaymentModal`): RHF `FormProvider`, `DateInput`, `VendorSelect`, `SpecificInvoicePayment` sub-form for invoice/ticket types. Payment type selector drives which sub-form renders.
- **View page** (`/dashboard/vendors/payment/[id]`): Ant `Tabs` — "Invoice" (placeholder) and "Details". Details tab shows payment header + either line-item table (for "invoice"/"ticket") or allocations table (for "overall"/"advance") with **"Add Invoice"** button that opens `VendorPaymentAllocateModal`.

---

## 13. Money Receipt (client collections)

**Total core operations: 5** (voucher prefix **`MR-####`**; counter key **`voucher_mr`** on `counters`).

**Purpose:** Records money **received from** a client into a company **account**. The `paymentTo` field selects how that cash is applied against **invoices** and how **client** and **account** balances move. All successful creates run inside a MongoDB transaction (`withTransaction`).

| # | Operation | Trigger | Collections touched (typical) |
|---|-----------|---------|--------------------------------|
| **1** | **List** | `GET /api/money-receipts?page&pageSize&clientId&search&startDate&endDate` + company scope | `money_receipts` (read, paginated) |
| **2** | **Create** | `POST /api/money-receipts` → `createMoneyReceipt` | `money_receipts`, `clients` (`presentBalance`), `accounts` (`lastBalance` +`hasTrxn`), `client_transactions`; **+ type-specific** (see below); optional `money_receipt_allocations` |
| **3** | **Update** | `PUT /api/money-receipts/[id]` | Adjusts deltas on client + account(s); respects existing `money_receipt_allocations` (cannot shrink below applied total); updates ledger rows tied to voucher |
| **4** | **Delete** | `DELETE /api/money-receipts/[id]` | Reverses client + account; reverses `invoices.receivedAmount` / `status` from `invoiceId` and from **every** `money_receipt_allocations` row; deletes allocation rows; deletes `client_transactions` with same `voucherNo` + `clientId` + `companyId` + `direction: receiv`; deletes `money_receipts` |
| **5** | **Allocate (advance only)** | `POST /api/money-receipts/[id]/allocations` → `createReceiptAllocations` | `money_receipt_allocations` +rows; updates each target `invoices.receivedAmount` / `status`; `client_transactions` per allocation (`invoiceType: INVOICE`); updates MR `allocatedAmount` / `remainingAmount` |

**Model enum (`paymentTo`):** `overall` | `advance` | `invoice` | `tickets` | `adjust`.

**Always on create (all types):**

| Collection | Change |
|-----------|--------|
| `money_receipts` | +1 row (`voucherNo`, `paymentTo`, `amount`, `discount`, `accountId`, `clientId`, `companyId`, …) |
| `clients` | `presentBalance` **increases** by paid amount (`amount − discount`) — treated as client paying down due or building advance in the same numeric field |
| `accounts` | `lastBalance` **+** paid amount (money in); `hasTrxn: true` |
| `client_transactions` | At least one row, `direction: receiv`, `paymentTypeId` = account |

**`money_receipt_allocations`:** Each row links one MR to one `invoiceId` with `appliedAmount` and duplicated `voucherNo`. Used whenever payment is split across invoices (overall distribution, specific invoice multi-row, tickets multi-row, and manual advance allocation from the receipt view).

---

### Type 1 — Overall (`paymentTo: "overall"`)

Client pays a lump sum **not** tied to a single invoice at entry time. The service **auto-distributes** the paid amount across the client’s open invoices (newest `createdAt` first) until the cash runs out or all dues are cleared.

| Collection | Change |
|-----------|--------|
| `invoices` | For each touched invoice: `receivedAmount` ↑, `status` → `partial` / `paid` |
| `money_receipt_allocations` | One row per invoice slice actually applied (may be **zero** rows if the client had no due invoices — then entire amount stays unallocated on the MR) |
| `client_transactions` | One row per allocation amount (`invoiceType` often `Sales Collection`); if money remains after all dues, an extra row with `invoiceType: OVERALL` for the leftover |

**Example:** Client has INV-A due 6,000 and INV-B due 5,000. Overall receipt **10,000**:

- `money_receipts` +1 (`MR-0001`, `paymentTo: overall`, paid 10,000)
- Assume order pays INV-B first then INV-A: `money_receipt_allocations` +2 (5,000 + 5,000), INV-B paid, INV-A partial 1,000 remaining due
- `client_transactions`: rows for 5,000 and 5,000 (plus possibly OVERALL 0 if fully allocated)
- `clients.presentBalance` +10,000; `accounts` +10,000

**Delete MR-0001:** allocations removed, invoice `receivedAmount` restored, client and account reversed, ledger rows for voucher removed.

---

### Type 2 — Advance (`paymentTo: "advance"`)

Client **pre-pays**; nothing is applied to a specific invoice at save time. **`invoiceId`** on the MR is usually empty; **`remainingAmount`** on the MR starts equal to paid amount (minus any immediate allocation if you add rows later).

| Collection | Change |
|-----------|--------|
| `invoices` | **No** automatic update on create |
| `money_receipt_allocations` | **Optional** — created later via **Allocate** API / `ReceiptAdjustModal` on the MR detail page (`paymentTo === "advance"` only) |
| `client_transactions` | Standard single `receiv` row (`invoiceType` reflects `ADVANCE`) |

**Downstream:** When a **new** invoice is created, `invoiceService.autoApplyClientAdvanceToInvoice` finds advance MRs with `remainingAmount > 0` (oldest first), creates `money_receipt_allocations` against the new invoice, and updates MR `allocatedAmount` / `remainingAmount`.

**Example:** Advance **20,000** on MR-0002:

- `money_receipts` (`remainingAmount: 20000`, `allocatedAmount: 0`)
- `clients` +20,000; `accounts` +20,000; `client_transactions` +1

Later user opens MR view and allocates **8,000** to INV-X: `money_receipt_allocations` +1; INV-X `receivedAmount` +8,000; MR `remainingAmount` → 12,000; extra `client_transactions` row(s) per allocation rules.

---

### Type 3 — Specific invoice (`paymentTo: "invoice"`)

Payment against one or more **invoices** of the same client.

| Path | Behaviour |
|------|-----------|
| **Single invoice** | Body includes `invoiceId`; paid amount must not exceed that invoice’s **due** (`netTotal − receivedAmount`). One allocation row (or inline invoice update + allocation). |
| **Multi-row UI** | Body includes `invoiceAllocations: [{ invoiceId, amount }, …]`; sum of amounts must equal paid amount; each invoice validated for ownership and due cap. |

| Collection | Change |
|-----------|--------|
| `invoices` | Each targeted invoice: `receivedAmount` ↑, `status` updated |
| `money_receipt_allocations` | One row per invoice slice |
| `client_transactions` | Multiple `receiv` rows when several invoices (same voucher); otherwise one row |

**Example:** MR-0003 pays INV-001 **3,000** and INV-002 **2,000** (total 5,000):

- Two allocation rows; both invoices updated; client +5,000; account +5,000; ledger reflects split.

---

### Type 4 — Specific tickets (`paymentTo: "tickets"`)

Same mechanics as **invoice** type for the backend: **`invoiceAllocations`** against **non-commission** (or ticket-scoped) invoice rows, with the same validation (client owns invoice, amount ≤ due, totals match). UI collects multiple ticket lines; service treats them like multi-invoice allocations.

| Collection | Change |
|-----------|--------|
| `invoices` / `money_receipt_allocations` / `client_transactions` | Same pattern as Type 3 |

---

### Type 5 — Adjust with due (`paymentTo: "adjust"`)

Accounting-only movement on the **client** side: money recorded into the account and client balance moves like a receipt, **but**:

- **No** `invoices` rows are updated on create.
- **No** `money_receipt_allocations` for applying to invoices.
- **No** automatic application when new invoices are created (contrast **advance**).
- **No** “Add invoice” adjustment from the MR view for this type (UI guard).

| Collection | Change |
|-----------|--------|
| `money_receipts` | +1 (`paymentTo: adjust`) |
| `clients` / `accounts` / `client_transactions` | Same sign pattern as other receipts |

**Example:** “Adjust with due” **7,000** recorded against client **CL** on MR-0004:

- Client `presentBalance` +7,000; bank account +7,000; ledger `receiv` 7,000; **no** invoice `receivedAmount` change.

---

### Allocation sub-module (client — advance MR only)

| # | Operation | Trigger | Collections |
|---|-----------|---------|---------------|
| **1** | **List** | `GET /api/money-receipts/[id]/allocations` | `money_receipt_allocations` + invoice headers (read) |
| **2** | **Create** | `POST /api/money-receipts/[id]/allocations` | See operation **5** in the core table above |
| **3** | **Delete** | `DELETE /api/money-receipts/[id]/allocations/[allocId]` | Removes one allocation and reverses that slice on the invoice + ledger |

**Remaining on MR** = `paidAmount − sum(appliedAmount)` across allocations (service recomputes from DB for safety).

### Code paths

- **Models:** `models/money-receipt.ts`, `models/money-receipt-allocation.ts`
- **Service:** `services/moneyReceiptService.ts` (`createMoneyReceipt`, `createMoneyReceiptInSession` for atomic create-with-invoice), `createReceiptAllocations`, update/delete
- **API:** `app/api/money-receipts/*`
- **UI list:** `app/dashboard/money-receipts/page.tsx`
- **UI view:** `app/dashboard/money-receipts/[id]/page.tsx`
- **UI create/edit:** `components/money-receipts/ReceiptFormModal.tsx`, advance allocator `components/money-receipts/ReceiptAdjustModal.tsx`

### UI patterns

- **Receipt form:** Payment type radio drives which extra grids appear (overall vs advance vs invoice rows vs tickets vs adjust info banner).
- **Invoice list MR column:** Resolved via **`money_receipt_allocations.voucherNo`** (not `money_receipts.invoiceId` alone) so **overall** receipts still show on invoice rows.

---

## 14. Client advance return (money returned to client)

**Total operations: 4** (voucher prefix **`ADR-####`**; counter key **`voucher_adr`** on `counters`).

**Purpose:** Records returning **excess client advance** (or paying out held advance) **out** of a selected **account**. This is the **mirror** of receiving an advance MR: cash leaves the account and the client’s `presentBalance` drops (client is less “ahead”).

| # | Operation | Trigger | Collections touched |
|---|-----------|---------|---------------------|
| **1** | **List** | `GET /api/advance-returns?page&pageSize&search&dateFrom&dateTo&clientId` + header **`x-company-id`** | `advance_returns` (read, paginated; search on `voucherNo`, `clientName`, `accountName`) |
| **2** | **Create** | `POST /api/advance-returns` + body | `advance_returns` +1; `clients` `presentBalance` **−** amount (must have sufficient advance); `accounts` `lastBalance` **−** amount; `client_transactions` +1 (`invoiceType: Money Advance Return`, `direction: payout`) |
| **3** | **Update** | `PUT /api/advance-returns/[id]` | Transaction: adjusts client + account by **delta**; updates `advance_returns` row; updates matching `client_transactions` (same `voucherNo`, `payout`) |
| **4** | **Delete** | `DELETE /api/advance-returns/[id]` | `clients` `presentBalance` **+** amount (reversed); `accounts` `lastBalance` **+** amount; `client_transactions.deleteOne` by `voucherNo` + `clientId` + `payout`; `advance_returns` removed |

### Example

Client **CL** has `presentBalance` high enough to represent **25,000** advance. Company returns **10,000** via **Bank A** (ADR-0001):

1. **Create:** `advance_returns` +1; `clients.CL.presentBalance` 25,000 → 15,000; `accounts.A.lastBalance` −10,000; `client_transactions` payout 10,000 (`Money Advance Return`).
2. **Edit** amount to **12,000:** client −2,000 more (net −12,000 vs original −10,000), account −2,000 more, row + ledger updated.
3. **Delete ADR-0001:** client +12,000, account +12,000, ledger row deleted, `advance_returns` deleted.

**Code:** `services/advanceReturnService.ts`, `controllers/advanceReturnController.ts`, `app/api/advance-returns/*`, `models/advance-return.ts`.

**UI:** `app/dashboard/money-receipts/advance-return/page.tsx` — `FilterToolbar` (date range, debounced search, refresh), Ant `Table`, `AdvanceReturnModal` for add/edit, `DeleteButton` for remove. **Note:** `x-company-id` header is required on API calls from this page (same pattern as other money modules).

---

## 15. Invoices (three `invoiceType` values)

**Purpose:** Sales documents that increase client due, store line economics, and (for types with vendor lines) increase vendor due. All types share collection **`invoices`** with discriminator field **`invoiceType`:** `"other"` | `"visa"` | `"non_commission"`.

| Type | UI / list route | Typical create API | Child collections (in addition to `invoices` + `invoice_items`) |
|------|-----------------|--------------------|-----------------------------------|
| **A — Other** | `app/dashboard/invoices/page.tsx` | `POST /api/invoices` | `invoice_items`, optional `invoice_tickets`, `invoice_hotels`, `invoice_transports`, `invoice_passports` |
| **B — Visa** | `app/dashboard/invoices-visa/page.tsx` | `POST /api/invoices/visa` (forces `invoiceType: visa`) | `invoice_items` (visa-shaped lines), `invoice_passports`, … |
| **C — Non-commission** | `app/dashboard/invoices-non-commission/page.tsx` | `POST /api/invoices/non-commission` | `invoice_tickets`, `invoice_items` (`product: non_commission_ticket`), `invoice_passports`, `invoice_transports` per ticket |

**Invoice number prefixes by type (next-no API):**
- **Other:** `IO-####`
- **Visa:** `IV-####`
- **Non-commission:** `ANC-####`

**Shared financial effects on create (high level):**

| Collection | Typical change |
|-----------|------------------|
| `invoices` | Header + `billing` summary, `netTotal`, `receivedAmount` (0 or auto-applied advance), `status` |
| `invoice_items` | Line-level sales/cost/vendor/product linkage |
| `clients` | `presentBalance` moves with invoice total (client owes more / due increases in the stored convention) |
| `vendors` | When lines carry vendor cost: `presentBalance` cost bucket updated (batched per vendor in service) |
| `client_transactions` | Non-cash **invoice** ledger row (`transactionType: invoice`, `isMonetoryTranseciton: false`) for client reporting |
| `money_receipts` / `money_receipt_allocations` | Optional if user enters inline payment on create; advance auto-apply may create allocations against new invoice |

**List / filter APIs:**

| Type | List query |
|------|------------|
| Other | `GET /api/invoices?invoiceType=other&page&pageSize&search&status&dateFrom&dateTo` |
| Visa | `GET /api/invoices?invoiceType=visa&…` (visa page uses this) |
| Non-commission | `GET /api/invoices/non-commission?…` (dedicated route; service expects **`dateFrom`** / **`dateTo`** on `salesDate`; map from UI if you use other param names) |

**Example (other):** User raises IO-0100 for client **CL** net **15,000** with two billing lines and one vendor cost **9,000**:

- `invoices` +1; `invoice_items` +2; vendor balance +9,000 cost; client due +15,000 (`presentBalance` convention); `client_transactions` invoice row; optional MR if payment captured on same submit.

**Example (visa):** Same pattern but items carry visa metadata (country, visa type, …); list page shows extra columns from aggregation.

**Example (non-commission):** One row per air ticket: `invoice_tickets` + `invoice_items` with `non_commission_ticket`; passports/transports hang off ticket ids; vendor map aggregated for vendor balance batch.

**Delete (all types):** `DELETE /api/invoices/[id]` soft-deletes header + children (`isDeleted: true`), reverses client + vendor deltas, removes invoice-scoped `client_transactions`, per service rules.

**Code:** `services/invoiceService.ts` (`createInvoice`, `createNonCommissionInvoice`, `listInvoices`, `listNonCommissionInvoices`, …), `app/api/invoices/*`, modals `add-invoice-modal.tsx`, `add-visa-invoice-modal.tsx`, `add-non-commission-modal.tsx`.

---

## 16. Client Ledger (report)

**Purpose:** Statement of all debit/credit movements for a single client, derived from `client_transactions`. Produces a chronological ledger with a running balance and an entity details card.

**Total operations: 1** (read-only; no writes).

| # | Operation | Trigger | Collections |
|---|-----------|---------|-------------|
| **1** | **Fetch ledger** | `GET /api/reports/client-ledger?clientId&dateFrom?&dateTo?` + `x-company-id` | `client_transactions` (aggregate with lookup to `invoice_items` and `invoice_tickets`), `clients_manager` (single document for entity info) |

### Data sources

| Column | Source |
|--------|--------|
| Date / VoucherNo / Amount / Direction / Note | `client_transactions` |
| Pax Name | `invoice_items.paxName` + `invoice_tickets.passengerName` (joined via `invoiceId`) |
| PNR / Ticket No. / Route | `invoice_tickets` (joined via `invoiceId`) |
| Pay Type | `client_transactions.payType` + `accountName` |
| Debit / Credit | Derived from `direction`: `"receiv"` → credit, anything else → debit |
| Balance | Cumulative `debit − credit` (positive = Due, negative = Advance) |
| Entity card | `clients_manager` document (`name`, `phone`, `email`, `address`) |

### Particulars mapping

| `transactionType` / `invoiceType` | Particulars label |
|-----------------------------------|-------------------|
| `transactionType: "invoice"` | `Invoice <voucherNo>` |
| `invoiceType: "INVOICE"` | `Payment (Invoice)` |
| `invoiceType: "EXPENSE"` | `Expense` |
| `invoiceType: "BALANCE_TRANSFER"` | `Balance Transfer` |
| anything else | `Money Receipt` |

### URL deep-link

Navigating to `/dashboard/reports/client-ledger?clientId=<id>` pre-selects the client in the dropdown and auto-fetches the ledger once the lookup options have loaded.

### Response shape

```json
{
  "entries": [{ "id", "date", "particulars", "voucherNo", "paxName", "pnr", "ticketNo", "route", "payType", "debit", "credit", "balance", "note" }],
  "totalDebit": 0,
  "totalCredit": 0,
  "closingBalance": 0,
  "entity": { "name", "phone", "email", "address" }
}
```

### Example

Client "Mohammad Yeasir Arafat" has one invoice (INV-0001, 15,000) and one money receipt (MR-0001, 5,000):

1. **GET** `/api/reports/client-ledger?clientId=<id>` →
   - Row 1: `Invoice INV-0001`, debit 15,000, balance Due 15,000
   - Row 2: `Payment (Invoice)`, credit 5,000, balance Due 10,000
   - `totalDebit: 15000`, `totalCredit: 5000`, `closingBalance: 10000`
   - `entity: { name: "Mohammad Yeasir Arafat", phone: "+966...", email: "", address: "..." }`
2. UI renders `LedgerEntityCard` ("Client Details") above the `FilterToolbar`, then the Ant Design table below.

**Code:** `services/clientLedgerService.ts`, `app/api/reports/client-ledger/route.ts`, UI `app/dashboard/reports/client-ledger/page.tsx`, shared component `components/shared/ledger-entity-card.tsx`.

**UI:** `LedgerEntityCard` (appears after first search), `FilterToolbar` (date range + `ClearableSelect` for client + Search button), Ant `Table` with horizontal scroll and fixed summary row. URL param `clientId` triggers auto-fetch on mount.

---

## 17. Vendor Ledger (report)

**Purpose:** Statement of all cost and payment movements for a single vendor, combining two sources: invoice costs from `invoice_items` (grouped per invoice) and payment/return entries from `client_transactions`.

**Total operations: 1** (read-only; no writes).

| # | Operation | Trigger | Collections |
|---|-----------|---------|-------------|
| **1** | **Fetch ledger** | `GET /api/reports/vendor-ledger?vendorId&dateFrom?&dateTo?` + `x-company-id` | `invoice_items` (aggregate + lookup to `invoices` + `invoice_tickets`), `client_transactions` (payments/returns only), `vendors` (single document for entity info) |

### Data sources

Two separate query streams are merged and sorted chronologically:

#### Stream A — Invoice costs (`invoice_items`)

| Column | Source |
|--------|--------|
| Date | `invoices.salesDate` (via `$lookup`) |
| VoucherNo | `invoices.invoiceNo` |
| Total Cost | `$sum: invoice_items.totalCost` (grouped per `invoiceId`) |
| Pax Name | `invoice_items.paxName` + `invoice_tickets.passengerName` |
| PNR / Ticket No. / Route | `invoice_tickets` (joined via `invoiceId`) |
| Particulars | `"Invoice Cost"` |
| Ledger impact | **Credit** (we owe the vendor for the service) |

#### Stream B — Payments / returns (`client_transactions`)

| Column | Source |
|--------|--------|
| Date / VoucherNo / Amount / Note | `client_transactions` |
| Particulars | Derived from `invoiceType`: `VENDOR_PAYMENT` → "Vendor Payment", `ADVANCE_RETURN` → "Advance Return", etc. |
| Ledger impact | `direction: "payout"` → **Debit** (we paid); `direction: "receiv"` → **Credit** (vendor returned advance) |

> `direction: "invoice"` rows are excluded from Stream B to avoid double-counting (those costs are sourced from `invoice_items`).

### Running balance

`balance += credit − debit` (positive = Due to vendor, negative = Advance held by us).

### URL deep-link

Navigating to `/dashboard/reports/vendor-ledger?vendorId=<id>` pre-selects the vendor in the dropdown and auto-fetches the ledger once the lookup options have loaded.

### Response shape

```json
{
  "entries": [{ "id", "date", "particulars", "voucherNo", "paxName", "pnr", "ticketNo", "route", "payType", "debit", "credit", "balance", "note" }],
  "totalDebit": 0,
  "totalCredit": 0,
  "closingBalance": 0,
  "entity": { "name", "mobile", "email", "address" }
}
```

### Example

Vendor "Omor Faruk" has one invoice cost (INV-0003, totalCost 8,000) and one payment (VP-0001, 5,000):

1. **GET** `/api/reports/vendor-ledger?vendorId=<id>` →
   - Row 1: `Invoice Cost` (from `invoice_items`), credit 8,000, balance Due 8,000
   - Row 2: `Vendor Payment` (from `client_transactions`), debit 5,000, balance Due 3,000
   - `totalDebit: 5000`, `totalCredit: 8000`, `closingBalance: 3000`
   - `entity: { name: "Omor Faruk", mobile: "01700000000", email: "", address: "" }`
2. UI renders `LedgerEntityCard` ("Vendor Details") above the `FilterToolbar`, then the Ant Design table below.

**Code:** `services/vendorLedgerService.ts`, `app/api/reports/vendor-ledger/route.ts`, UI `app/dashboard/reports/vendor-ledger/page.tsx`, shared component `components/shared/ledger-entity-card.tsx`.

**UI:** `LedgerEntityCard` (appears after first search), `FilterToolbar` (date range + `ClearableSelect` for vendor + Search button), Ant `Table` with horizontal scroll and fixed summary row. URL param `vendorId` triggers auto-fetch on mount.
