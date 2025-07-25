const express = require('express');
const router = express.Router();
const { Product, StockMovement } = require('../models');

// GET /api/products - list products with stockRemaining
router.get('/', async (req, res) => {
  try {
    // Fetch all products (lean for plain JS objects)
    const products = await Product.find().lean();

    // Aggregate total stock quantity per product
    const stockAgg = await StockMovement.aggregate([
      {
        $group: {
          _id: '$product',
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    // Create a map from product ID to stock quantity
    const stockMap = {};
    stockAgg.forEach(s => {
      stockMap[s._id.toString()] = s.totalQuantity;
    });

    // Attach stockRemaining to each product
    const productsWithStock = products.map(product => ({
      ...product,
      stockRemaining: stockMap[product._id.toString()] || 0
    }));

    res.json(productsWithStock);
  } catch (err) {
    console.error('Failed to fetch products with stock:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products - create a new product
router.post('/', async (req, res) => {
  try {
    const { name, description, cost } = req.body;

    if (!name || cost === undefined) {
      return res.status(400).json({ message: 'Name and cost are required' });
    }

    const newProduct = new Product({ name, description, cost });
    await newProduct.save();

    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Failed to create product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// GET /api/products/:id - Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('Failed to get product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Failed to update product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;
