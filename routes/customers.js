const express = require('express');
const router = express.Router();
const { Customer } = require('../models');

// GET /api/customers - List all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 }); // sorted by name ascending
    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/customers - Create a new customer
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, taxId, paymentTerms } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    const newCustomer = await Customer.create({
      name,
      email,
      phone,
      address,
      taxId,
      paymentTerms,
    });

    res.status(201).json(newCustomer);
  } catch (err) {
    console.error('Failed to create customer:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message, errors: err.errors });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/customers/:id - Update existing customer
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, address, taxId, paymentTerms } = req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.name = name ?? customer.name;
    customer.email = email ?? customer.email;
    customer.phone = phone ?? customer.phone;
    customer.address = address ?? customer.address;
    customer.taxId = taxId ?? customer.taxId;
    customer.paymentTerms = paymentTerms ?? customer.paymentTerms;

    await customer.save();

    res.json(customer);
  } catch (err) {
    console.error('Failed to update customer:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message, errors: err.errors });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Customer not found' });

    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
