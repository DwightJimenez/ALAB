const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // 1. Look for the cookie we baked during login
  const token = req.cookies.alab_token;
  
  if (!token) {
    return res.status(401).json({ error: "Access Denied. Please log in." });
  }

  try {
    // 2. Verify the token using your secret key
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Attach the decoded user info (id, role) to the request
    req.user = verified;
    
    // 4. Move on to the actual API route!
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired token." });
  }
};

// Optional: Extra bouncer specifically for Admins
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'TECHNICIAN') {
    return res.status(403).json({ error: "Access Denied. Admins only." });
  }
  next();
};

module.exports = { verifyToken, requireAdmin };