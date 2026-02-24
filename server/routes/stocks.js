const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stockDataService = require('../services/stockDataService');
const technicalAnalysisService = require('../services/technicalAnalysisService');

// Get stock quote
router.get('/quote/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await stockDataService.getStockQuote(symbol);
    res.json(data);
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ message: 'Failed to fetch stock data', error: error.message });
  }
});

// Get historical data
router.get('/historical/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 90 } = req.query;
    const data = await stockDataService.getHistoricalData(symbol, parseInt(days));
    res.json(data);
  } catch (error) {
    console.error('Get historical error:', error);
    res.status(500).json({ message: 'Failed to fetch historical data', error: error.message });
  }
});

// Get technical analysis
router.get('/analysis/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const analysis = await technicalAnalysisService.analyzeStock(symbol);
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ message: 'Failed to analyze stock', error: error.message });
  }
});

// Scan multiple stocks
router.post('/scan', auth, async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ message: 'Please provide an array of symbols' });
    }
    
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const analysis = await technicalAnalysisService.analyzeStock(symbol);
          return { symbol, ...analysis };
        } catch (error) {
          return { symbol, error: error.message };
        }
      })
    );
    
    res.json(results);
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ message: 'Scan failed', error: error.message });
  }
});

module.exports = router;