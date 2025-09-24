# Accounting & Backend Technical Test - Solution

## Overview

This solution implements two accounting APIs as specified: a Cash Flow Statement API and a Bank Reconciliation Statement API, built with Node.js/Express and PostgreSQL.

## Deliverables

### Task 1 - Cash Flow Statement API

**PostgreSQL SQL Query**: Located in `queries/cashflow.js`
- Retrieves transactions with actual cash impact
- Filters by company and date range
- Excludes non-cash transactions (e.g., sales invoices without bank accounts)

**Express.js Controller**: `controllers/cashflow.js`
- Endpoint: `GET /api/cashflow?companyid=1&fromDate=2025-01-01&toDate=2025-01-31`
- Classifies transactions into Operating, Investing, and Financing activities
- Returns JSON with cash inflows, outflows, net change, and closing balance

**JSON Response Screenshot**: Available in `response_screenshots/` folder

### Task 2 - Bank Reconciliation Statement API

**PostgreSQL SQL Query**: Located in `queries/reconciliation.js`
- Identifies unreconciled transactions (`reconciled = FALSE`)
- Retrieves all necessary transaction details for classification

**Express.js Controller**: `controllers/reconciliation.js`
- Endpoint: `GET /api/bank-reconciliation?companyid=1&bankaccount=MainBank`
- Classifies unreconciled items into outstanding checks, deposits in transit, and ledger adjustments
- Returns JSON with ledger balance, bank balance, reconciling items, and adjusted balances

**JSON Response Screenshot**: Available in `response_screenshots/` folder

## Implementation Highlights

### Cash Flow Classification Logic
- **Operating Activities**: Rent, utilities, customer payments, bank charges
- **Investing Activities**: Long-term asset purchases (inventory classified as operating per business context)
- **Financing Activities**: Capital contributions, loans (identified by keywords and party names)

### Bank Reconciliation Logic
- **Outstanding Checks**: Company-issued payments not yet cleared by bank (CHQ102: $3,000)
- **Unrecorded Bank Charges**: Bank-initiated fees not recorded in ledger (CHQ104: $500)
- **Balance Reconciliation**: Ledger $22,500 - $500 = $22,000; Bank $19,000 + $3,000 = $22,000

## Test Results

**Task 1**: Net cash change of $19,000 (Operating: +$2,000, Financing: +$17,000, Investing: $0)

**Task 2**: Successfully reconciled to $22,000 adjusted balance for both ledger and bank

## Testing

Basic endpoint tests are included in `tests/` folder. Run with:
```bash
npm test
```

Tests validate API structure, parameter handling, and response format but do not test business logic calculations.

## File Structure

```
├── controllers/
│   ├── cashflow.js           # Task 1 Express controller
│   └── reconciliation.js    # Task 2 Express controller
├── queries/
│   ├── cashflow.js           # Task 1 SQL queries
│   └── reconciliation.js    # Task 2 SQL queries
├── tests/                    # API endpoint tests
├── response_screenshots/     # JSON response screenshots
├── response_json/
│   ├── task1.json         # Expected Task 1 output
│   └── task2.json         # Expected Task 2 output
```