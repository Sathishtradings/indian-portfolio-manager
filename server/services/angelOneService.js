const axios = require('axios');
const { authenticator } = require('otplib'); // npm install otplib

const ANGEL_BASE = 'https://apiconnect.angelbroking.com';

// Angel One symbol tokens for indices
const INDEX_TOKENS = {
    'NIFTY 50':     { token: '99926000', exchange: 'NSE' },
    'BANK NIFTY':   { token: '99926009', exchange: 'NSE' },
    'NIFTY IT':     { token: '99926013', exchange: 'NSE' },
    'NIFTY PHARMA': { token: '99926045', exchange: 'NSE' },
    'NIFTY AUTO':   { token: '99926011', exchange: 'NSE' },
    'SENSEX':       { token: '99919000', exchange: 'BSE' }
};

class AngelOneService {

    constructor() {
        this.authToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }

    // ── Login & Get Auth Token ─────────────────────────────────
    async login() {
        try {
            // Generate TOTP
            const totp = authenticator.generate(process.env.ANGEL_TOTP_SECRET);

            const response = await axios.post(
                `${ANGEL_BASE}/rest/auth/angelbroking/user/v1/loginByPassword`,
                {
                    clientcode: process.env.ANGEL_CLIENT_ID,
                    password:   process.env.ANGEL_PASSWORD,
                    totp
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept':       'application/json',
                        'X-UserType':   'USER',
                        'X-SourceID':   'WEB',
                        'X-ClientLocalIP': '127.0.0.1',
                        'X-ClientPublicIP': '127.0.0.1',
                        'X-MACAddress': '00:00:00:00:00:00',
                        'X-PrivateKey': process.env.ANGEL_API_KEY
                    }
                }
            );

            const data = response.data.data;
            this.authToken    = data.jwtToken;
            this.refreshToken = data.refreshToken;
            this.tokenExpiry  = Date.now() + 8 * 60 * 60 * 1000; // 8 hours

            console.log('✅ Angel One login successful');
            return this.authToken;

        } catch (error) {
            console.error('❌ Angel One login failed:', error.response?.data || error.message);
            throw new Error('Angel One authentication failed');
        }
    }

    // ── Auto-refresh token if expired ─────────────────────────
    async getToken() {
        if (!this.authToken || Date.now() > this.tokenExpiry) {
            await this.login();
        }
        return this.authToken;
    }

    // ── Auth Headers ───────────────────────────────────────────
    async getHeaders() {
        const token = await this.getToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
            'Accept':        'application/json',
            'X-UserType':    'USER',
            'X-SourceID':    'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': '127.0.0.1',
            'X-MACAddress':  '00:00:00:00:00:00',
            'X-PrivateKey':  process.env.ANGEL_API_KEY
        };
    }

    // ── Get Real-time Quote for Index ──────────────────────────
    async getIndexQuote(indexName) {
        try {
            const { token, exchange } = INDEX_TOKENS[indexName] || {};
            if (!token) throw new Error(`Unknown index: ${indexName}`);

            const headers = await this.getHeaders();
            const response = await axios.post(
                `${ANGEL_BASE}/rest/secure/angelbroking/market/v1/quote/`,
                {
                    mode: 'FULL',
                    exchangeTokens: { [exchange]: [token] }
                },
                { headers }
            );

            const fetched = response.data.data?.fetched?.[0];
            if (!fetched) throw new Error('No quote data returned');

            const currentPrice  = parseFloat(fetched.ltp);
            const previousClose = parseFloat(fetched.close);
            const change        = parseFloat((currentPrice - previousClose).toFixed(2));
            const changePercent = parseFloat(((change / previousClose) * 100).toFixed(2));

            return {
                name: indexName,
                currentPrice,
                previousClose,
                change,
                changePercent,
                open:   parseFloat(fetched.open),
                high:   parseFloat(fetched.high),
                low:    parseFloat(fetched.low),
                volume: parseInt(fetched.tradeVolume || 0)
            };

        } catch (error) {
            console.error(`❌ Angel One index quote error (${indexName}):`, error.message);
            throw error;
        }
    }

    // ── Get 5-min Candles for Index ────────────────────────────
    async getIntradayCandles(indexName, interval = 'FIVE_MINUTE') {
        try {
            const { token, exchange } = INDEX_TOKENS[indexName] || {};
            if (!token) throw new Error(`Unknown index: ${indexName}`);

            const headers = await this.getHeaders();

            // Today's date range
            const now   = new Date();
            const today = now.toISOString().split('T')[0];
            const fromDate = `${today} 09:15`;
            const toDate   = `${today} 15:30`;

            const response = await axios.post(
                `${ANGEL_BASE}/rest/secure/angelbroking/historical/v1/getCandleData`,
                {
                    exchange,
                    symboltoken: token,
                    interval,        // FIVE_MINUTE, FIFTEEN_MINUTE, ONE_HOUR, ONE_DAY
                    fromdate: fromDate,
                    todate:   toDate
                },
                { headers }
            );

            const candles = response.data.data;
            if (!candles || candles.length === 0)
                throw new Error('No candle data — market may be closed');

            // Angel One returns: [timestamp, open, high, low, close, volume]
            return candles.map(c => ({
                date:   new Date(c[0]),
                open:   parseFloat(c[1]),
                high:   parseFloat(c[2]),
                low:    parseFloat(c[3]),
                close:  parseFloat(c[4]),
                volume: parseInt(c[5])
            }));

        } catch (error) {
            console.error(`❌ Angel One candles error (${indexName}):`, error.message);
            throw error;
        }
    }

    // ── Get Real-time Stock Quote ──────────────────────────────
    async getStockQuote(symbol, token) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(
                `${ANGEL_BASE}/rest/secure/angelbroking/market/v1/quote/`,
                {
                    mode: 'FULL',
                    exchangeTokens: { NSE: [token] }
                },
                { headers }
            );

            const fetched = response.data.data?.fetched?.[0];
            if (!fetched) throw new Error('No quote data');

            const currentPrice  = parseFloat(fetched.ltp);
            const previousClose = parseFloat(fetched.close);
            const change        = parseFloat((currentPrice - previousClose).toFixed(2));
            const changePercent = parseFloat(((change / previousClose) * 100).toFixed(2));

            return {
                symbol,
                currentPrice,
                previousClose,
                change,
                changePercent,
                open:   parseFloat(fetched.open),
                high:   parseFloat(fetched.high),
                low:    parseFloat(fetched.low),
                volume: parseInt(fetched.tradeVolume || 0)
            };

        } catch (error) {
            console.error(`❌ Angel One stock quote error (${symbol}):`, error.message);
            throw error;
        }
    }

    // ── Search Symbol Token ────────────────────────────────────
    // Angel One needs a token number for each stock
    // Use their search API to find it
    async searchSymbol(symbol) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(
                `${ANGEL_BASE}/rest/secure/angelbroking/order/v1/searchScrip`,
                { exchange: 'NSE', searchscrip: symbol },
                { headers }
            );

            const results = response.data.data;
            if (!results || results.length === 0)
                throw new Error(`Symbol ${symbol} not found`);

            // Find exact match
            const match = results.find(r =>
                r.tradingsymbol === symbol || r.tradingsymbol === `${symbol}-EQ`
            ) || results[0];

            return { token: match.symboltoken, symbol: match.tradingsymbol };

        } catch (error) {
            console.error(`❌ Symbol search error (${symbol}):`, error.message);
            throw error;
        }
    }
}

module.exports = new AngelOneService();