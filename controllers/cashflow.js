const db = require('../config/database');
const CashFlowQueries = require('../queries/cashflow');

class CashFlowController {
  constructor() {
    this.queries = new CashFlowQueries();
  }

  async getOpeningBalance(companyId, fromDate) {
    const result = await db.query(this.queries.getOpeningBalanceQuery(), [companyId, fromDate]);
    return parseFloat(result.rows[0].opening_balance);
  }

  async getTransactions(companyId, fromDate, toDate) {
    const result = await db.query(this.queries.getTransactionsQuery(), [companyId, fromDate, toDate]);
    return result.rows;
  }

  // Accounting Business Logic: Classify transactions according to cash flow statement principles
  classifyTransaction(transaction) {
    const { account, note, party, debit, credit } = transaction;
    
    // Only include actual cash transactions in cash flow statement
    // Exclude liability accounts that don't represent cash movements
    if (!this.isCashFlowTransaction(transaction)) {
      return null; // Exclude from cash flow statement
    }
    
    // Cash flow classification based on accounting standards
    if (account === 'Cash') {
      // For Cash account entries, classify by source/purpose
      if (debit > 0) { // Cash inflow
        // Financing - Capital contributions, loans from financial institutions
        if (note && (note.toLowerCase().includes('capital') || 
                    note.toLowerCase().includes('contribution') ||
                    note.toLowerCase().includes('investment'))) {
          return 'Financing Activities';
        }
        
        // Financing - Loans (check both note and party)
        if ((note && note.toLowerCase().includes('loan')) ||
            (party && (party.toLowerCase().includes('bank') || 
                      party.toLowerCase().includes('lender')))) {
          return 'Financing Activities';
        }
        
        // Operations: Customer payments (default for other cash inflows)
        return 'Operating Activities';
      }
      
      if (credit > 0) { // Cash outflow - typically operating unless specified
        return 'Operating Activities';
      }
    }
    
    // For non-Cash accounts, classify by account type
    // Operations - Expense accounts
    if (['Office Rent', 'Utilities Expense', 'Bank Charges', 'Salary Expense', 
         'Insurance Expense', 'Marketing Expense', 'Professional Fees'].includes(account)) {
      return 'Operating Activities';
    }
    
    // Operations - Current assets (inventory, accounts receivable)
    if (['Inventory', 'Accounts Receivable', 'Prepaid Expenses'].includes(account)) {
      return 'Operating Activities';
    }
    
    // Investing - Long-term assets
    if (['Equipment', 'Property', 'Land', 'Building', 'Investments', 
         'Marketable Securities', 'Patent', 'Trademark'].includes(account)) {
      return 'Investing Activities';
    }
    
    // Financing - Equity and long-term debt accounts (BUT NOT LIABILITY ACCOUNTS)
    if (['Common Stock', 'Retained Earnings', 'Dividends'].includes(account)) {
      return 'Financing Activities';
    }
    
    // Default to Operating for unclassified items
    return 'Operating Activities';
  }

  // Determine if transaction represents actual cash flow (exclude liability entries)
  isCashFlowTransaction(transaction) {
    const { account, bankaccount } = transaction;
    
    // Always include Cash account transactions
    if (account === 'Cash') return true;
    
    // Exclude liability accounts that don't represent cash flows
    // These are accounting entries that record obligations, not cash movements
    if (['Bank Loan', 'Notes Payable', 'Accounts Payable', 'Accrued Liabilities'].includes(account)) {
      return false;
    }
    
    // Include transactions that have bank accounts (represent actual cash movements)
    return bankaccount !== null;
  }

  // Calculate cash flow amount for each transaction
  calculateCashFlowAmount(transaction) {
    const { account, debit, credit } = transaction;
    
    if (account === 'Cash') {
      // For Cash account: debit = inflow (+), credit = outflow (-)
      return debit - credit;
    } else {
      // For other accounts: represents the cash impact
      // Credit to expense = cash outflow (-), Debit to asset = cash outflow (-)
      return -(credit - debit);
    }
  }

