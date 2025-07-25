const express = require('express');
const router = express.Router();
const { Invoice, Product, StockMovement } = require('../models');

// @route   POST /api/invoices
// @desc    Create a new invoice
router.post('/', async (req, res) => {
  try {
    const {
      invoiceNumber,
      customer,
      date,
      dueDate,
      items,
      taxRate,
      status,
      notes
    } = req.body;

    // Create invoice
    // Generate a unique invoice number if not provided
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });

    let lastNumber = 1000; // default start
    if (lastInvoice) {
      const parsedNumber = parseInt(lastInvoice.invoiceNumber);
      if (!isNaN(parsedNumber)) {
        lastNumber = parsedNumber;
      }
    }

    const nextNumber = lastNumber + 1;
        
    const newInvoice = new Invoice({
      invoiceNumber: invoiceNumber || String(nextNumber),
      customer,
      date,
      dueDate,
      items,
      taxRate,
      status,
      notes
    });


    await newInvoice.save();

    // Decrease stock and create stock movements
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        console.warn(`⚠️ Product not found for ID: ${item.product}`);
        continue;
      }

      product.stockRemaining = (product.stockRemaining || 0) - item.quantity;
      await product.save();

      await StockMovement.create({
        product: product._id,
        quantity: -item.quantity,
        referenceType: 'invoice',
        referenceId: newInvoice._id,
        notes: `Sold ${item.quantity} units in Invoice ${invoiceNumber}`
      });
    }

    res.status(201).json(newInvoice);
  } catch (err) {
    console.error('💥 Invoice creation failed:\n', err.stack); // full error trace
    res.status(500).json({ message: 'Failed to create invoice', error: err.message });
  }
});

// @route   GET /api/invoices
// @desc    Get all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('customer', 'name email')
      .populate('items.product', 'name cost');
    
    res.json(invoices);
  } catch (err) {
    console.error('Error fetching invoices:', err.message);
    res.status(500).json({ message: 'Server error fetching invoices' });
  }
});

// @route   DELETE /api/invoices/:id
// @desc    Delete an invoice and related stock movements
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Remove related stock movements
    await StockMovement.deleteMany({
      referenceType: 'invoice',
      referenceId: req.params.id
    });

    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    console.error('Error deleting invoice:', err.message);
    res.status(500).json({ message: 'Server error deleting invoice' });
  }
});

// @route   GET /api/invoices/:id
// @desc    Get single invoice by ID with populated fields
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate('items.product', 'name description cost');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (err) {
    console.error('Error fetching invoice:', err.message);
    res.status(500).json({ message: 'Server error fetching invoice' });
  }
});


module.exports = router;
