-- Create database (run this command separately in psql)
-- CREATE DATABASE accounting_test;

-- Connect to the database and run the following:

-- Schema
CREATE TABLE AccountingLedgerEntry (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    account VARCHAR(255) NOT NULL,
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    party VARCHAR(255),
    note TEXT,
    bankaccount VARCHAR(255),
    reference VARCHAR(255),
    reconciled BOOLEAN DEFAULT FALSE,
    companyid INT NOT NULL DEFAULT 1
);

-- Sample Data
INSERT INTO AccountingLedgerEntry
(date, account, debit, credit, party, note, bankaccount, reference, reconciled, companyid)
VALUES
('2025-01-02', 'Cash', 10000, 0, 'Investor', 'Capital Contribution', 'MainBank', 'DEP001', TRUE, 1),
('2025-01-05', 'Office Rent', 0, 2000, 'Landlord Ltd.', 'January rent', 'MainBank', 'CHQ101', TRUE, 1),
('2025-01-10', 'Inventory', 0, 3000, 'Supplier A', 'Purchase inventory', 'MainBank', 'CHQ102', FALSE, 1),
('2025-01-15', 'Sales', 0, 8000, 'Customer B', 'Sales Invoice', NULL, NULL, NULL, 1),
('2025-01-16', 'Cash', 8000, 0, 'Customer B', 'Payment received', 'MainBank', 'DEP002', TRUE, 1),
('2025-01-20', 'Utilities Expense', 0, 500, 'Power Co', 'Electricity bill', 'MainBank', 'CHQ103', TRUE, 1),
('2025-01-25', 'Bank Loan', 0, 7000, 'BigBank', 'Loan received', 'MainBank', 'DEP003', TRUE, 1),
('2025-01-26', 'Cash', 7000, 0, 'BigBank', 'Loan deposit', 'MainBank', 'DEP003', TRUE, 1),
('2025-01-28', 'Bank Charges', 0, 500, 'BigBank', 'Monthly service charge', 'MainBank', 'CHQ104', FALSE, 1);

-- Add indexes for performance
CREATE INDEX idx_accounting_date ON AccountingLedgerEntry(date);
CREATE INDEX idx_accounting_companyid ON AccountingLedgerEntry(companyid);
CREATE INDEX idx_accounting_bankaccount ON AccountingLedgerEntry(bankaccount);
CREATE INDEX idx_accounting_reconciled ON AccountingLedgerEntry(reconciled);
CREATE INDEX idx_accounting_date ON AccountingLedgerEntry(date);

--   CREATE INDEX idx_accounting_date ON AccountingLedgerEntry(date);
--   Purpose of: Speed up date range queries
--   - Used for: Cash flow statements filtering by fromDate and toDate
--   - Query example: WHERE date >= '2025-01-01' AND date <= '2025-01-31'
--   - Benefit: Instead of scanning all rows, PostgreSQL can quickly find entries within date ranges

--   CREATE INDEX idx_accounting_companyid ON
--   AccountingLedgerEntry(companyid);

--   Purpose: Speed up company-specific queries
--   - Used for: Both APIs filter by company ID
--   - Query example: WHERE companyid = 1
--   - Benefit: Essential for multi-tenant systems where each company's data needs quick isolation

--   CREATE INDEX idx_accounting_bankaccount ON
--   AccountingLedgerEntry(bankaccount);

--   Purpose: Speed up bank account filtering
--   - Used for: Bank reconciliation queries filtering by specific bank accounts
--   - Query example: WHERE bankaccount = 'MainBank'
--   - Benefit: Quickly find all transactions for a specific bank account without full table scan

--   CREATE INDEX idx_accounting_reconciled ON
--   AccountingLedgerEntry(reconciled);

--   Purpose: Speed up reconciliation status queries
--   - Used for: Finding unreconciled transactions (reconciled = FALSE)
--   - Query example: WHERE reconciled = FALSE
--   - Benefit: Critical for bank reconciliation - quickly identify outstanding items

--   Performance Impact

--   Without these indexes, every query would require a full table scan -
--   examining every row. With indexes:
--   - Date range queries: ~O(log n) instead of O(n)
--   - Company filtering: ~O(log n) instead of O(n)
--   - Bank account filtering: ~O(log n) instead of O(n)
--   - Reconciliation queries: ~O(log n) instead of O(n)

--   For a system that could grow to millions of transactions, these indexes are essential for maintaining reasonable response times.