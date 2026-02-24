const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  exchange: {
    type: String,
    enum: ['NSE', 'BSE'],
    default: 'NSE'
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  avgPrice: {
    type: Number,
    required: true,
    min: 0
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  holdings: [holdingSchema],
  totalInvestment: {
    type: Number,
    default: 0
  },
  currentValue: {
    type: Number,
    default: 0
  },
  totalGainLoss: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Instance method to calculate portfolio values
portfolioSchema.methods.calculateValues = function() {
  this.totalInvestment = this.holdings.reduce((sum, holding) => {
    return sum + (holding.quantity * holding.avgPrice);
  }, 0);
  
  this.currentValue = this.holdings.reduce((sum, holding) => {
    return sum + (holding.quantity * holding.currentPrice);
  }, 0);
  
  this.totalGainLoss = this.currentValue - this.totalInvestment;
  this.lastUpdated = Date.now();
};

module.exports = mongoose.model('Portfolio', portfolioSchema);