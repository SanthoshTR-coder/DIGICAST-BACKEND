const express = require('express');
const Election = require('../models/Election');
const Vote = require('../models/Vote');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Cast vote
router.post('/', auth, async (req, res) => {
  try {
    const { electionId, candidateId } = req.body;
    const voterId = req.user.userId;

    // Check if election exists and is active
    const election = await Election.findById(electionId);
    if (!election || !election.isActive) {
      return res.status(400).json({ message: 'Election not found or inactive' });
    }

    // Check if voting period is valid
    const now = new Date();
    if (now < election.startDate || now > election.endDate) {
      return res.status(400).json({ message: 'Voting period has ended or not started yet' });
    }

    // Check if user has already voted in this election
    const existingVote = await Vote.findOne({ election: electionId, voter: voterId });
    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted in this election' });
    }

    // Verify candidate exists in this election
    const candidateExists = election.candidates.some(
      candidate => candidate._id.toString() === candidateId
    );
    if (!candidateExists) {
      return res.status(400).json({ message: 'Invalid candidate' });
    }

    // Create vote record
    const vote = new Vote({
      election: electionId,
      voter: voterId,
      candidate: candidateId
    });

    await vote.save();

    // Update election vote counts
    const candidateIndex = election.candidates.findIndex(
      candidate => candidate._id.toString() === candidateId
    );
    election.candidates[candidateIndex].votes += 1;
    election.totalVotes += 1;

    await election.save();

    // Update user's voted elections
    await User.findByIdAndUpdate(voterId, {
      $push: { votedElections: electionId }
    });

    res.json({ message: 'Vote cast successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already voted in this election' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's voting history
router.get('/history', auth, async (req, res) => {
  try {
    const votes = await Vote.find({ voter: req.user.userId })
      .populate('election', 'title startDate endDate')
      .sort({ createdAt: -1 });

    res.json(votes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user has voted in specific election
router.get('/check/:electionId', auth, async (req, res) => {
  try {
    const vote = await Vote.findOne({
      election: req.params.electionId,
      voter: req.user.userId
    });

    res.json({ hasVoted: !!vote });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;