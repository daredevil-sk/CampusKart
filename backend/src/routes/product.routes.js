const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const router = express.Router();
const {
  createProduct,
  getAvailableProducts,
  getActiveAuctions,
  getMyProducts,
  editProduct,
  deleteProduct,
  getPendingProducts,
  approveProduct,
  getProductById
} = require('../controllers/product.controller');

// ── Static routes MUST come before /:id to avoid being swallowed ────────────
router.get('/auctions', getActiveAuctions);
router.get('/my-products', verifyToken, getMyProducts);
router.get('/admin/pending', verifyToken, isAdmin, getPendingProducts);

// ── Public routes ──────────────────────────────────────────────────────────
router.get('/', getAvailableProducts);
router.get('/:id', getProductById);

// ── Authenticated user routes ──────────────────────────────────────────────
router.post('/add', verifyToken, upload.single('productPic'), createProduct);
router.put('/admin/approve/:id', verifyToken, isAdmin, approveProduct);
router.put('/:id', verifyToken, upload.single('productPic'), editProduct); // for image uploads
router.patch('/:id', verifyToken, editProduct); // for JSON-only updates (status, fields)
router.delete('/:id', verifyToken, deleteProduct);

module.exports = router;
