const express = require('express');
const router = express.Router();
const { Product, StockMovement } = require('../models'); // adjust paths if needed

// GET /api/stock
// Return all products with computed current stock quantity
router.get('/', async (req, res) => {
  try {
    const { lowStock, category } = req.query;

    // Build product query
    const productFilter = {};
    if (category) productFilter.category = category;

    let products = await Product.find(productFilter).lean();

    const productIds = products.map(p => p._id);

    // Aggregate stock movements to sum quantities per product
    const agg = await StockMovement.aggregate([
      { $match: { product: { $in: productIds } } },
      { $group: {
          _id: "$product",
          totalQuantity: { $sum: "$quantity" }
        }
      }
    ]);

    // Map productId -> total quantity
    const quantityMap = {};
    agg.forEach(item => {
      quantityMap[item._id.toString()] = item.totalQuantity;
    });

    // Attach quantity to products
    products = products.map(product => ({
      ...product,
      quantity: quantityMap[product._id.toString()] || 0
    }));

    // Filter low stock if requested
    if (lowStock === 'true') {
      products = products.filter(p => p.quantity > 0 && p.quantity <= 10);
    }

    res.json(products);
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/stock/movements
// Return stock movement documents with optional filters
router.get('/movements', async (req, res) => {
  try {
    const {
      product,
      type,       // corresponds to referenceType: 'purchase', 'invoice', 'adjustment', etc.
      startDate,
      endDate
    } = req.query;

    const filter = {};

    if (product) filter.product = product;
    if (type) filter.referenceType = type;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const movements = await StockMovement.find(filter)
      .populate('product', 'name')  // populate product name only
      .sort({ createdAt: -1 })
      .lean();

    res.json(movements);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
