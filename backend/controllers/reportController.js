const Report = require('../models/ReportsModel');
const Recipe = require('../models/RecipeModel');
const { HttpError, asyncHandler, assertId } = require('../utils/http');

// POST /api/reports  { reportedItem, reason, type }
const createReport = asyncHandler(async (req, res) => {
  const { reportedItem } = req.body;
  const reason = String(req.body.reason || '').trim().slice(0, 500);
  const type = ['recipe', 'review', 'user'].includes(req.body.type) ? req.body.type : 'recipe';

  assertId(reportedItem, 'item ID');
  if (reason.length < 5) throw new HttpError(400, 'Tell us briefly what is wrong (at least 5 characters).');
  if (type === 'recipe' && !(await Recipe.exists({ _id: reportedItem }))) throw new HttpError(404, 'This recipe does not exist.');

  const duplicate = await Report.exists({ reportedBy: req.userId, reportedItem, status: 'open' });
  if (duplicate) throw new HttpError(409, 'You already reported this. An admin will review it.');

  const report = await Report.create({ reportedBy: req.userId, reportedItem, reason, type });
  res.status(201).json({ message: 'Thanks. An admin will review it.', _id: report._id });
});

module.exports = { createReport };
