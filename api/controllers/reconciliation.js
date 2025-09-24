const db = require('../config/database');
const BankReconciliationQueries = require('../queries/reconciliation');

class BankReconciliationController {
  constructor() {
    this.queries = new BankReconciliationQueries();
  }

  async getLedgerBalance(companyId, bankAccount) {
    //we're using hardcoded balance (like bank balance)
    const result = await db.query(this.queries.getLedgerBalanceQuery());
    return parseFloat(result.rows[0]?.ledger_balance) || 0;
  }

  async getBankStatementBalance(companyId, bankAccount) {
    const result = await db.query(this.queries.getBankStatementBalanceQuery());
    return parseFloat(result.rows[0]?.bank_statement_balance) || 0;
  }

  async getUnreconciledTransactions(companyId, bankAccount) {
    const result = await db.query(this.queries.getUnreconciledTransactionsQuery(), [companyId, bankAccount || '']);
    return result.rows || [];
  }

  async getReconciliationSummary(companyId, bankAccount) {
    const result = await db.query(this.queries.getReconciliationSummaryQuery(), [companyId, bankAccount || '']);
    return result.rows[0] || {};
  }

  formatReconciliationStatement(ledgerBalance, bankBalance, unreconciledItems, summary, companyId, bankAccount) {
    // Categorize unreconciled items
    const reconcilingItems = {
      outstandingChecks: [],
      depositsInTransit: [],
      bankErrors: [],
      ledgerAdjustments: []
    };

    let adjustedLedgerBalance = ledgerBalance;
    let adjustedBankBalance = bankBalance;

    // Handle case where unreconciledItems might be null or undefined
    if (!unreconciledItems || !Array.isArray(unreconciledItems)) {
      unreconciledItems = [];
    }

    unreconciledItems.forEach(item => {
      // Add null checks for item properties
      const itemData = {
        reference: item.reference || null,
        date: item.date || null,
        account: item.account || null,
        amount: Math.abs(parseFloat(item.transaction_amount) || 0),
        description: item.reconciling_description || item.note || 'No description',
        party: item.party || null,
        note: item.note || null
      };

      const itemType = item.reconciling_item_type;
      const transactionAmount = parseFloat(item.transaction_amount) || 0;

      switch (itemType) {
        case 'OUTSTANDING_CHECK':
          reconcilingItems.outstandingChecks.push(itemData);
          // Outstanding checks: Add to bank balance to reconcile with ledger
          adjustedBankBalance += Math.abs(transactionAmount);
          break;
          
        case 'DEPOSIT_IN_TRANSIT':
          reconcilingItems.depositsInTransit.push(itemData);
          // Deposits in transit: Add to bank balance
          adjustedBankBalance += Math.abs(transactionAmount);
          break;
          
        case 'UNRECORDED_DEPOSIT':
          reconcilingItems.ledgerAdjustments.push({
            ...itemData,
            type: 'Unrecorded deposit',
            adjustmentType: 'increase'
          });
          adjustedLedgerBalance += Math.abs(transactionAmount);
          break;
          
        case 'UNRECORDED_BANK_CHARGE':
          reconcilingItems.ledgerAdjustments.push({
            ...itemData,
            type: 'Unrecorded bank charges',
            adjustmentType: 'decrease'
          });
          // Subtract from ledger balance
          adjustedLedgerBalance -= Math.abs(transactionAmount);
          break;
          
        default:
          // Handle other items
          if (transactionAmount < 0) {
            reconcilingItems.ledgerAdjustments.push({
              ...itemData,
              type: 'Other adjustment',
              adjustmentType: 'decrease'
            });
            adjustedLedgerBalance += transactionAmount; // Add negative amount
          } else {
            reconcilingItems.bankErrors.push(itemData);
          }
          break;
      }
    });

    return {
      reconciliationDate: new Date().toISOString().split('T')[0],
      companyId,
      bankAccount: bankAccount || 'MainBank',
      
      // Starting balances
      ledgerBalance: Math.round(ledgerBalance * 100) / 100,
      bankStatementBalance: Math.round(bankBalance * 100) / 100,
      
      // Reconciling items
      reconcilingItems: {
        outstandingChecks: {
          items: reconcilingItems.outstandingChecks,
          totalAmount: Math.round(reconcilingItems.outstandingChecks.reduce((sum, item) => sum + item.amount, 0) * 100) / 100,
          count: reconcilingItems.outstandingChecks.length
        },
        depositsInTransit: {
          items: reconcilingItems.depositsInTransit,
          totalAmount: Math.round(reconcilingItems.depositsInTransit.reduce((sum, item) => sum + item.amount, 0) * 100) / 100,
          count: reconcilingItems.depositsInTransit.length
        },
        ledgerAdjustments: {
          items: reconcilingItems.ledgerAdjustments,
          totalAmount: Math.round(reconcilingItems.ledgerAdjustments.reduce((sum, item) => 
            sum + (item.adjustmentType === 'increase' ? item.amount : -item.amount), 0
          ) * 100) / 100,
          count: reconcilingItems.ledgerAdjustments.length
        },
        bankErrors: {
          items: reconcilingItems.bankErrors,
          totalAmount: Math.round(reconcilingItems.bankErrors.reduce((sum, item) => sum + item.amount, 0) * 100) / 100,
          count: reconcilingItems.bankErrors.length
        }
      },
      
      // Adjusted balances
      adjustedLedgerBalance: Math.round(adjustedLedgerBalance * 100) / 100,
      adjustedBankBalance: Math.round(adjustedBankBalance * 100) / 100,
      
      // Reconciliation status
      isReconciled: Math.abs(adjustedLedgerBalance - adjustedBankBalance) < 0.01,
      difference: Math.round((adjustedLedgerBalance - adjustedBankBalance) * 100) / 100,
      
      // Summary
      summary: {
        totalUnreconciledItems: unreconciledItems.length,
        ledgerBalanceAfterAdjustments: Math.round(adjustedLedgerBalance * 100) / 100,
        bankBalanceAfterAdjustments: Math.round(adjustedBankBalance * 100) / 100,
        netDifference: Math.round((adjustedLedgerBalance - adjustedBankBalance) * 100) / 100
      }
    };
  }

