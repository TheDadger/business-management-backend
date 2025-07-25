require('dotenv').config();


const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));

const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

const vendorRoutes = require('./routes/vendors');
app.use('/api/vendors', vendorRoutes);

const purchaseRoutes = require('./routes/purchases');
app.use('/api/purchases', purchaseRoutes);

const customerRoutes = require('./routes/customers');
app.use('/api/customers', customerRoutes);

const stockRoutes = require('./routes/stock');
app.use('/api/stock', stockRoutes);

const invoiceRoutes = require('./routes/invoices');
app.use('/api/invoices', invoiceRoutes);

const creditRoutes = require('./routes/credits');
app.use('/api/credits', creditRoutes);

const salesRoutes = require('./routes/sales');
app.use('/api/sales', salesRoutes);


// Default
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling (optional dev)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
