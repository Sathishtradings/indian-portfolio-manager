const axios = require('axios');

class StockDataService {
  
  // Fetch stock data from Yahoo Finance
  async getStockQuote(symbol) {
    try {
      // Add .NS for NSE stocks
      const yahooSymbol = `${symbol}.NS`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
      
      const response = await axios.get(url, {
        params: {
          interval: '1d',
          range: '5d'
        }
      });
      
      const result = response.data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators.quote[0];
	  const closes = quotes.close.filter(c => c !== null)
	  
	  const currentPrice = meta.regularMarketPrice;
	  
	  const previousClose = closes.length >= 2
	    ? closes[closes.length - 2]
		: meta.regularMarketPreviousClose;
		
	  const change = parseFloat((currentPrice - previousClose).toFixed(2));
      const changePercent = parseFloat(((change / previousClose) * 100).toFixed(2));	  
      
      return {
        symbol: symbol,
        price: currentPrice,
        open: quote.open[quotes.open.length - 1],
        high: quote.high[quotes.high.length - 1],
        low: quote.low[quotes.low.length - 1],
        volume: quote.volume[quotes.volume.length - 1],
        previousClose,
        change,
        changePercent
      };
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error.message);
      throw new Error(`Failed to fetch stock data for ${symbol}`);
    }
  }
  
  // Get historical data
  async getHistoricalData(symbol, days = 90) {
    try {
      const yahooSymbol = `${symbol}.NS`;
      const endDate = Math.floor(Date.now() / 1000);
      const startDate = endDate - (days * 24 * 60 * 60);
      
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
      const response = await axios.get(url, {
        params: {
          period1: startDate,
          period2: endDate,
          interval: '1d'
        }
      });
      
      const result = response.data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];
      
      return timestamps.map((timestamp, index) => ({
        date: new Date(timestamp * 1000),
        open: quotes.open[index],
        high: quotes.high[index],
        low: quotes.low[index],
        close: quotes.close[index],
        volume: quotes.volume[index]
      })).filter(d => d.close !== null);
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error.message);
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }
  }
  
  // Batch fetch multiple stocks
  async getMultipleQuotes(symbols) {
    const promises = symbols.map(symbol => 
      this.getStockQuote(symbol).catch(err => ({
        symbol,
        error: err.message
      }))
    );
    
    return await Promise.all(promises);
  }
}

module.exports = new StockDataService();