  async getBankReconciliationStatement(companyId, bankAccount) {
    try {
      const [ledgerBalance, bankBalance, unreconciledItems, summary] = await Promise.all([
        this.getLedgerBalance(companyId, bankAccount),
        this.getBankStatementBalance(companyId, bankAccount),
        this.getUnreconciledTransactions(companyId, bankAccount),
        this.getReconciliationSummary(companyId, bankAccount)
      ]);

      return this.formatReconciliationStatement(
        ledgerBalance, 
        bankBalance, 
        unreconciledItems, 
        summary, 
        companyId, 
        bankAccount
      );
    } catch (error) {
      console.error('Error in getBankReconciliationStatement:', error);
      throw error;
    }
  }
}

const bankReconciliationController = new BankReconciliationController();

const getBankReconciliation = async (req, res) => {
  try {
    const { companyid, bankaccount } = req.query;

    if (!companyid) {
      return res.status(400).json({
        error: 'Missing required parameter',
        required: ['companyid'],
        optional: ['bankaccount']
      });
    }

    const companyId = parseInt(companyid);
    if (isNaN(companyId)) {
      return res.status(400).json({
        error: 'Invalid company ID',
        message: 'Company ID must be a valid number'
      });
    }

    // Validate bankaccount if provided
    if (bankaccount && typeof bankaccount !== 'string') {
      return res.status(400).json({
        error: 'Invalid bank account',
        message: 'Bank account must be a string'
      });
    }

    const reconciliationStatement = await bankReconciliationController.getBankReconciliationStatement(
      companyId, 
      bankaccount || null
    );
    
    res.json(reconciliationStatement);
  } catch (error) {
    console.error('Error in getBankReconciliation:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to generate bank reconciliation statement'
    });
  }
};

module.exports = {
  getBankReconciliation
};