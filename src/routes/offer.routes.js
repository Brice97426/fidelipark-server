// src/routes/offer.routes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);

// Validation pour création/modification d'offre
const validateOffer = [
  body('description').notEmpty().withMessage('Description requise'),
  body('valeur').isNumeric().withMessage('La valeur doit être un nombre'),
  body('type_valeur').isIn(['montant', 'pourcentage']).withMessage('Type invalide'),
  body('points_requis').isInt({ min: 0 }).withMessage('Points requis invalides'),
  body('date_expiration').isISO8601().withMessage('Date invalide'),
];

// ==========================================
// RÉCUPÉRER TOUTES LES OFFRES DU COMMERÇANT CONNECTÉ
// ==========================================
router.get('/', async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un commerçant
    if (req.user.userType !== 'MERCHANT' && req.user.userType !== 'COMMERCANT') {
      return res.status(403).json({ error: 'Accès réservé aux commerçants' });
    }

    const result = await pool.query(
      `SELECT * FROM bon_reduc 
       WHERE id_commercant = $1 
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération offres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==========================================
// RÉCUPÉRER TOUTES LES OFFRES DISPONIBLES (CLIENTS)
// ==========================================
router.get('/available', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT br.*, c.nom_magasin, c.adresse, c.latitude, c.longitude
       FROM bon_reduc br
       JOIN commercant c ON br.id_commercant = c.id_commercant
       WHERE br.actif = TRUE 
       AND br.date_expiration > NOW()
       AND c.actif = TRUE
       ORDER BY br.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération offres disponibles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==========================================
// CRÉER UNE NOUVELLE OFFRE
// ==========================================
router.post('/', validateOffer, async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Vérifier que l'utilisateur est un commerçant
    if (req.user.userType !== 'MERCHANT' && req.user.userType !== 'COMMERCANT') {
      return res.status(403).json({ error: 'Accès réservé aux commerçants' });
    }

    const { description, valeur, type_valeur, points_requis, date_expiration } = req.body;

    const result = await pool.query(
      `INSERT INTO bon_reduc 
       (description, valeur, type_valeur, points_requis, date_expiration, id_commercant, actif) 
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) 
       RETURNING *`,
      [description, valeur, type_valeur, points_requis, date_expiration, req.user.userId]
    );

    res.status(201).json({
      message: 'Offre créée avec succès',
      offer: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur création offre:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'offre' });
  }
});

// ==========================================
// METTRE À JOUR UNE OFFRE
// ==========================================
router.put('/:id', validateOffer, async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { description, valeur, type_valeur, points_requis, date_expiration } = req.body;

    // Vérifier que l'utilisateur est un commerçant
    if (req.user.userType !== 'MERCHANT' && req.user.userType !== 'COMMERCANT') {
      return res.status(403).json({ error: 'Accès réservé aux commerçants' });
    }

    // Vérifier que l'offre appartient bien au commerçant connecté
    const checkResult = await pool.query(
      'SELECT id_commercant FROM bon_reduc WHERE id_bon = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée' });
    }

    if (checkResult.rows[0].id_commercant !== req.user.userId) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres offres' });
    }

    // Mise à jour
    const result = await pool.query(
      `UPDATE bon_reduc 
       SET description = $1, 
           valeur = $2, 
           type_valeur = $3,
           points_requis = $4,
           date_expiration = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id_bon = $6
       RETURNING *`,
      [description, valeur, type_valeur, points_requis, date_expiration, id]
    );

    res.json({
      message: 'Offre mise à jour avec succès',
      offer: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur mise à jour offre:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'offre' });
  }
});

// ==========================================
// SUPPRIMER UNE OFFRE (soft delete)
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur est un commerçant
    if (req.user.userType !== 'MERCHANT' && req.user.userType !== 'COMMERCANT') {
      return res.status(403).json({ error: 'Accès réservé aux commerçants' });
    }

    // Vérifier que l'offre appartient bien au commerçant connecté
    const checkResult = await pool.query(
      'SELECT id_commercant FROM bon_reduc WHERE id_bon = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée' });
    }

    if (checkResult.rows[0].id_commercant !== req.user.userId) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres offres' });
    }

    // Soft delete : on désactive l'offre au lieu de la supprimer
    await pool.query(
      `UPDATE bon_reduc 
       SET actif = FALSE, updated_at = CURRENT_TIMESTAMP 
       WHERE id_bon = $1`,
      [id]
    );

    res.json({ message: 'Offre supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression offre:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'offre' });
  }
});

// ==========================================
// RÉCUPÉRER LES OFFRES D'UN COMMERÇANT SPÉCIFIQUE
// ==========================================
router.get('/merchant/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;

    const result = await pool.query(
      `SELECT br.*, c.nom_magasin 
       FROM bon_reduc br
       JOIN commercant c ON br.id_commercant = c.id_commercant
       WHERE br.id_commercant = $1 
       AND br.actif = TRUE 
       AND br.date_expiration > NOW()
       ORDER BY br.created_at DESC`,
      [merchantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération offres du commerçant:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==========================================
// ACTIVER/DÉSACTIVER UNE OFFRE
// ==========================================
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur est un commerçant
    if (req.user.userType !== 'MERCHANT' && req.user.userType !== 'COMMERCANT') {
      return res.status(403).json({ error: 'Accès réservé aux commerçants' });
    }

    // Vérifier que l'offre appartient bien au commerçant connecté
    const checkResult = await pool.query(
      'SELECT id_commercant, actif FROM bon_reduc WHERE id_bon = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée' });
    }

    if (checkResult.rows[0].id_commercant !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Inverser le statut actif
    const newStatus = !checkResult.rows[0].actif;

    const result = await pool.query(
      `UPDATE bon_reduc 
       SET actif = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id_bon = $2
       RETURNING *`,
      [newStatus, id]
    );

    res.json({
      message: `Offre ${newStatus ? 'activée' : 'désactivée'} avec succès`,
      offer: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur toggle offre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
