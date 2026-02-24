class TechnicalAnalysisService {
  
  // Calculate Simple Moving Average
  calculateSMA(data, period) {
    if (data.length < period) return null;
    const prices = data.slice(-period).map(d => d.close);
    return prices.reduce((a, b) => a + b, 0) / period;
  }
  
  // Calculate RSI
  calculateRSI(data, period = 14) {
    if (data.length < period + 1) return null;
    
    const gains = [];
    const losses = [];
    
    for (let i = data.length - period; i < data.length; i++) {
      const diff = data[i].close - data[i - 1].close;
      if (diff > 0) gains.push(diff);
      else losses.push(Math.abs(diff));
    }
    
    const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 1;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  // Calculate MACD
  calculateMACD(data) {
    if (data.length < 26) return null;
    
    const ema12 = this.calculateSMA(data.slice(-12), 12);
    const ema26 = this.calculateSMA(data.slice(-26), 26);
    
    if (!ema12 || !ema26) return null;
    
    return ema12 - ema26;
  }
  
  // Generate trading signal
  generateSignal(data) {
    const currentPrice = data[data.length - 1].close;
    const sma20 = this.calculateSMA(data, 20);
    const sma50 = this.calculateSMA(data, 50);
    const rsi = this.calculateRSI(data, 14);
    const macd = this.calculateMACD(data);
    
    let score = 0;
    const signals = [];
    
    // SMA Analysis
    if (sma20 && currentPrice > sma20) {
      score += 1;
      signals.push({ indicator: 'SMA20', signal: 'Bullish', description: 'Price above 20-day SMA' });
    }
    
    if (sma50 && currentPrice > sma50) {
      score += 1;
      signals.push({ indicator: 'SMA50', signal: 'Bullish', description: 'Price above 50-day SMA' });
    }
    
    if (sma20 && sma50 && sma20 > sma50) {
      score += 1;
      signals.push({ indicator: 'Golden Cross', signal: 'Bullish', description: 'Short-term trend above long-term' });
    }
    
    // RSI Analysis
    if (rsi < 30) {
      score += 2;
      signals.push({ indicator: 'RSI', signal: 'Strong Buy', description: 'Oversold condition' });
    } else if (rsi > 70) {
      score -= 2;
      signals.push({ indicator: 'RSI', signal: 'Strong Sell', description: 'Overbought condition' });
    }
    
    // MACD Analysis
    if (macd && macd > 0) {
      score += 1;
      signals.push({ indicator: 'MACD', signal: 'Bullish', description: 'Positive momentum' });
    }
    
    // Determine action
    let action, strength;
    if (score >= 4) {
      action = 'STRONG BUY';
      strength = 'Strong';
    } else if (score >= 2) {
      action = 'BUY';
      strength = 'Moderate';
    } else if (score >= 0) {
      action = 'HOLD';
      strength = 'Neutral';
    } else if (score >= -2) {
      action = 'SELL';
      strength = 'Moderate';
    } else {
      action = 'STRONG SELL';
      strength = 'Strong';
    }
    
    return {
      action,
      strength,
      score,
      signals,
      indicators: {
        sma20,
        sma50,
        rsi,
        macd,
        currentPrice
      }
    };
  }
  
  // Analyze stock
  async analyzeStock(symbol) {
    const stockDataService = require('./stockDataService');
    const historicalData = await stockDataService.getHistoricalData(symbol, 90);
    return this.generateSignal(historicalData);
  }
}

module.exports = new TechnicalAnalysisService();