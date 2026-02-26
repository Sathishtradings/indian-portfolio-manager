import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Search, Bell, Settings, LogOut, PieChart, Activity, DollarSign, AlertCircle, Plus, X, Filter } from 'lucide-react';
import { authAPI, stockAPI, portfolioAPI } from './services/api';

// Complete NIFTY 50 Stocks
const NIFTY_50 = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR',
  'ICICIBANK', 'KOTAKBANK', 'SBIN', 'BHARTIARTL', 'ITC',
  'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'TITAN',
  'SUNPHARMA', 'BAJFINANCE', 'HDFCLIFE', 'WIPRO', 'ONGC',
  'NTPC', 'POWERGRID', 'TATAMOTORS', 'TECHM', 'ULTRACEMCO',
  'NESTLEIND', 'COALINDIA', 'BAJAJFINSV', 'M&M', 'ADANIENT',
  'JSWSTEEL', 'TATASTEEL', 'CIPLA', 'GRASIM', 'SBILIFE',
  'BPCL', 'EICHERMOT', 'DIVISLAB', 'HINDALCO', 'ADANIPORTS',
  'INDUSINDBK', 'DRREDDY', 'APOLLOHOSP', 'BRITANNIA', 'BAJAJ-AUTO',
  'HEROMOTOCO', 'TATACONSUM', 'HCLTECH', 'SHRIRAMFIN', 'IOC'
];

// Stock Categories
const STOCK_CATEGORIES = {
  'NIFTY 50': NIFTY_50,
  'Bank Nifty': ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'SBIN', 'AXISBANK', 'INDUSINDBK', 'BANDHANBNK', 'FEDERALBNK', 'IDFCFIRSTB', 'PNB', 'BANKBARODA', 'AUBANK'],
  'IT Stocks': ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'COFORGE', 'MPHASIS', 'PERSISTENT', 'LTTS'],
  'Pharma': ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'APOLLOHOSP', 'BIOCON', 'TORNTPHARM', 'AUROPHARMA', 'LUPIN', 'ALKEM'],
  'Auto': ['MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT', 'TVSMOTOR', 'MOTHERSON', 'BOSCHLTD', 'ESCORTS'],
  'Energy': ['RELIANCE', 'ONGC', 'BPCL', 'IOC', 'NTPC', 'POWERGRID', 'COALINDIA', 'GAIL', 'HINDPETRO', 'ADANIGREEN'],
  'Metals': ['TATASTEEL', 'HINDALCO', 'JSWSTEEL', 'VEDL', 'COALINDIA', 'NMDC', 'SAIL', 'HINDZINC', 'NATIONALUM', 'JINDALSTEL'],
  'FMCG': ['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR', 'MARICO', 'GODREJCP', 'COLPAL', 'TATACONSUM', 'EMAMILTD']
};

