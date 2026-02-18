const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) return res.status(401).json({ message: 'User not found' });
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

// Role-based Access Control Middleware
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (req.user && roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ message: `Access denied. Requires role: ${roles.join(' or ')}` });
        }
    };
};

// Rider Approval Check Middleware
const requireApprovedRider = (req, res, next) => {
    if (req.user && req.user.role === 'rider') {
        if (req.user.riderStatus === 'approved' && req.user.isActive) {
            next();
        } else {
            res.status(403).json({ message: 'Your account is pending approval from admin' });
        }
    } else {
        next(); // Not a rider, continue (or you might want to combine with requireRole)
    }
};

module.exports = { requireAuth, admin, requireRole, requireApprovedRider };
