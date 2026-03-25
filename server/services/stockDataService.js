const axios = require('axios');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://finance.yahoo.com'
};

// ✅ Defined outside the class — accessible by getIndexData
const INDEX_SYMBOLS = {
    'NIFTY 50':     '^NSEI',
    'BANK NIFTY':   '^NSEBANK',
    'NIFTY IT':     '^CNXIT',
    'NIFTY PHARMA': '^CNXPHARMA',
    'NIFTY AUTO':   '^CNXAUTO',
    'SENSEX':       '^BSESN'
};

class StockDataService {

    // ── Stock Quote ────────────────────────────────────────────
    async getStockQuote(symbol) {
        try {
            const yahooSymbol = `${symbol}.NS`;
            const url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;

            const response = await axios.get(url, {
                headers: HEADERS,
                params: { interval: '1d', range: '2d' },
                timeout: 10000
            });

            const result = response.data.chart.result?.[0];
            if (!result) throw new Error('No result returned');

            const meta = result.meta;
            if (!meta) throw new Error('No meta data returned');

            const quotes = result.indicators?.quote?.[0];
            if (!quotes) throw new Error('No quotes data returned');

            const currentPrice = meta.regularMarketPrice;
            if (!currentPrice) throw new Error('No current price available');

            const previousClose = meta.chartPreviousClose;
            if (!previousClose) throw new Error('No previous close available');

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

    // ── Index Data ─────────────────────────────────────────────
    async getIndexData(indexName) {
        try {
            const yahooSymbol = INDEX_SYMBOLS[indexName];
            if (!yahooSymbol) throw new Error(`Unknown index: ${indexName}`);

            const url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;

            // Current quote
            const quoteResponse = await axios.get(url, {
                headers: HEADERS,
                params: { interval: '1d', range: '2d' },
                timeout: 10000
            });

            const quoteResult = quoteResponse.data.chart.result?.[0];
            if (!quoteResult) throw new Error('No quote data');

            const meta = quoteResult.meta;
            const currentPrice = meta.regularMarketPrice;
            const previousClose = meta.chartPreviousClose;
            const change = parseFloat((currentPrice - previousClose).toFixed(2));
            const changePercent = parseFloat(((change / previousClose) * 100).toFixed(2));

            // Historical data
            await sleep(200);
            const endDate = Math.floor(Date.now() / 1000);
            const startDate = endDate - (90 * 24 * 60 * 60);

            const histResponse = await axios.get(url, {
                headers: HEADERS,
                params: { period1: startDate, period2: endDate, interval: '1d' },
                timeout: 10000
            });

            const histResult = histResponse.data.chart.result?.[0];
            if (!histResult) throw new Error('No historical data');

            const timestamps = histResult.timestamp || [];
            const quotes = histResult.indicators?.quote?.[0];
            if (!quotes) throw new Error('No quotes in historical data');

            const historicalData = timestamps.map((ts, i) => ({
                date: new Date(ts * 1000),
                open: quotes.open?.[i] ?? null,
                high: quotes.high?.[i] ?? null,
                low: quotes.low?.[i] ?? null,
                close: quotes.close?.[i] ?? null,
                volume: quotes.volume?.[i] ?? null
            })).filter(d => d.close != null);

            return { name: indexName, symbol: yahooSymbol, currentPrice, previousClose, change, changePercent, historicalData };

        } catch (error) {
            console.error(`❌ Error fetching index ${indexName}:`, error.message);
            throw new Error(`Failed to fetch index data for ${indexName}`);
        }
    }

    // ── Historical Data ────────────────────────────────────────
    async getHistoricalData(symbol, days = 90, isIndex = false) {
        try {
            const yahooSymbol = isIndex ? symbol :`${symbol}.NS`;
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
	
	async getIntradayData(yahooSymbol, interval = '5m') {
    try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
        const response = await axios.get(url, {
            headers: HEADERS,
            params: {
                interval,       // '5m' for 5-minute candles
                range: '1d'     // today's data only
            },
            timeout: 10000
        });

        const result = response.data.chart.result?.[0];
        if (!result) throw new Error('No intraday data');

        const timestamps = result.timestamp || [];
        const quotes = result.indicators?.quote?.[0];
        if (!quotes) throw new Error('No quotes in intraday data');

        return timestamps.map((ts, i) => ({
            date:   new Date(ts * 1000),
            open:   quotes.open?.[i]   ?? null,
            high:   quotes.high?.[i]   ?? null,
            low:    quotes.low?.[i]    ?? null,
            close:  quotes.close?.[i]  ?? null,
            volume: quotes.volume?.[i] ?? 0
        })).filter(d => d.close != null);

    } catch (error) {
        console.error(`❌ Intraday error for ${yahooSymbol}:`, error.message);
        throw new Error(`Failed to fetch intraday data`);
    }
}

    // ── Multiple Quotes ────────────────────────────────────────
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