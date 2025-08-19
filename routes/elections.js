const express = require('express');
const Election = require('../models/Election');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Get all elections
router.get('/', auth, async (req, res) => {
  try {
    const elections = await Election.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(elections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single election
router.get('/:id', auth, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    res.json(election);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create election (Admin only)
router.post('/', [auth, adminAuth], async (req, res) => {
  try {
    const { title, description, candidates, startDate, endDate } = req.body;

    const election = new Election({
      title,
      description,
      candidates: candidates.map(candidate => ({
        ...candidate,
        votes: 0
      })),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdBy: req.user.userId
    });

    await election.save();
    await election.populate('createdBy', 'name email');

    res.status(201).json(election);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update election (Admin only)
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { title, description, candidates, startDate, endDate, isActive } = req.body;

    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    election.title = title || election.title;
    election.description = description || election.description;
    election.candidates = candidates || election.candidates;
    election.startDate = startDate ? new Date(startDate) : election.startDate;
    election.endDate = endDate ? new Date(endDate) : election.endDate;
    election.isActive = isActive !== undefined ? isActive : election.isActive;

    await election.save();
    await election.populate('createdBy', 'name email');

    res.json(election);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete election (Admin only)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    await Election.findByIdAndDelete(req.params.id);
    res.json({ message: 'Election deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get election results
router.get('/:id/results', auth, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Calculate vote percentages
    const results = election.candidates.map(candidate => ({
      ...candidate.toObject(),
      percentage: election.totalVotes > 0 ? 
        Math.round((candidate.votes / election.totalVotes) * 100) : 0
    }));

    res.json({
      ...election.toObject(),
      candidates: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;