  // Process raw transactions into classified cash flows
  processTransactions(transactions) {
    const activities = {
      'Operating Activities': { inflows: [], outflows: [], netCashFlow: 0 },
      'Investing Activities': { inflows: [], outflows: [], netCashFlow: 0 },
      'Financing Activities': { inflows: [], outflows: [], netCashFlow: 0 }
    };

    let totalInflows = 0;
    let totalOutflows = 0;

    transactions.forEach(transaction => {
      const activityType = this.classifyTransaction(transaction);
      
      // Skip transactions that don't represent cash flows
      if (!activityType) return;
      
      const cashFlowAmount = this.calculateCashFlowAmount(transaction);
      
      // Skip zero-amount transactions
      if (cashFlowAmount === 0) return;

      const item = {
        account: transaction.account,
        amount: Math.abs(cashFlowAmount),
        party: transaction.party,
        note: transaction.note,
        date: transaction.date
      };

      if (cashFlowAmount > 0) {
        // Cash inflow
        activities[activityType].inflows.push(item);
        activities[activityType].netCashFlow += cashFlowAmount;
        totalInflows += cashFlowAmount;
      } else {
        // Cash outflow
        activities[activityType].outflows.push(item);
        activities[activityType].netCashFlow += cashFlowAmount; // Already negative
        totalOutflows += Math.abs(cashFlowAmount);
      }
    });

    return {
      activities,
      totals: {
        totalInflows,
        totalOutflows,
        netChange: totalInflows - totalOutflows
      }
    };
  }

  formatCashFlowStatement(processedData, openingBalance, companyId, fromDate, toDate) {
    const { activities, totals } = processedData;

    return {
      period: {
        fromDate,
        toDate,
        companyId
      },
      operatingActivities: {
        inflows: activities['Operating Activities'].inflows,
        outflows: activities['Operating Activities'].outflows,
        netOperatingCashFlow: Math.round(activities['Operating Activities'].netCashFlow * 100) / 100
      },
      investingActivities: {
        inflows: activities['Investing Activities'].inflows,
        outflows: activities['Investing Activities'].outflows,
        netInvestingCashFlow: Math.round(activities['Investing Activities'].netCashFlow * 100) / 100
      },
      financingActivities: {
        inflows: activities['Financing Activities'].inflows,
        outflows: activities['Financing Activities'].outflows,
        netFinancingCashFlow: Math.round(activities['Financing Activities'].netCashFlow * 100) / 100
      },
      summary: {
        totalCashInflows: Math.round(totals.totalInflows * 100) / 100,
        totalCashOutflows: Math.round(totals.totalOutflows * 100) / 100,
        netChangeInCash: Math.round(totals.netChange * 100) / 100,
        openingCashBalance: Math.round(openingBalance * 100) / 100,
        closingCashBalance: Math.round((openingBalance + totals.netChange) * 100) / 100
      }
    };
  }

  async getCashFlowStatement(companyId, fromDate, toDate) {
    const [openingBalance, transactions] = await Promise.all([
      this.getOpeningBalance(companyId, fromDate),
      this.getTransactions(companyId, fromDate, toDate)
    ]);

    const processedData = this.processTransactions(transactions);
    return this.formatCashFlowStatement(processedData, openingBalance, companyId, fromDate, toDate);
  }
}

const cashFlowController = new CashFlowController();

const getCashFlowStatement = async (req, res) => {
  try {
    const { companyid, fromDate, toDate } = req.query;

    if (!companyid || !fromDate || !toDate) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['companyid', 'fromDate', 'toDate']
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'Dates must be in YYYY-MM-DD format'
      });
    }

    const companyId = parseInt(companyid);
    if (isNaN(companyId)) {
      return res.status(400).json({
        error: 'Invalid company ID',
        message: 'Company ID must be a valid number'
      });
    }

    const cashFlowStatement = await cashFlowController.getCashFlowStatement(companyId, fromDate, toDate);
    res.json(cashFlowStatement);
  } catch (error) {
    console.error('Error in getCashFlowStatement:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to generate cash flow statement'
    });
  }
};

module.exports = {
  getCashFlowStatement
};