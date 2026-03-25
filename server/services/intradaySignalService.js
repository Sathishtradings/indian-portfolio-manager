class IntradaySignalService {

    // ── EMA Calculation ────────────────────────────────────────
    calculateEMA(data, period) {
        if (data.length < period) return null;
        const k = 2 / (period + 1);
        let ema = data.slice(0, period).reduce((a, b) => a + b.close, 0) / period;
        for (let i = period; i < data.length; i++) {
            ema = data[i].close * k + ema * (1 - k);
        }
        return ema;
    }

    // ── EMA Array (all values) ─────────────────────────────────
    calculateEMAArray(data, period) {
        if (data.length < period) return [];
        const k = 2 / (period + 1);
        const emas = [];
        let ema = data.slice(0, period).reduce((a, b) => a + b.close, 0) / period;
        emas.push(ema);
        for (let i = period; i < data.length; i++) {
            ema = data[i].close * k + ema * (1 - k);
            emas.push(ema);
        }
        return emas;
    }

    // ── VWAP Calculation ───────────────────────────────────────
    calculateVWAP(data) {
        let cumulativePV = 0;
        let cumulativeVol = 0;
        const vwapArray = [];

        for (const candle of data) {
            const typicalPrice = (candle.high + candle.low + candle.close) / 3;
            cumulativePV += typicalPrice * (candle.volume || 1);
            cumulativeVol += candle.volume || 1;
            vwapArray.push(cumulativePV / cumulativeVol);
        }

        return {
            current: vwapArray[vwapArray.length - 1],
            array: vwapArray
        };
    }

    // ── RSI Calculation ────────────────────────────────────────
    calculateRSI(data, period = 14) {
        if (data.length < period + 1) return null;
        let gains = 0, losses = 0;

        for (let i = data.length - period; i < data.length; i++) {
            const diff = data[i].close - data[i - 1].close;
            if (diff > 0) gains += diff;
            else losses += Math.abs(diff);
        }

        const avgGain = gains / period;
        const avgLoss = losses / period || 0.0001;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    // ── Supertrend Calculation ─────────────────────────────────
    calculateSupertrend(data, period = 7, multiplier = 3) {
        if (data.length < period + 1) return null;

        const atrValues = [];
        for (let i = 1; i < data.length; i++) {
            const tr = Math.max(
                data[i].high - data[i].low,
                Math.abs(data[i].high - data[i - 1].close),
                Math.abs(data[i].low - data[i - 1].close)
            );
            atrValues.push(tr);
        }

        // ATR (simple average for last `period` values)
        const atr = atrValues.slice(-period).reduce((a, b) => a + b, 0) / period;

        const last = data[data.length - 1];
        const prev = data[data.length - 2];
        const hl2 = (last.high + last.low) / 2;
        const upperBand = hl2 + multiplier * atr;
        const lowerBand = hl2 - multiplier * atr;

        // Simplified: determine trend direction
        const prevHL2 = (prev.high + prev.low) / 2;
        const prevUpperBand = prevHL2 + multiplier * atr;
        const prevLowerBand = prevHL2 - multiplier * atr;

        let supertrendValue, supertrendDirection;

        if (last.close > prevUpperBand) {
            supertrendDirection = 'BUY';
            supertrendValue = lowerBand;
        } else if (last.close < prevLowerBand) {
            supertrendDirection = 'SELL';
            supertrendValue = upperBand;
        } else if (prev.close > prevUpperBand) {
            supertrendDirection = 'BUY';
            supertrendValue = lowerBand;
        } else {
            supertrendDirection = 'SELL';
            supertrendValue = upperBand;
        }

        return { value: supertrendValue, direction: supertrendDirection, atr };
    }

    // ── Support & Resistance ───────────────────────────────────
    findSupportResistance(data, lookback = 20) {
        const recent = data.slice(-lookback);
        const highs = recent.map(d => d.high);
        const lows = recent.map(d => d.low);

        const resistance = Math.max(...highs);
        const support = Math.min(...lows);

        // Find pivot highs/lows (local peaks)
        const pivotHighs = [], pivotLows = [];
        for (let i = 1; i < recent.length - 1; i++) {
            if (recent[i].high > recent[i-1].high && recent[i].high > recent[i+1].high)
                pivotHighs.push(recent[i].high);
            if (recent[i].low < recent[i-1].low && recent[i].low < recent[i+1].low)
                pivotLows.push(recent[i].low);
        }

        // Key levels = most frequent pivot zones
        const keyResistance = pivotHighs.length > 0
            ? pivotHighs.sort((a, b) => b - a)[0]
            : resistance;
        const keySupport = pivotLows.length > 0
            ? pivotLows.sort((a, b) => a - b)[0]
            : support;

        return { resistance: keyResistance, support: keySupport };
    }

    // ── Volume Spike Detection ─────────────────────────────────
    detectVolumeSpike(data, lookback = 20) {
        const recent = data.slice(-lookback);
        const avgVolume = recent.slice(0, -1)
            .reduce((a, b) => a + (b.volume || 0), 0) / (lookback - 1);
        const currentVolume = data[data.length - 1].volume || 0;
        const ratio = avgVolume > 0 ? currentVolume / avgVolume : 1;
        return { hasSpike: ratio >= 1.5, ratio: parseFloat(ratio.toFixed(2)) };
    }

    // ── Candle Pattern Detection ───────────────────────────────
    detectCandlePattern(data) {
        const last = data[data.length - 1];
        const prev = data[data.length - 2];
        if (!last || !prev) return null;

        const lastBody = Math.abs(last.close - last.open);
        const prevBody = Math.abs(prev.close - prev.open);
        const lastRange = last.high - last.low;

        // Bullish Engulfing
        if (prev.close < prev.open && last.close > last.open &&
            last.open < prev.close && last.close > prev.open)
            return { name: 'Bullish Engulfing', type: 'BULLISH' };

        // Bearish Engulfing
        if (prev.close > prev.open && last.close < last.open &&
            last.open > prev.close && last.close < prev.open)
            return { name: 'Bearish Engulfing', type: 'BEARISH' };

        // Doji (indecision)
        if (lastBody < lastRange * 0.1)
            return { name: 'Doji', type: 'NEUTRAL' };

        // Hammer (bullish reversal)
        if (last.close > last.open &&
            (last.low < last.open - lastBody * 2) &&
            (last.high - last.close) < lastBody * 0.5)
            return { name: 'Hammer', type: 'BULLISH' };

        // Shooting Star (bearish reversal)
        if (last.close < last.open &&
            (last.high > last.open + lastBody * 2) &&
            (last.close - last.low) < lastBody * 0.5)
            return { name: 'Shooting Star', type: 'BEARISH' };

        return null;
    }

    // ── MAIN SIGNAL GENERATOR ──────────────────────────────────
    generateIntradaySignal(data) {
        if (data.length < 30) return null;

        const currentCandle = data[data.length - 1];
        const currentPrice  = currentCandle.close;

        // Calculate all indicators
        const ema9  = this.calculateEMA(data, 9);
        const ema21 = this.calculateEMA(data, 21);
        const ema9Arr  = this.calculateEMAArray(data, 9);
        const ema21Arr = this.calculateEMAArray(data, 21);

        // EMA crossover — check last 2 values
        const ema9Prev  = ema9Arr[ema9Arr.length - 2];
        const ema21Prev = ema21Arr[ema21Arr.length - 2];
        const emaCrossover =
            ema9Prev <= ema21Prev && ema9 > ema21 ? 'GOLDEN'  :  // bullish cross
            ema9Prev >= ema21Prev && ema9 < ema21 ? 'DEATH'   :  // bearish cross
            ema9 > ema21                           ? 'ABOVE'  :
                                                     'BELOW';

        const vwap       = this.calculateVWAP(data);
        const rsi        = this.calculateRSI(data, 14);
        const supertrend = this.calculateSupertrend(data);
        const levels     = this.findSupportResistance(data);
        const volume     = this.detectVolumeSpike(data);
        const candle     = this.detectCandlePattern(data);
        const atr        = supertrend?.atr || (currentCandle.high - currentCandle.low);

        // ── Scoring System ─────────────────────────────────────
        let score = 0;
        const signals = [];

        // 1. EMA Crossover (weight: 3)
        if (emaCrossover === 'GOLDEN') {
            score += 3;
            signals.push({ indicator: 'EMA Cross', signal: 'BUY', description: '9 EMA crossed above 21 EMA — bullish crossover' });
        } else if (emaCrossover === 'DEATH') {
            score -= 3;
            signals.push({ indicator: 'EMA Cross', signal: 'SELL', description: '9 EMA crossed below 21 EMA — bearish crossover' });
        } else if (emaCrossover === 'ABOVE') {
            score += 1;
            signals.push({ indicator: 'EMA Trend', signal: 'Bullish', description: `Price above EMAs — 9EMA: ${ema9?.toFixed(2)}, 21EMA: ${ema21?.toFixed(2)}` });
        } else {
            score -= 1;
            signals.push({ indicator: 'EMA Trend', signal: 'Bearish', description: `Price below EMAs — 9EMA: ${ema9?.toFixed(2)}, 21EMA: ${ema21?.toFixed(2)}` });
        }

        // 2. VWAP (weight: 2)
        if (currentPrice > vwap.current) {
            score += 2;
            signals.push({ indicator: 'VWAP', signal: 'Bullish', description: `Price ₹${currentPrice.toFixed(2)} above VWAP ₹${vwap.current.toFixed(2)}` });
        } else {
            score -= 2;
            signals.push({ indicator: 'VWAP', signal: 'Bearish', description: `Price ₹${currentPrice.toFixed(2)} below VWAP ₹${vwap.current.toFixed(2)}` });
        }

        // 3. Supertrend (weight: 3)
        if (supertrend) {
            if (supertrend.direction === 'BUY') {
                score += 3;
                signals.push({ indicator: 'Supertrend', signal: 'BUY', description: `Bullish — support at ₹${supertrend.value.toFixed(2)}` });
            } else {
                score -= 3;
                signals.push({ indicator: 'Supertrend', signal: 'SELL', description: `Bearish — resistance at ₹${supertrend.value.toFixed(2)}` });
            }
        }

        // 4. RSI (weight: 1)
        if (rsi) {
            if (rsi < 30) {
                score += 2;
                signals.push({ indicator: 'RSI', signal: 'Oversold', description: `RSI ${rsi.toFixed(1)} — oversold, potential bounce` });
            } else if (rsi > 70) {
                score -= 2;
                signals.push({ indicator: 'RSI', signal: 'Overbought', description: `RSI ${rsi.toFixed(1)} — overbought, potential reversal` });
            } else if (rsi > 55) {
                score += 1;
                signals.push({ indicator: 'RSI', signal: 'Bullish', description: `RSI ${rsi.toFixed(1)} — bullish momentum` });
            } else if (rsi < 45) {
                score -= 1;
                signals.push({ indicator: 'RSI', signal: 'Bearish', description: `RSI ${rsi.toFixed(1)} — bearish momentum` });
            }
        }

        // 5. Volume Spike (weight: 1 — confirms signal)
        if (volume.hasSpike) {
            const volSignal = score > 0 ? 'Confirms BUY' : 'Confirms SELL';
            score += score > 0 ? 1 : -1;
            signals.push({ indicator: 'Volume', signal: volSignal, description: `Volume ${volume.ratio}x above average — strong move confirmation` });
        }

        // 6. Candle Pattern (weight: 1)
        if (candle) {
            if (candle.type === 'BULLISH') {
                score += 1;
                signals.push({ indicator: 'Candle', signal: candle.name, description: `${candle.name} detected — bullish reversal signal` });
            } else if (candle.type === 'BEARISH') {
                score -= 1;
                signals.push({ indicator: 'Candle', signal: candle.name, description: `${candle.name} detected — bearish reversal signal` });
            } else {
                signals.push({ indicator: 'Candle', signal: 'Doji', description: 'Indecision candle — wait for next candle confirmation' });
            }
        }

        // ── Determine Action ───────────────────────────────────
        let action, strength, confidence;

        if (score >= 7) {
            action = 'STRONG BUY'; strength = 'Strong'; confidence = 90;
        } else if (score >= 4) {
            action = 'BUY'; strength = 'Moderate'; confidence = 70;
        } else if (score >= 1) {
            action = 'WEAK BUY'; strength = 'Weak'; confidence = 55;
        } else if (score === 0) {
            action = 'NEUTRAL'; strength = 'Neutral'; confidence = 50;
        } else if (score >= -3) {
            action = 'WEAK SELL'; strength = 'Weak'; confidence = 55;
        } else if (score >= -6) {
            action = 'SELL'; strength = 'Moderate'; confidence = 70;
        } else {
            action = 'STRONG SELL'; strength = 'Strong'; confidence = 90;
        }

        // ── Entry / Exit / Stop Loss Levels ───────────────────
        const isBuy  = score > 0;
        const buffer = atr * 0.5;

        const entryPrice = parseFloat(currentPrice.toFixed(2));
        const stopLoss   = isBuy
            ? parseFloat((currentPrice - atr * 1.5).toFixed(2))
            : parseFloat((currentPrice + atr * 1.5).toFixed(2));
        const target1    = isBuy
            ? parseFloat((currentPrice + atr * 2).toFixed(2))
            : parseFloat((currentPrice - atr * 2).toFixed(2));
        const target2    = isBuy
            ? parseFloat((currentPrice + atr * 3.5).toFixed(2))
            : parseFloat((currentPrice - atr * 3.5).toFixed(2));

        const riskReward = parseFloat(
            (Math.abs(target1 - entryPrice) / Math.abs(entryPrice - stopLoss)).toFixed(2)
        );

        return {
            action,
            strength,
            confidence,
            score,
            signals,
            indicators: {
                ema9:  parseFloat(ema9?.toFixed(2)),
                ema21: parseFloat(ema21?.toFixed(2)),
                vwap:  parseFloat(vwap.current.toFixed(2)),
                rsi:   parseFloat(rsi?.toFixed(1)),
                supertrend: supertrend
                    ? { direction: supertrend.direction, value: parseFloat(supertrend.value.toFixed(2)) }
                    : null,
                atr: parseFloat(atr.toFixed(2)),
                currentPrice
            },
            levels: {
                support:    parseFloat(levels.support.toFixed(2)),
                resistance: parseFloat(levels.resistance.toFixed(2))
            },
            trade: {
                entry:       entryPrice,
                stopLoss,
                target1,
                target2,
                riskReward,
                direction:   isBuy ? 'LONG' : 'SHORT'
            },
            candle,
            volume
        };
    }
}

module.exports = new IntradaySignalService();