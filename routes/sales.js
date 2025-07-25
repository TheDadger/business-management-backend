const express = require('express');
const router = express.Router();
const { Invoice } = require('../models');

// GET /api/sales
// Get sales invoices filtered by date range, customer, product
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, customer, product } = req.query;

    const query = {
      status: { $in: ['paid', 'sent'] }, // only count actual sales
      invoiceNumber: { $ne: 'NaN' }      // exclude bad invoices
    };

    // Filter by date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Filter by customer if provided
    if (customer) {
      query.customer = customer;
    }

    // Filter by product inside invoice items if provided
    if (product) {
      query.items = { $elemMatch: { product } };
    }

    // Fetch invoices with populated references
    const invoices = await Invoice.find(query)
      .populate('customer', 'name email')
      .populate('items.product', 'name price');

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// GET /api/sales/summary
router.get('/summary', async (req, res) => {
  const { period = 'month' } = req.query;

  const groupBy = {
    day: {
      _id: {
        year: { $year: "$date" },
        month: { $month: "$date" },
        day: { $dayOfMonth: "$date" }
      }
    },
    week: {
      _id: {
        year: { $year: "$date" },
        week: { $isoWeek: "$date" }
      }
    },
    month: {
      _id: {
        year: { $year: "$date" },
        month: { $month: "$date" }
      }
    },
    year: {
      _id: {
        year: { $year: "$date" }
      }
    }
  };

  try {
    const summary = await Invoice.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          ...groupBy[period],
          totalAmount: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.json(summary);
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({ error: "Failed to fetch sales summary" });
  }
});

// GET /api/sales/top-products
router.get('/top-products', async (req, res) => {
  try {
    const { startDate, endDate, customer, product, limit = 5 } = req.query;

    const match = {};

    // Date filter
    if (startDate && endDate) {
      match.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Customer filter
    if (customer) {
      match.customer = customer;
    }

    // product filter: will apply in $unwind stage below

    // Aggregation pipeline to get top products by quantity and revenue
    const pipeline = [
      { $match: match },
      { $unwind: '$items' }, // flatten items array
    ];

    // Filter by product if provided
    if (product) {
      pipeline.push({ $match: { 'items.product': product } });
    }

    pipeline.push(
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'products', // make sure your product collection name is correct
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.name',
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) }
    );

    const topProducts = await Invoice.aggregate(pipeline);

    res.json(topProducts);
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

module.exports = router;
