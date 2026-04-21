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

<!-- Next module: copy the pattern (## N. Name, table, example, code paths). -->
