export function validate(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter((field) => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        missing,
      });
    }

    return next();
  };
}

export function validateCameraStatus(req, res, next) {
  const { status, is_blocked } = req.body;

  if (status !== undefined && !['online', 'offline', 'maintenance'].includes(status)) {
    return res.status(400).json({
      message: 'Invalid status. Use online, offline, or maintenance.',
    });
  }

  if (is_blocked !== undefined && typeof is_blocked !== 'boolean') {
    return res.status(400).json({
      message: 'is_blocked must be true or false.',
    });
  }

  return next();
}
