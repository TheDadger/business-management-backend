const express = require('express');
const router = express.Router();
const { Purchase, StockMovement } = require('../models');

// Helper function to generate unique PO number
function generatePONumber() {
  return 'PO-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// POST /api/purchases - Create a new purchase
router.post('/', async (req, res) => {
  try {
    const {
      poNumber,
      vendor,
      date,
      items,
      status,
      notes
    } = req.body;

    console.log('💥 Incoming purchase POST body:', req.body);

    // Basic validations
    if (!vendor) {
      return res.status(400).json({ message: 'Vendor is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one purchase item is required' });
    }

    for (const item of items) {
      if (!item.product || item.quantity == null || item.cost == null) {
        return res.status(400).json({ message: 'Each item must have product, quantity, and cost' });
      }
      if (item.quantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than 0' });
      }
      if (item.cost < 0) {
        return res.status(400).json({ message: 'Cost cannot be negative' });
      }
    }

    // Create purchase document
    const newPurchase = await Purchase.create({
      poNumber: poNumber || generatePONumber(),
      vendor,
      date: date || new Date(),
      items,
      status: status || 'ordered',
      notes,
    });

    // Create stock movement documents for each item referencing this purchase
    const movements = items.map(item => ({
      product: item.product,
      quantity: item.quantity, // positive for purchases
      referenceType: 'purchase',
      referenceId: newPurchase._id,
      notes: `Stock added from purchase order ${newPurchase.poNumber}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

// Save all stock movements
await StockMovement.insertMany(movements);



    res.status(201).json(newPurchase);
  } catch (err) {
    console.error('Failed to save purchase:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message, errors: err.errors });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/purchases - Get all purchases with filters
router.get('/', async (req, res) => {
  try {
    const { status, vendor, startDate, endDate } = req.query;

    const query = {};

    if (status) query.status = status;
    if (vendor) query.vendor = vendor;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(query)
      .populate('vendor')
      .populate('items.product')
      .sort({ date: -1 });

    res.json(purchases);
  } catch (err) {
    console.error('Error fetching purchases:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// DELETE /api/purchases/:id - Delete a purchase
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Purchase.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    res.json({ message: 'Purchase deleted successfully' });
  } catch (err) {
    console.error('Error deleting purchase:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