// Format Indian currency
const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('scanner');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [portfolio, setPortfolio] = useState({ holdings: [] });
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New states for search and filter
  const [searchSymbol, setSearchSymbol] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('NIFTY 50');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Add position form state
  const [newPosition, setNewPosition] = useState({
    symbol: '',
    name: '',
    quantity: '',
    price: ''
  });

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      const user = JSON.parse(savedUser);
      setUsername(user.name);
      setIsLoggedIn(true);
      loadPortfolio();
    }
  }, []);

  const loadPortfolio = async () => {
    try {
      const response = await portfolioAPI.getPortfolio();
      setPortfolio(response.data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      
      if (isRegistering) {
        if (!name || !email || !password) {
          setError('Please fill all required fields');
          setLoading(false);
          return;
        }
        response = await authAPI.register({ name, email, password, mobile });
      } else {
        if (!email || !password) {
          setError('Please enter email and password');
          setLoading(false);
          return;
        }
        response = await authAPI.login({ email, password });
      }

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUsername(user.name);
      setIsLoggedIn(true);
      setActiveTab('scanner');
      await loadPortfolio();
      
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setEmail('');
    setName('');
    setMobile('');
    setPortfolio({ holdings: [] });
    setActiveTab('scanner');
    setScanResults([]);
    setSelectedStock(null);
    setSearchSymbol('');
  };

  const handleAddPosition = async () => {
    if (!newPosition.symbol || !newPosition.name || !newPosition.quantity || !newPosition.price) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await portfolioAPI.addHolding({
        symbol: newPosition.symbol.toUpperCase(),
        name: newPosition.name,
        exchange: 'NSE',
        quantity: parseFloat(newPosition.quantity),
        price: parseFloat(newPosition.price),
        type: 'BUY'
      });

      setPortfolio(response.data);
      setNewPosition({ symbol: '', name: '', quantity: '', price: '' });
      setShowAddPosition(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add position');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePosition = async (symbol) => {
    if (!window.confirm(`Remove ${symbol} from portfolio?`)) return;

    setLoading(true);
    try {
      const response = await portfolioAPI.deleteHolding(symbol);
      setPortfolio(response.data.portfolio);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to remove position');
    } finally {
      setLoading(false);
    }
  };

  const calculatePortfolioStats = () => {
    let totalInvestment = 0;
    let currentValue = 0;
    
    portfolio.holdings.forEach(stock => {
      totalInvestment += stock.quantity * stock.avgPrice;
      currentValue += stock.quantity * (stock.currentPrice || stock.avgPrice);
    });
    
    const totalGainLoss = currentValue - totalInvestment;
    const gainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;
    
    return { totalInvestment, currentValue, totalGainLoss, gainLossPercent };
  };

  const handleScan = async () => {
    setLoading(true);
    setError('');
    
    const stocksToScan = STOCK_CATEGORIES[selectedCategory];
    
    try {
      const response = await stockAPI.scan(stocksToScan);
      setScanResults(response.data.filter(stock => !stock.error).sort((a, b) => {
        const order = { 'STRONG BUY': 0, 'BUY': 1, 'HOLD': 2, 'SELL': 3, 'STRONG SELL': 4 };
        return order[a.action] - order[b.action];
      }));
    } catch (error) {
      setError(error.response?.data?.message || 'Scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchStock = async () => {
    if (!searchSymbol.trim()) {
      setError('Please enter a stock symbol');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await stockAPI.scan([searchSymbol.toUpperCase()]);
      if (response.data[0] && !response.data[0].error) {
        setScanResults([response.data[0]]);
        handleViewDetails(searchSymbol.toUpperCase());
      } else {
        setError(`Stock ${searchSymbol} not found or data unavailable`);
      }
    } catch (error) {
      setError(`Failed to fetch data for ${searchSymbol}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (symbol) => {
    setLoading(true);
    setError('');
    
    try {
      const [historicalResponse, analysisResponse] = await Promise.all([
        stockAPI.getHistorical(symbol, 90),
        stockAPI.getAnalysis(symbol)
      ]);
      
      const historicalData = historicalResponse.data.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-IN'),
        close: d.close,
        open: d.open,
        high: d.high,
        low: d.low,
        volume: d.volume
      }));
      
      setSelectedStock({
        symbol,
        data: historicalData,
        analysis: analysisResponse.data
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch stock details');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-green-600 rounded-full mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Portfolio Manager</h1>
            <p className="text-gray-600">Indian Stock Market Platform</p>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          
          <div>
            {isRegistering && (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your name"
                />
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter email"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter password"
                onKeyPress={(e) => e.key === 'Enter' && handleAuth(e)}
              />
            </div>
            
            {isRegistering && (
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Mobile (Optional)
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter mobile number"
                />
              </div>
            )}
            
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-green-700 transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isRegistering ? 'Register' : 'Sign In'}
            </button>
            
            <p className="text-center text-gray-600 text-sm mt-4">
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
                className="text-orange-600 font-semibold"
              >
                {isRegistering ? 'Sign In' : 'Register'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stats = calculatePortfolioStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-orange-500 to-green-600 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Indian Portfolio Manager</h1>
                <p className="text-sm text-gray-500">Welcome, {username}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                activeTab === 'scanner'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4" />
                <span>Stock Scanner</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                activeTab === 'portfolio'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4" />
                <span>Portfolio</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                activeTab === 'analytics'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Analytics</span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-800 hover:text-red-900">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'scanner' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Stock Scanner</h2>
                <p className="text-gray-600">Technical Analysis with Category Filter</p>
              </div>

              {/* Search and Category Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Stock Search */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Search Stock Symbol
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter symbol (e.g., TATASTEEL, VEDL, ADANIGREEN)"
                      value={searchSymbol}
                      onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && searchSymbol) {
                          handleSearchStock();
                        }
                      }}
                    />
                    <button
                      onClick={handleSearchStock}
                      disabled={loading || !searchSymbol}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center space-x-2"
                    >
                      <Search className="w-5 h-5" />
                      <span>Search</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-orange-500 transition"
                  >
                    <span className="font-medium text-gray-700">{selectedCategory}</span>
                    <Filter className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  {showCategoryDropdown && (
                    <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {Object.keys(STOCK_CATEGORIES).map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-orange-50 transition ${
                            selectedCategory === category ? 'bg-orange-100 text-orange-600 font-semibold' : 'text-gray-700'
                          }`}
                        >
                          {category} ({STOCK_CATEGORIES[category].length} stocks)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Scan Button */}
              <button
                onClick={handleScan}
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-green-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-green-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Search className="w-5 h-5" />
                <span>{loading ? `Scanning ${STOCK_CATEGORIES[selectedCategory].length} stocks...` : `Scan ${selectedCategory}`}</span>
              </button>

              {scanResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Scan Results ({scanResults.length} stocks)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Symbol</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Price (₹)</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">RSI</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">MACD</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Signal</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanResults.map((stock, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="font-semibold text-gray-800">{stock.symbol}</span>
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className="font-medium">₹{stock.indicators?.currentPrice?.toFixed(2)}</span>
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className={
                                stock.indicators?.rsi < 30 ? 'text-green-600 font-semibold' : 
                                stock.indicators?.rsi > 70 ? 'text-red-600 font-semibold' : ''
                              }>
                                {stock.indicators?.rsi?.toFixed(1)}
                              </span>
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className={stock.indicators?.macd > 0 ? 'text-green-600' : 'text-red-600'}>
                                {stock.indicators?.macd?.toFixed(2)}
                              </span>
                            </td>
                            <td className="text-center py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                stock.action?.includes('BUY') ? 'bg-green-100 text-green-600' : 
                                stock.action?.includes('SELL') ? 'bg-red-100 text-red-600' : 
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {stock.action} ({stock.strength})
                              </span>
                            </td>
                            <td className="text-center py-3 px-4">
                              <button
                                onClick={() => handleViewDetails(stock.symbol)}
                                className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {selectedStock && (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800">{selectedStock.symbol}</h3>
        <p className="text-gray-600 mt-1">Detailed Technical Analysis</p>
      </div>
      <button
        onClick={() => setSelectedStock(null)}
        className="p-2 hover:bg-gray-100 rounded-lg"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* NEW: Trend Indicator */}
    {selectedStock.analysis.trend && (
      <div className="mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Trend Analysis</h4>
        <div className={`p-4 rounded-lg border-2 ${
          selectedStock.analysis.trend.color === 'green' ? 'bg-green-50 border-green-200' :
          selectedStock.analysis.trend.color === 'lightgreen' ? 'bg-green-50 border-green-200' :
          selectedStock.analysis.trend.color === 'red' ? 'bg-red-50 border-red-200' :
          selectedStock.analysis.trend.color === 'orange' ? 'bg-orange-50 border-orange-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xl font-bold ${
              selectedStock.analysis.trend.color === 'green' || selectedStock.analysis.trend.color === 'lightgreen' ? 'text-green-600' :
              selectedStock.analysis.trend.color === 'red' || selectedStock.analysis.trend.color === 'orange' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {selectedStock.analysis.trend.direction}
            </span>
            <span className="text-lg font-semibold text-gray-700">
              {selectedStock.analysis.trend.percentage}%
            </span>
          </div>
          <p className="text-sm text-gray-600">{selectedStock.analysis.trend.description}</p>
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  selectedStock.analysis.trend.color === 'green' || selectedStock.analysis.trend.color === 'lightgreen' ? 'bg-green-500' :
                  selectedStock.analysis.trend.color === 'red' || selectedStock.analysis.trend.color === 'orange' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}
                style={{ width: `${Math.min(100, Math.abs(selectedStock.analysis.trend.strength))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )}

    {/* NEW: Chart Patterns */}
    {selectedStock.analysis.patterns && selectedStock.analysis.patterns.length > 0 && (
      <div className="mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Detected Chart Patterns</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedStock.analysis.patterns.map((pattern, idx) => (
            <div 
              key={idx}
              className={`p-4 rounded-lg border-2 ${
                pattern.type === 'BULLISH' ? 'bg-green-50 border-green-200' :
                pattern.type === 'BEARISH' ? 'bg-red-50 border-red-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold text-sm ${
                  pattern.type === 'BULLISH' ? 'text-green-600' :
                  pattern.type === 'BEARISH' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {pattern.name}
                </span>
                <span className="text-xs px-2 py-1 bg-white rounded-full font-semibold">
                  {pattern.confidence}% confident
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">{pattern.description}</p>
              <p className="text-xs font-semibold text-gray-700">
                💡 {pattern.action}
              </p>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Existing Technical Indicators */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-1">SMA 20</div>
        <div className="text-xl font-bold text-gray-800">
          ₹{selectedStock.analysis.indicators.sma20?.toFixed(2)}
        </div>
      </div>
      <div className="bg-purple-50 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-1">SMA 50</div>
        <div className="text-xl font-bold text-gray-800">
          ₹{selectedStock.analysis.indicators.sma50?.toFixed(2)}
        </div>
      </div>
      <div className="bg-green-50 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-1">RSI (14)</div>
        <div className="text-xl font-bold text-gray-800">
          {selectedStock.analysis.indicators.rsi?.toFixed(1)}
        </div>
      </div>
      <div className="bg-orange-50 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-1">MACD</div>
        <div className="text-xl font-bold text-gray-800">
          {selectedStock.analysis.indicators.macd?.toFixed(2)}
        </div>
      </div>
    </div>

    {/* Rest of your existing code for signals and chart */}
    <div className="mb-6">
      <h4 className="font-semibold text-gray-800 mb-3">Trading Signals</h4>
      <div className={`p-4 rounded-lg ${
        selectedStock.analysis.action?.includes('BUY') ? 'bg-green-50 border border-green-200' :
        selectedStock.analysis.action?.includes('SELL') ? 'bg-red-50 border border-red-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-2xl font-bold ${
            selectedStock.analysis.action?.includes('BUY') ? 'text-green-600' :
            selectedStock.analysis.action?.includes('SELL') ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {selectedStock.analysis.action}
          </span>
          <span className="text-lg font-semibold text-gray-700">
            {selectedStock.analysis.strength} Signal
          </span>
        </div>
        <ul className="space-y-2">
          {selectedStock.analysis.signals.map((signal, idx) => (
            <li key={idx} className="flex items-start text-sm text-gray-700">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>{signal.indicator}:</strong> {signal.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={selectedStock.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="close" stroke="#f97316" fill="#fb923c" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
)}

        {activeTab === 'portfolio' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Value</span>
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {formatINR(stats.currentValue)}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Gain/Loss</span>
                  {stats.totalGainLoss >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className={`text-3xl font-bold ${stats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatINR(Math.abs(stats.totalGainLoss))}
                </div>
                <div className={`text-sm font-medium mt-1 ${stats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalGainLoss >= 0 ? '+' : '-'}{Math.abs(stats.gainLossPercent).toFixed(2)}%
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Holdings</span>
                  <PieChart className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {portfolio.holdings.length}
                </div>
                <div className="text-sm text-gray-500 mt-1">Active positions</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Portfolio Holdings</h2>
                <button
                  onClick={() => setShowAddPosition(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-green-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-green-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Position</span>
                </button>
              </div>

              {showAddPosition && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-4">Add New Position</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      placeholder="Symbol (e.g., RELIANCE)"
                      value={newPosition.symbol}
                      onChange={(e) => setNewPosition({...newPosition, symbol: e.target.value})}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={newPosition.name}
                      onChange={(e) => setNewPosition({...newPosition, name: e.target.value})}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={newPosition.quantity}
                      onChange={(e) => setNewPosition({...newPosition, quantity: e.target.value})}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Avg Price (₹)"
                      value={newPosition.price}
                      onChange={(e) => setNewPosition({...newPosition, price: e.target.value})}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={handleAddPosition}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add Position'}
                    </button>
                    <button
                      onClick={() => setShowAddPosition(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {portfolio.holdings.length === 0 ? (
                <div className="text-center py-12">
                  <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No holdings yet. Add your first position!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Symbol</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Quantity</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Price</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Current Price</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Value</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Gain/Loss</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map((stock, idx) => {
                        const currentPrice = stock.currentPrice || stock.avgPrice;
                        const totalCost = stock.quantity * stock.avgPrice;
                        const currentValue = stock.quantity * currentPrice;
                        const gainLoss = currentValue - totalCost;
                        const gainLossPercent = ((gainLoss / totalCost) * 100).toFixed(2);

                        return (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-4">
                              <span className="font-bold text-gray-800">{stock.symbol}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-gray-600">{stock.name}</span>
                            </td>
                            <td className="text-right py-4 px-4">
                              <span className="font-medium">{stock.quantity}</span>
                            </td>
                            <td className="text-right py-4 px-4">
                              <span className="font-medium">{formatINR(stock.avgPrice)}</span>
                            </td>
                            <td className="text-right py-4 px-4">
                              <span className="font-medium">{formatINR(currentPrice)}</span>
                            </td>
                            <td className="text-right py-4 px-4">
                              <span className="font-bold">{formatINR(currentValue)}</span>
                            </td>
                            <td className="text-right py-4 px-4">
                              <div className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                <div className="font-bold">
                                  {formatINR(gainLoss)}
                                </div>
                                <div className="text-sm">
                                  ({gainLoss >= 0 ? '+' : ''}{gainLossPercent}%)
                                </div>
                              </div>
                            </td>
                            <td className="text-center py-4 px-4">
                              <button
                                onClick={() => handleRemovePosition(stock.symbol)}
                                disabled={loading}
                                className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Portfolio Performance</h2>
            {portfolio.holdings.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={Array.from({ length: 30 }, (_, i) => ({
                  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
                  value: stats.currentValue * (1 + (Math.random() * 0.1 - 0.05))
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatINR(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#f97316" name="Portfolio Value" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Add holdings to see analytics</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;