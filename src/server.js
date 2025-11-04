require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const pool = require('./config/database');
const redisClient = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes de base
app.get('/', (req, res) => {
  res.json({
    message: '🎉 FidéliPark API is running!',
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// Routes d'authentification
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);
// Test PostgreSQL
app.get('/test/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'OK',
      message: 'PostgreSQL connected',
      serverTime: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
    });
  }
});

// Test Redis
app.get('/test/redis', async (req, res) => {
  try {
    await redisClient.set('test', 'FidéliPark');
    const value = await redisClient.get('test');
    await redisClient.del('test');
    res.json({
      status: 'OK',
      message: 'Redis connected',
      testValue: value,
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
    });
  }
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    status: 'ERROR',
    message: 'Route not found',
    path: req.path,
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'ERROR',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Démarrage du serveur
app.listen(PORT, HOST, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   🎉 FidéliPark API Server Started   ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n✅ Server: http://${HOST}:${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV}`);
  console.log(`✅ Time: ${new Date().toISOString()}\n`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing server');
  process.exit(0);
});
