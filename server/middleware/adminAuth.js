/**
 * Simple admin password middleware
 * Checks for admin password in request headers
 */
export function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
  const providedPassword = req.headers['x-admin-password'];

  if (!providedPassword || providedPassword !== adminPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin password required for this operation'
    });
  }

  next();
}
