const axios = require('axios');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://finance.yahoo.com'
};

class StockDataService {

    async getStockQuote(symbol) {
        try {
            const yahooSymbol = `${symbol}.NS`;
            const url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;

            const response = await axios.get(url, {
                headers: HEADERS,
                params: { interval: '1d', range: '5d' },
                timeout: 10000
            });

            const result = response.data.chart.result?.[0];
            if (!result) throw new Error('No result returned');

            const meta = result.meta;
            if (!meta) throw new Error('No meta data returned');

            // ✅ Safe access to quotes
            const quotesArr = result.indicators?.quote;
            const quotes = quotesArr?.[0];
            if (!quotes) throw new Error('No quotes data returned');

            const closes = (quotes.close || []).filter(c => c != null);
            const currentPrice = meta.regularMarketPrice;
            if (!currentPrice) throw new Error('No current price available');

            const previousClose = closes.length >= 2
                ? closes[closes.length - 2]
                : meta.regularMarketPreviousClose;

            const change = parseFloat((currentPrice - previousClose).toFixed(2));
            const changePercent = parseFloat(((change / previousClose) * 100).toFixed(2));

            return {
                symbol,
                price: currentPrice,
                open: quotes.open?.[quotes.open.length - 1] ?? null,
                high: quotes.high?.[quotes.high.length - 1] ?? null,
                low: quotes.low?.[quotes.low.length - 1] ?? null,
                volume: quotes.volume?.[quotes.volume.length - 1] ?? null,
                previousClose,
                change,
                changePercent
            };

        } catch (error) {
            console.error(`❌ Error fetching ${symbol}:`, error.message);
            throw new Error(`Failed to fetch stock data for ${symbol}`);
        }
    }

    async getHistoricalData(symbol, days = 90) {
        try {
            const yahooSymbol = `${symbol}.NS`;
            const endDate = Math.floor(Date.now() / 1000);
            const startDate = endDate - (days * 24 * 60 * 60);

            const url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
            const response = await axios.get(url, {
                headers: HEADERS,
                params: { period1: startDate, period2: endDate, interval: '1d' },
                timeout: 10000
            });

            const result = response.data.chart.result?.[0];
            if (!result) throw new Error('No historical data returned');

            const timestamps = result.timestamp || [];
            const quotes = result.indicators?.quote?.[0];
            if (!quotes) throw new Error('No quotes in historical data');

            return timestamps.map((timestamp, index) => ({
                date: new Date(timestamp * 1000),
                open: quotes.open?.[index] ?? null,
                high: quotes.high?.[index] ?? null,
                low: quotes.low?.[index] ?? null,
                close: quotes.close?.[index] ?? null,
                volume: quotes.volume?.[index] ?? null
            })).filter(d => d.close != null);

        } catch (error) {
            console.error(`❌ Historical error for ${symbol}:`, error.message);
            throw new Error(`Failed to fetch historical data for ${symbol}`);
        }
    }

    async getMultipleQuotes(symbols) {
        const results = [];
        for (const symbol of symbols) {
            try {
                const data = await this.getStockQuote(symbol);
                results.push(data);
            } catch (err) {
                results.push({ symbol, error: err.message });
            }
            await sleep(300);
        }
        return results;
    }
}

module.exports = new StockDataService();