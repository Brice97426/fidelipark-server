// src/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_super_securise';

/**
 * Middleware pour vérifier le token JWT
 */
const authenticateToken = (req, res, next) => {
    try {
        // Récupérer le token depuis l'header Authorization
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({ error: 'Token d\'authentification manquant' });
        }

        // Vérifier et décoder le token
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                console.error('Erreur vérification token:', err.message);

                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ error: 'Token expiré' });
                }

                return res.status(403).json({ error: 'Token invalide' });
            }

            // Ajouter les infos utilisateur à la requête
            req.user = user;
            next();
        });
    } catch (error) {
        console.error('Erreur middleware auth:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/**
 * Middleware pour vérifier que l'utilisateur est un client
 */
const isClient = (req, res, next) => {
    if (req.user.userType !== 'CLIENT') {
        return res.status(403).json({ error: 'Accès réservé aux clients' });
    }
    next();
};

/**
 * Middleware pour vérifier que l'utilisateur est un commerçant
 */
const isMerchant = (req, res, next) => {
    if (req.user.userType !== 'MERCHANT') {
        return res.status(403).json({ error: 'Accès réservé aux commerçants' });
    }
    next();
};

/**
 * Middleware pour vérifier que l'utilisateur est un administrateur
 */
const isAdmin = (req, res, next) => {
    if (req.user.userType !== 'ADMIN') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
};

module.exports = {
    authenticateToken,
    isClient,
    isMerchant,
    isAdmin,
};