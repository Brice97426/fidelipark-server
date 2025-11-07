const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const redisClient = require('../config/redis'); // 🔥 ajouté pour gestion de déconnexion sécurisée

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_super_securise';
const JWT_EXPIRES_IN = '7d';

// ==========================================
// VALIDATION MIDDLEWARES
// ==========================================
const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

// ==========================================
// INSCRIPTION CLIENT
// ==========================================
router.post('/register/client', validateRegister, [
  body('nom').notEmpty().withMessage('Nom requis'),
  body('prenom').notEmpty().withMessage('Prénom requis'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom, prenom, email, password, nb_tel } = req.body;

    const existingUser = await pool.query(
      'SELECT id_client FROM client WHERE mail = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO client (nom, prenom, mail, mdp, nb_tel, points)
       VALUES ($1, $2, $3, $4, $5, 0)
       RETURNING id_client, nom, prenom, mail, points`,
      [nom, prenom, email, hashedPassword, nb_tel || null]
    );

    const newClient = result.rows[0];
    const token = jwt.sign(
      { userId: newClient.id_client, userType: 'CLIENT', email: newClient.mail },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: {
        id: newClient.id_client,
        nom: newClient.nom,
        prenom: newClient.prenom,
        email: newClient.mail,
        points: newClient.points,
        userType: 'CLIENT',
      },
    });
  } catch (error) {
    console.error('Erreur inscription client:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// ==========================================
// INSCRIPTION COMMERÇANT
// ==========================================
router.post('/register/merchant', validateRegister, [
  body('nom_magasin').notEmpty().withMessage('Nom du commerce requis'),
  body('adresse').notEmpty().withMessage('Adresse requise'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom_magasin, email, password, adresse, nb_tel } = req.body;

    const existingMerchant = await pool.query(
      'SELECT id_commercant FROM commercant WHERE mail = $1',
      [email]
    );

    if (existingMerchant.rows.length > 0) {
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO commercant (nom_magasin, mail, mdp, adresse, nb_tel)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_commercant, nom_magasin, mail, adresse`,
      [nom_magasin, email, hashedPassword, adresse, nb_tel || null]
    );

    const newMerchant = result.rows[0];
    const token = jwt.sign(
      { userId: newMerchant.id_commercant, userType: 'MERCHANT', email: newMerchant.mail },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: {
        id: newMerchant.id_commercant,
        nom_magasin: newMerchant.nom_magasin,
        email: newMerchant.mail,
        adresse: newMerchant.adresse,
        userType: 'MERCHANT',
      },
    });
  } catch (error) {
    console.error('Erreur inscription commerçant:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// ==========================================
// CONNEXION
// ==========================================
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, userType } = req.body;
    let user = null, userId = null, table = '';

    if (userType === 'MERCHANT') {
      const result = await pool.query('SELECT * FROM commercant WHERE mail = $1 AND actif = TRUE', [email]);
      if (result.rows.length > 0) {
        user = result.rows[0];
        userId = user.id_commercant;
        table = 'MERCHANT';
      }
    } else {
      const result = await pool.query('SELECT * FROM client WHERE mail = $1 AND actif = TRUE', [email]);
      if (result.rows.length > 0) {
        user = result.rows[0];
        userId = user.id_client;
        table = 'CLIENT';
      }
    }

    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const isPasswordValid = await bcrypt.compare(password, user.mdp);
    if (!isPasswordValid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const token = jwt.sign({ userId, userType: table, email: user.mail }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    let userData = table === 'CLIENT' ? {
      id: user.id_client,
      nom: user.nom,
      prenom: user.prenom,
      email: user.mail,
      points: user.points,
      userType: 'CLIENT',
    } : {
      id: user.id_commercant,
      nom_magasin: user.nom_magasin,
      email: user.mail,
      adresse: user.adresse,
      userType: 'MERCHANT',
    };

    res.json({ message: 'Connexion réussie', token, user: userData });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// ==========================================
// DÉCONNEXION CLIENT
// ==========================================
router.post('/logout/client', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(400).json({ error: 'Token manquant' });

    const token = authHeader.split(' ')[1];
    await redisClient.set(`blacklist:${token}`, 'true', { EX: 3600 * 24 }); // expire après 24h

    res.json({ message: 'Déconnexion client réussie ✅' });
  } catch (error) {
    console.error('Erreur déconnexion client:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});

// ==========================================
// DÉCONNEXION COMMERÇANT
// ==========================================
router.post('/logout/merchant', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(400).json({ error: 'Token manquant' });

    const token = authHeader.split(' ')[1];
    await redisClient.set(`blacklist:${token}`, 'true', { EX: 3600 * 24 }); // expire après 24h

    res.json({ message: 'Déconnexion commerçant réussie ✅' });
  } catch (error) {
    console.error('Erreur déconnexion commerçant:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});

module.exports = router;
