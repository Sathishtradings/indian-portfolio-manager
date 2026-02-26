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

  // NEW: Detect Trend Strength
  detectTrend(data) {
    if (data.length < 20) return { direction: 'UNKNOWN', strength: 0, description: 'Insufficient data' };
    
    // Compare recent prices with older prices
    const recent10 = data.slice(-10).map(d => d.close);
    const older10 = data.slice(-20, -10).map(d => d.close);
    
    const recentAvg = recent10.reduce((a, b) => a + b, 0) / 10;
    const olderAvg = older10.reduce((a, b) => a + b, 0) / 10;
    
    const trendStrength = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    let direction, strength, description, color;
    
    if (trendStrength > 5) {
      direction = 'STRONG UPTREND';
      strength = Math.min(100, trendStrength * 10);
      description = 'Strong bullish momentum';
      color = 'green';
    } else if (trendStrength > 2) {
      direction = 'UPTREND';
      strength = Math.min(100, trendStrength * 10);
      description = 'Moderate upward movement';
      color = 'lightgreen';
    } else if (trendStrength > -2) {
      direction = 'SIDEWAYS';
      strength = Math.abs(trendStrength * 10);
      description = 'Consolidating, no clear direction';
      color = 'gray';
    } else if (trendStrength > -5) {
      direction = 'DOWNTREND';
      strength = Math.min(100, Math.abs(trendStrength * 10));
      description = 'Moderate downward movement';
      color = 'orange';
    } else {
      direction = 'STRONG DOWNTREND';
      strength = Math.min(100, Math.abs(trendStrength * 10));
      description = 'Strong bearish momentum';
      color = 'red';
    }
    
    return { direction, strength, description, color, percentage: trendStrength.toFixed(2) };
  }

  // NEW: Detect Chart Patterns
  detectPatterns(data) {
    if (data.length < 30) return [];
    
    const patterns = [];
    const prices = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    // 1. Double Top Pattern
    const doubleTop = this.detectDoubleTop(highs);
    if (doubleTop) patterns.push({
      name: 'Double Top',
      type: 'BEARISH',
      description: 'Price tested resistance twice and failed - potential reversal',
      confidence: doubleTop.confidence,
      action: 'Consider selling or taking profits'
    });
    
    // 2. Double Bottom Pattern
    const doubleBottom = this.detectDoubleBottom(lows);
    if (doubleBottom) patterns.push({
      name: 'Double Bottom',
      type: 'BULLISH',
      description: 'Price tested support twice and held - potential reversal',
      confidence: doubleBottom.confidence,
      action: 'Consider buying opportunity'
    });
    
    // 3. Head and Shoulders
    const headAndShoulders = this.detectHeadAndShoulders(highs);
    if (headAndShoulders) patterns.push({
      name: 'Head and Shoulders',
      type: 'BEARISH',
      description: 'Classic reversal pattern - trend may reverse downward',
      confidence: headAndShoulders.confidence,
      action: 'Strong sell signal'
    });
    
    // 4. Inverse Head and Shoulders
    const invHeadAndShoulders = this.detectInverseHeadAndShoulders(lows);
    if (invHeadAndShoulders) patterns.push({
      name: 'Inverse Head and Shoulders',
      type: 'BULLISH',
      description: 'Bullish reversal pattern - trend may reverse upward',
      confidence: invHeadAndShoulders.confidence,
      action: 'Strong buy signal'
    });
    
    // 5. Higher Highs and Higher Lows (Uptrend confirmation)
    const higherHighsLows = this.detectHigherHighsLows(highs, lows);
    if (higherHighsLows) patterns.push({
      name: 'Higher Highs & Lows',
      type: 'BULLISH',
      description: 'Consistent uptrend pattern - bullish continuation',
      confidence: higherHighsLows.confidence,
      action: 'Uptrend confirmed, hold or buy'
    });
    
    // 6. Lower Highs and Lower Lows (Downtrend confirmation)
    const lowerHighsLows = this.detectLowerHighsLows(highs, lows);
    if (lowerHighsLows) patterns.push({
      name: 'Lower Highs & Lows',
      type: 'BEARISH',
      description: 'Consistent downtrend pattern - bearish continuation',
      confidence: lowerHighsLows.confidence,
      action: 'Downtrend confirmed, avoid or sell'
    });
    
    // 7. Support/Resistance Levels
    const supportResistance = this.detectSupportResistance(prices);
    if (supportResistance) patterns.push({
      name: 'Near Key Level',
      type: supportResistance.type,
      description: supportResistance.description,
      confidence: supportResistance.confidence,
      action: supportResistance.action
    });
    
    return patterns;
  }

  // Helper: Detect Double Top
  detectDoubleTop(highs) {
    const peaks = this.findPeaks(highs);
    if (peaks.length < 2) return null;
    
    const lastTwoPeaks = peaks.slice(-2);
    const [peak1, peak2] = lastTwoPeaks;
    
    // Check if peaks are at similar levels (within 2%)
    const difference = Math.abs(peak1.value - peak2.value) / peak1.value;
    
    if (difference < 0.02 && peak2.index - peak1.index > 5) {
      return {
        confidence: Math.round((1 - difference) * 100)
      };
    }
    return null;
  }

  // Helper: Detect Double Bottom
  detectDoubleBottom(lows) {
    const troughs = this.findTroughs(lows);
    if (troughs.length < 2) return null;
    
    const lastTwoTroughs = troughs.slice(-2);
    const [trough1, trough2] = lastTwoTroughs;
    
    const difference = Math.abs(trough1.value - trough2.value) / trough1.value;
    
    if (difference < 0.02 && trough2.index - trough1.index > 5) {
      return {
        confidence: Math.round((1 - difference) * 100)
      };
    }
    return null;
  }

  // Helper: Detect Head and Shoulders
  detectHeadAndShoulders(highs) {
    const peaks = this.findPeaks(highs);
    if (peaks.length < 3) return null;
    
    const lastThreePeaks = peaks.slice(-3);
    const [leftShoulder, head, rightShoulder] = lastThreePeaks;
    
    // Head should be higher than both shoulders
    // Shoulders should be at similar levels
    if (head.value > leftShoulder.value && 
        head.value > rightShoulder.value &&
        Math.abs(leftShoulder.value - rightShoulder.value) / leftShoulder.value < 0.03) {
      return {
        confidence: 75
      };
    }
    return null;
  }

  // Helper: Detect Inverse Head and Shoulders
  detectInverseHeadAndShoulders(lows) {
    const troughs = this.findTroughs(lows);
    if (troughs.length < 3) return null;
    
    const lastThreeTroughs = troughs.slice(-3);
    const [leftShoulder, head, rightShoulder] = lastThreeTroughs;
    
    if (head.value < leftShoulder.value && 
        head.value < rightShoulder.value &&
        Math.abs(leftShoulder.value - rightShoulder.value) / leftShoulder.value < 0.03) {
      return {
        confidence: 75
      };
    }
    return null;
  }

  // Helper: Detect Higher Highs and Higher Lows
  detectHigherHighsLows(highs, lows) {
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    
    let higherHighCount = 0;
    let higherLowCount = 0;
    
    for (let i = 1; i < recentHighs.length; i++) {
      if (recentHighs[i] > recentHighs[i - 1]) higherHighCount++;
      if (recentLows[i] > recentLows[i - 1]) higherLowCount++;
    }
    
    if (higherHighCount >= 6 && higherLowCount >= 6) {
      return {
        confidence: Math.round(((higherHighCount + higherLowCount) / 18) * 100)
      };
    }
    return null;
  }

  // Helper: Detect Lower Highs and Lower Lows
  detectLowerHighsLows(highs, lows) {
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    
    let lowerHighCount = 0;
    let lowerLowCount = 0;
    
    for (let i = 1; i < recentHighs.length; i++) {
      if (recentHighs[i] < recentHighs[i - 1]) lowerHighCount++;
      if (recentLows[i] < recentLows[i - 1]) lowerLowCount++;
    }
    
    if (lowerHighCount >= 6 && lowerLowCount >= 6) {
      return {
        confidence: Math.round(((lowerHighCount + lowerLowCount) / 18) * 100)
      };
    }
    return null;
  }

  // Helper: Detect Support/Resistance
  detectSupportResistance(prices) {
    const currentPrice = prices[prices.length - 1];
    const recentPrices = prices.slice(-30);
    const max = Math.max(...recentPrices);
    const min = Math.min(...recentPrices);
    
    // Check if near resistance (within 2% of recent high)
    if ((max - currentPrice) / max < 0.02) {
      return {
        type: 'BEARISH',
        description: `Price near resistance level at ₹${max.toFixed(2)}`,
        confidence: 70,
        action: 'Watch for breakout or rejection'
      };
    }
    
    // Check if near support (within 2% of recent low)
    if ((currentPrice - min) / min < 0.02) {
      return {
        type: 'BULLISH',
        description: `Price near support level at ₹${min.toFixed(2)}`,
        confidence: 70,
        action: 'Potential bounce opportunity'
      };
    }
    
    return null;
  }

  // Helper: Find Peaks
  findPeaks(data) {
    const peaks = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        peaks.push({ index: i, value: data[i] });
      }
    }
    return peaks;
  }

  // Helper: Find Troughs
  findTroughs(data) {
    const troughs = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
        troughs.push({ index: i, value: data[i] });
      }
    }
    return troughs;
  }

  // Generate trading signal with trend and patterns
  generateSignal(data) {
    const currentPrice = data[data.length - 1].close;
    const sma20 = this.calculateSMA(data, 20);
    const sma50 = this.calculateSMA(data, 50);
    const rsi = this.calculateRSI(data, 14);
    const macd = this.calculateMACD(data);
    
    // NEW: Get trend and patterns
    const trend = this.detectTrend(data);
    const patterns = this.detectPatterns(data);
    
    let score = 0;
    const signals = [];
    
    // SMA Analysis
    if (currentPrice > sma20) {
      score += 1;
      signals.push({ indicator: 'SMA20', signal: 'Bullish', description: 'Price above 20-day SMA' });
    } else {
      score -= 1;
      signals.push({ indicator: 'SMA20', signal: 'Bearish', description: 'Price below 20-day SMA' });
    }
    
    if (currentPrice > sma50) {
      score += 1;
      signals.push({ indicator: 'SMA50', signal: 'Bullish', description: 'Price above 50-day SMA' });
    }
    
    if (sma20 > sma50) {
      score += 1;
      signals.push({ indicator: 'Golden Cross', signal: 'Bullish', description: 'Short-term above long-term' });
    } else if (sma20 < sma50) {
      score -= 1;
      signals.push({ indicator: 'Death Cross', signal: 'Bearish', description: 'Short-term below long-term' });
    }
    
    // RSI Analysis
    if (rsi < 30) {
      score += 2;
      signals.push({ indicator: 'RSI', signal: 'Strong Buy', description: 'Oversold condition (RSI < 30)' });
    } else if (rsi > 70) {
      score -= 2;
      signals.push({ indicator: 'RSI', signal: 'Strong Sell', description: 'Overbought condition (RSI > 70)' });
    } else if (rsi < 40) {
      score += 1;
      signals.push({ indicator: 'RSI', signal: 'Buy', description: 'Approaching oversold' });
    } else if (rsi > 60) {
      score -= 1;
      signals.push({ indicator: 'RSI', signal: 'Sell', description: 'Approaching overbought' });
    }
    
    // MACD Analysis
    if (macd > 0) {
      score += 1;
      signals.push({ indicator: 'MACD', signal: 'Bullish', description: 'Positive momentum' });
    } else if (macd < 0) {
      score -= 1;
      signals.push({ indicator: 'MACD', signal: 'Bearish', description: 'Negative momentum' });
    }
    
    // NEW: Trend adjustment
    if (trend.direction === 'STRONG DOWNTREND' && score > 0) {
      score -= 1;
      signals.push({ 
        indicator: 'Trend Warning', 
        signal: 'Caution', 
        description: '⚠️ Strong downtrend active - wait for reversal' 
      });
    }
    
    if (trend.direction === 'STRONG UPTREND' && score >= 0) {
      score += 1;
      signals.push({ 
        indicator: 'Trend Confirmation', 
        signal: 'Bullish', 
        description: '✅ Strong uptrend confirmed' 
      });
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
      },
      trend,
      patterns
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