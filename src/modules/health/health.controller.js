const prisma = require('../../database/prisma');
const catchAsync = require('../../utils/catchAsync');

exports.checkHealth = catchAsync(async (req, res) => {
  const userCount = await prisma.user.count();
  res.status(200).json({
    status: 'ok',
    database: 'connected',
    userCount,
    timestamp: new Date().toISOString(),
  });
});