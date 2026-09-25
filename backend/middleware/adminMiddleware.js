const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required for this action.'
    });
  }
  next();
};

module.exports = { authorizeAdmin };
