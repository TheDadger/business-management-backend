const express = require('express');
const router = express.Router();
const { Payment, Invoice, Credit, Customer } = require('../models');

// CREATE a payment (credit)
router.post('/payments', async (req, res) => {
  try {
    const { invoice, amount, date, method, reference } = req.body;

    // Validate invoice existence
    const invoiceDoc = await Invoice.findById(invoice);
    if (!invoiceDoc) return res.status(404).json({ error: 'Invoice not found' });

    // Create payment
    const payment = new Payment({ invoice, amount, date, method, reference });
    await payment.save();

    // Update Credit document linked to this invoice
    const creditDoc = await Credit.findOne({ invoice });
    if (creditDoc) {
      creditDoc.paidAmount += amount;
      creditDoc.dueAmount = creditDoc.totalAmount - creditDoc.paidAmount;

      if (creditDoc.dueAmount <= 0) {
        creditDoc.status = 'paid';
        creditDoc.dueAmount = 0;
      } else if (creditDoc.paidAmount > 0) {
        creditDoc.status = 'partial';
      }

      await creditDoc.save();
    }

    res.status(201).json(payment);
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all payments
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find().populate('invoice');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// GET payments by invoice ID
router.get('/payments/invoice/:invoiceId', async (req, res) => {
  try {
    const payments = await Payment.find({ invoice: req.params.invoiceId });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get payments for invoice' });
  }
});

// DELETE payment by ID
router.delete('/payments/:id', async (req, res) => {
  try {
    const deleted = await Payment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// GET outstanding credits (unpaid or partial)
router.get('/outstanding', async (req, res) => {
  try {
    // Fetch invoices with status 'sent' (i.e., outstanding invoices)
    const invoices = await Invoice.find({ status: 'sent' })
      .populate('customer', 'name email')
      .populate('items.product', 'name');

    res.json(invoices);
  } catch (err) {
    console.error('Error fetching outstanding credits:', err);
    res.status(500).json({ message: 'Server error fetching outstanding credits' });
  }
});


// GET credit history by customer ID: invoices + payments
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    // Find invoices for this customer
    const invoices = await Invoice.find({ customer: customerId }).populate('items.product');
    // Find payments for those invoices
    const invoiceIds = invoices.map(inv => inv._id);
    const payments = await Payment.find({ invoice: { $in: invoiceIds } });

    res.json({
      customer: await Customer.findById(customerId),
      invoices,
      payments
    });
  } catch (err) {
    console.error('Error fetching customer credit history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
