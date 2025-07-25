
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  // You can safely remove the options below now
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));


// Base schema for common fields
const baseSchema = {
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
};

// User Schema
const userSchema = new mongoose.Schema({
  ...baseSchema,
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' }
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  ...baseSchema,
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String},
  address: { type: String },
  taxId: { type: String },
  paymentTerms: { type: Number, default: 30 } // days
});

// Vendor Schema
const vendorSchema = new mongoose.Schema({
  ...baseSchema,
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  taxId: { type: String },
  paymentTerms: { type: Number, default: 30 } // days
});

// Product Schema
const productSchema = new mongoose.Schema({
  ...baseSchema,
  name: { type: String, required: true },
  description: { type: String },
  cost: { type: Number, required: true, min: 0 },
});

// Invoice Schema
const invoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: Number,
  price: Number,
  discount: Number
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  date: Date,
  dueDate: Date,
  items: [invoiceItemSchema],
  taxRate: Number,
  status: { type: String, enum: ['draft', 'sent', 'paid'], default: 'draft' },
  notes: String
}, { timestamps: true });

// Payment Schema
const paymentSchema = new mongoose.Schema({
  ...baseSchema,
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  method: { type: String, enum: ['cash', 'bank', 'card', 'online'], required: true },
  reference: { type: String }
});

// Purchase Order Schema
const purchaseSchema = new mongoose.Schema({
  ...baseSchema,
  poNumber: { type: String, unique: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  date: { type: Date, required: true, default: Date.now },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    cost: { type: Number, required: true, min: 0 }
  }],
  status: { type: String, enum: ['draft', 'ordered', 'received', 'cancelled'], default: 'ordered' },
  notes: { type: String }
});

// Stock Movement Schema
const stockMovementSchema = new mongoose.Schema({
  ...baseSchema,
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  referenceType: { type: String, enum: ['invoice', 'purchase', 'adjustment'], required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  notes: { type: String }
});

// Credit Schema
const creditSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
}, { timestamps: true });


// Export models
module.exports = {
  User: mongoose.models.User || mongoose.model('User', userSchema),
  Product: mongoose.models.Product || mongoose.model('Product', productSchema),
  Customer: mongoose.models.Customer || mongoose.model('Customer', customerSchema),
  Vendor: mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema),
  Invoice: mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema),
  Payment: mongoose.models.Payment || mongoose.model('Payment', paymentSchema),
  Purchase: mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema),
  StockMovement: mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema),
  Credit: mongoose.models.Credit || mongoose.model('Credit', creditSchema)
};