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

  async getCashFlowSummary(companyId, fromDate, toDate) {
    const result = await db.query(this.queries.getCashFlowSummaryQuery(), [companyId, fromDate, toDate]);
    return result.rows;
  }

  async getCashFlowDetails(companyId, fromDate, toDate) {
    const result = await db.query(this.queries.getCashFlowDetailsQuery(), [companyId, fromDate, toDate]);
    return result.rows;
  }

  formatCashFlowStatement(summaryData, detailData, openingBalance, companyId, fromDate, toDate) {
    const activities = {
      'Operating Activities': { inflows: [], outflows: [], netCashFlow: 0 },
      'Investing Activities': { inflows: [], outflows: [], netCashFlow: 0 },
      'Financing Activities': { inflows: [], outflows: [], netCashFlow: 0 }
    };

    summaryData.forEach(row => {
      const activityKey = row.activity_type;
      if (activities[activityKey]) {
        activities[activityKey].netCashFlow = parseFloat(row.net_cash_flow);
      }
    });

    detailData.forEach(row => {
      const item = {
        account: row.account,
        amount: Math.abs(parseFloat(row.cash_flow_amount)),
        party: row.party,
        note: row.note,
        date: row.date
      };

      const activityKey = row.activity_type;
      if (activities[activityKey]) {
        if (parseFloat(row.cash_flow_amount) > 0) {
          activities[activityKey].inflows.push(item);
        } else {
          activities[activityKey].outflows.push(item);
        }
      }
    });

    const totalInflows = summaryData.reduce((sum, row) => sum + parseFloat(row.cash_inflows), 0);
    const totalOutflows = summaryData.reduce((sum, row) => sum + parseFloat(row.cash_outflows), 0);
    const netChange = totalInflows - totalOutflows;

    return {
      period: {
        fromDate,
        toDate,
        companyId
      },
      operatingActivities: {
        inflows: activities['Operating Activities'].inflows,
        outflows: activities['Operating Activities'].outflows,
        netOperatingCashFlow: activities['Operating Activities'].netCashFlow
      },
      investingActivities: {
        inflows: activities['Investing Activities'].inflows,
        outflows: activities['Investing Activities'].outflows,
        netInvestingCashFlow: activities['Investing Activities'].netCashFlow
      },
      financingActivities: {
        inflows: activities['Financing Activities'].inflows,
        outflows: activities['Financing Activities'].outflows,
        netFinancingCashFlow: activities['Financing Activities'].netCashFlow
      },
      summary: {
        totalCashInflows: totalInflows,
        totalCashOutflows: totalOutflows,
        netChangeInCash: netChange,
        openingCashBalance: openingBalance,
        closingCashBalance: openingBalance + netChange
      }
    };
  }

  async getCashFlowStatement(companyId, fromDate, toDate) {
    const [openingBalance, summaryData, detailData] = await Promise.all([
      this.getOpeningBalance(companyId, fromDate),
      this.getCashFlowSummary(companyId, fromDate, toDate),
      this.getCashFlowDetails(companyId, fromDate, toDate)
    ]);

    return this.formatCashFlowStatement(summaryData, detailData, openingBalance, companyId, fromDate, toDate);
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