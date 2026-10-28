const fs = require('fs');
const path = require('path');
const Scheme = require('../models/Scheme');

function loadDefaultSchemes() {
  try {
    const p = path.join(__dirname, '..', 'data', 'defaultSchemes.json');
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * @desc    Get all active government schemes (auto-seeds defaults if collection is empty)
 * @route   GET /api/schemes
 * @access  Public
 */
const getSchemes = async (req, res, next) => {
  try {
    let schemes = await Scheme.find({ isActive: true }).sort({ createdAt: 1 });
    if (schemes.length === 0) {
      const defaults = loadDefaultSchemes();
      if (defaults.length > 0) {
        schemes = await Scheme.insertMany(defaults);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Government schemes loaded',
      data: {
        schemes,
        disclaimer:
          'Official scheme portals only. Eligibility rules and disbursement dates are subject to government updates — always verify on the official .gov.in portal.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin creates a new government scheme entry
 * @route   POST /api/schemes
 * @access  Private (Admin)
 */
const createScheme = async (req, res, next) => {
  try {
    const { title, shortCode, category, state, summary, officialUrl, helpline } = req.body;
    if (!title || !summary || !officialUrl) {
      return res.status(400).json({
        success: false,
        message: 'Title, summary, and official URL are required.'
      });
    }

    const scheme = await Scheme.create({
      title: title.trim(),
      shortCode: (shortCode || '').trim(),
      category: category || 'Income Support',
      state: (state || 'All India').trim(),
      summary: summary.trim(),
      officialUrl: officialUrl.trim(),
      helpline: (helpline || '').trim(),
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: 'Government scheme added.',
      data: { scheme }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin updates a government scheme entry
 * @route   PUT /api/schemes/:id
 * @access  Private (Admin)
 */
const updateScheme = async (req, res, next) => {
  try {
    const scheme = await Scheme.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Government scheme updated.',
      data: { scheme }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin deletes a government scheme entry
 * @route   DELETE /api/schemes/:id
 * @access  Private (Admin)
 */
const deleteScheme = async (req, res, next) => {
  try {
    const scheme = await Scheme.findByIdAndDelete(req.params.id);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Government scheme removed.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSchemes,
  createScheme,
  updateScheme,
  deleteScheme
};

