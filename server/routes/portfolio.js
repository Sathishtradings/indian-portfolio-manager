const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const stockDataService = require('../services/stockDataService');

// Get user portfolio with updated prices
router.get('/', auth, async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ userId: req.userId });
    
    if (!portfolio) {
      portfolio = new Portfolio({
        userId: req.userId,
        holdings: []
      });
      await portfolio.save();
    }
    
    // Update current prices for all holdings
    if (portfolio.holdings.length > 0) {
      const priceUpdates = portfolio.holdings.map(async (holding) => {
        try {
          const quote = await stockDataService.getStockQuote(holding.symbol);
          holding.currentPrice = quote.price;
          holding.lastUpdated = new Date();
        } catch (error) {
          console.error(`Failed to update price for ${holding.symbol}:`, error.message);
          // Keep old price if update fails
        }
      });
      
      await Promise.all(priceUpdates);
      
      // Recalculate portfolio values with updated prices
      portfolio.calculateValues();
      await portfolio.save();
    }
    
    res.json(portfolio);
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ message: 'Failed to fetch portfolio', error: error.message });
  }
});

// Add or update holding
router.post('/holding', auth, async (req, res) => {
  try {
    const { symbol, name, exchange, quantity, price, type } = req.body;
    
    // Validation
    if (!symbol || !name || !quantity || !price || !type) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    if (!['BUY', 'SELL'].includes(type)) {
      return res.status(400).json({ message: 'Type must be BUY or SELL' });
    }
    
    let portfolio = await Portfolio.findOne({ userId: req.userId });
    
    if (!portfolio) {
      portfolio = new Portfolio({
        userId: req.userId,
        holdings: []
      });
    }
    
    const existingHolding = portfolio.holdings.find(h => h.symbol === symbol.toUpperCase());
    
    if (type === 'BUY') {
      if (existingHolding) {
        // Update existing holding
        const totalCost = (existingHolding.avgPrice * existingHolding.quantity) + (price * quantity);
        existingHolding.quantity += quantity;
        existingHolding.avgPrice = totalCost / existingHolding.quantity;
        existingHolding.currentPrice = price;
      } else {
        // Add new holding - try to get current market price
        let currentPrice = price;
        try {
          const quote = await stockDataService.getStockQuote(symbol.toUpperCase());
          currentPrice = quote.price;
        } catch (error) {
          console.error(`Failed to fetch current price for ${symbol}, using entry price`);
        }
        
        portfolio.holdings.push({
          symbol: symbol.toUpperCase(),
          name,
          exchange: exchange || 'NSE',
          quantity,
          avgPrice: price,
          currentPrice: currentPrice
        });
      }
    } else if (type === 'SELL') {
      if (!existingHolding) {
        return res.status(400).json({ message: 'You do not own this stock' });
      }
      
      if (existingHolding.quantity < quantity) {
        return res.status(400).json({ message: 'Insufficient quantity to sell' });
      }
      
      existingHolding.quantity -= quantity;
      
      // Remove holding if quantity becomes 0
      if (existingHolding.quantity === 0) {
        portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== symbol.toUpperCase());
      }
    }
    
    // Calculate portfolio values manually
    portfolio.calculateValues();
    
    await portfolio.save();
    
    // Record transaction
    const transaction = new Transaction({
      userId: req.userId,
      symbol: symbol.toUpperCase(),
      type,
      quantity,
      price,
      totalAmount: price * quantity
    });
    await transaction.save();
    
    res.json(portfolio);
  } catch (error) {
    console.error('Add holding error:', error);
    res.status(500).json({ message: 'Failed to update holding', error: error.message });
  }
});

// Delete holding
router.delete('/holding/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const portfolio = await Portfolio.findOne({ userId: req.userId });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== symbol.toUpperCase());
    
    // Calculate portfolio values manually
    portfolio.calculateValues();
    
    await portfolio.save();
    
    res.json({ message: 'Holding removed successfully', portfolio });
  } catch (error) {
    console.error('Delete holding error:', error);
    res.status(500).json({ message: 'Failed to delete holding', error: error.message });
  }
});

// Get transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const transactions = await Transaction.find({ userId: req.userId })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Transaction.countDocuments({ userId: req.userId });
    
    res.json({
      transactions,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalTransactions: total
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
});

module.exports = router;