const express = require('express');
const { Skill } = require('../models');
const { verifyToken } = require('../middleware/authMiddleware'); // Ensure faculty access here

const router = express.Router();

// Get all skills
router.get('/', verifyToken, async (req, res) => {
  const skills = await Skill.findAll();
  res.json(skills);
});

// Add a skill
router.post('/', verifyToken, async (req, res) => {
  const skill = await Skill.create(req.body);
  res.status(201).json(skill);
});

// Edit a skill
router.put('/:id', verifyToken, async (req, res) => {
  await Skill.update(req.body, { where: { id: req.params.id } });
  res.json({ message: "Skill updated" });
});

// Delete a skill
router.delete('/:id', verifyToken, async (req, res) => {
  await Skill.destroy({ where: { id: req.params.id } });
  res.json({ message: "Skill deleted" });
});

module.exports = router;