const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const angelOneService     = require('../services/angelOneService');
const stockDataService = require('../services/stockDataService');
const technicalAnalysisService = require('../services/technicalAnalysisService');
const intradaySignalService = require('../services/intradaySignalService');

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
        if (!symbols || !Array.isArray(symbols))
            return res.status(400).json({ message: 'Please provide an array of symbols' });

        const results = [];

        for (const symbol of symbols) {
            try {
                // Get symbol token from Angel One
                const { token } = await angelOneService.searchSymbol(symbol);
                await new Promise(r => setTimeout(r, 100));

                // Real-time quote from Angel One
                const quote = await angelOneService.getStockQuote(symbol, token);
                await new Promise(r => setTimeout(r, 200));

                // Historical data from Yahoo Finance (for technical indicators)
                const historical = await stockDataService.getHistoricalData(symbol, 90);

                // Technical analysis
                const analysis = technicalAnalysisService.generateSignal(
                    historical,
                    { previousClose: quote.previousClose, changePercent: quote.changePercent }
                );

                results.push({
                    symbol,
                    ...analysis,
                    indicators: {
                        ...analysis.indicators,
                        currentPrice:  quote.currentPrice,
                        previousClose: quote.previousClose,
                        priceChange:   quote.changePercent
                    }
                });

            } catch (error) {
                // Fallback to Yahoo Finance for this stock
                try {
                    const analysis = await technicalAnalysisService.analyzeStock(symbol);
                    results.push({ symbol, ...analysis });
                } catch {
                    results.push({ symbol, error: error.message });
                }
            }
            await new Promise(r => setTimeout(r, 150));
        }

        res.json(results);

    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ message: 'Scan failed', error: error.message });
    }
});
router.get('/index/:name', auth, async (req, res) => {
    try {
        const indexName = decodeURIComponent(req.params.name);

        // Real-time price from Angel One
        const quote = await angelOneService.getIndexQuote(indexName);

        // 90-day historical from Yahoo Finance (for swing analysis)
        const INDEX_YAHOO = {
            'NIFTY 50':     '^NSEI',
            'BANK NIFTY':   '^NSEBANK',
            'NIFTY IT':     '^CNXIT',
            'NIFTY PHARMA': '^CNXPHARMA',
            'NIFTY AUTO':   '^CNXAUTO',
            'SENSEX':       '^BSESN'
        };
        const yahooSymbol = INDEX_YAHOO[indexName];
        const historicalData = await stockDataService.getHistoricalData(yahooSymbol, 90, true); // true = no .NS suffix

        // Swing analysis on historical data
        const analysis = technicalAnalysisService.generateSignal(
            historicalData,
            { previousClose: quote.previousClose, changePercent: quote.changePercent }
        );

        res.json({
            name: indexName,
            currentPrice:  quote.currentPrice,
            change:        quote.change,
            changePercent: quote.changePercent,
            open:          quote.open,
            high:          quote.high,
            low:           quote.low,
            historicalData,
            ...analysis
        });

    } catch (error) {
        console.error('Index route error:', error.message);
        // Fallback to Yahoo if Angel One fails
        try {
            const indexName = decodeURIComponent(req.params.name);
            const indexData = await stockDataService.getIndexData(indexName);
            const analysis  = technicalAnalysisService.generateSignal(
                indexData.historicalData,
                { previousClose: indexData.previousClose, changePercent: indexData.changePercent }
            );
            res.json({ name: indexName, ...indexData, ...analysis });
        } catch (fallbackErr) {
            res.status(500).json({ message: error.message });
        }
    }
});


// ── Intraday Signal — 5min candles via Angel One ──────────────────
router.get('/index/:name/intraday', auth, async (req, res) => {
    try {
        const indexName = decodeURIComponent(req.params.name);

        // Real-time 5min candles from Angel One
        const candles = await angelOneService.getIntradayCandles(indexName, 'FIVE_MINUTE');

        if (candles.length < 10)
            return res.status(400).json({ message: 'Insufficient intraday data. Market may be closed.' });

        // Generate algo signal
        const signal = intradaySignalService.generateIntradaySignal(candles);

        res.json({
            index:       indexName,
            candleCount: candles.length,
            lastCandle:  candles[candles.length - 1],
            dataSource:  'Angel One SmartAPI (Real-time)',
            ...signal
        });

    } catch (error) {
        console.error('Intraday signal error:', error.message);
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;