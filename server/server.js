require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();

// Middleware
const allowedOrigins = [
   'http://localhost:3000',
   'https://buildnrise.vercel.app'
];

app.use(cors({
   origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
         callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
}));
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/stocks', require('./routes/stocks'));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Indian Portfolio Manager API is running!',
    endpoints: {
      auth: '/api/auth/register, /api/auth/login',
      portfolio: '/api/portfolio',
      stocks: '/api/stocks/quote/:symbol, /api/stocks/scan'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}`);
});