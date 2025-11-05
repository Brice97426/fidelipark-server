// src/routes/merchant.routes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticateToken);

// ==========================================
// RÉCUPÉRER TOUS LES COMMERÇANTS
// ==========================================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id_commercant,
        nom_magasin,
        mail,
        adresse,
        nb_tel,
        actif,
        latitude,
        longitude,
        horaires,
        created_at
      FROM commercant
      WHERE actif = TRUE
      ORDER BY nom_magasin ASC
    `);

        // Vérifier si chaque commerçant a des offres actives
        const merchantsWithOffers = await Promise.all(
            result.rows.map(async (merchant) => {
                const offersResult = await pool.query(
                    `SELECT COUNT(*) as count 
           FROM bon_reduc 
           WHERE id_commercant = $1 
           AND actif = TRUE 
           AND date_expiration > NOW()`,
                    [merchant.id_commercant]
                );

                return {
                    ...merchant,
                    has_offers: parseInt(offersResult.rows[0].count) > 0,
                };
            })
        );

        res.json(merchantsWithOffers);
    } catch (error) {
        console.error('Erreur récupération commerçants:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// RÉCUPÉRER UN COMMERÇANT PAR ID
// ==========================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
        id_commercant,
        nom_magasin,
        mail,
        adresse,
        nb_tel,
        actif,
        latitude,
        longitude,
        horaires,
        created_at
      FROM commercant
      WHERE id_commercant = $1 AND actif = TRUE`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Commerçant non trouvé' });
        }

        // Récupérer les offres actives du commerçant
        const offersResult = await pool.query(
            `SELECT * FROM bon_reduc 
       WHERE id_commercant = $1 
       AND actif = TRUE 
       AND date_expiration > NOW()
       ORDER BY created_at DESC`,
            [id]
        );

        const merchant = {
            ...result.rows[0],
            offers: offersResult.rows,
        };

        res.json(merchant);
    } catch (error) {
        console.error('Erreur récupération commerçant:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// METTRE À JOUR LE PROFIL DU COMMERÇANT
// ==========================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nom_magasin, adresse, nb_tel, horaires, latitude, longitude } = req.body;

        // Vérifier que le commerçant connecté met à jour son propre profil
        if (req.user.userType !== 'MERCHANT' || req.user.userId !== parseInt(id)) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const result = await pool.query(
            `UPDATE commercant 
       SET nom_magasin = $1, 
           adresse = $2, 
           nb_tel = $3,
           horaires = $4,
           latitude = $5,
           longitude = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id_commercant = $7
       RETURNING *`,
            [nom_magasin, adresse, nb_tel, horaires, latitude, longitude, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Commerçant non trouvé' });
        }

        res.json({
            message: 'Profil mis à jour avec succès',
            merchant: result.rows[0],
        });
    } catch (error) {
        console.error('Erreur mise à jour commerçant:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==========================================
// STATISTIQUES DU COMMERÇANT
// ==========================================
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier que le commerçant connecté accède à ses propres stats
        if (req.user.userType !== 'MERCHANT' || req.user.userId !== parseInt(id)) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        // Nombre total d'offres
        const offersCountResult = await pool.query(
            'SELECT COUNT(*) as count FROM bon_reduc WHERE id_commercant = $1',
            [id]
        );

        // Nombre d'offres actives
        const activeOffersResult = await pool.query(
            `SELECT COUNT(*) as count FROM bon_reduc 
       WHERE id_commercant = $1 AND actif = TRUE AND date_expiration > NOW()`,
            [id]
        );

        // Nombre d'utilisations d'offres
        const usageResult = await pool.query(
            `SELECT COUNT(*) as count FROM client_bon cb
       JOIN bon_reduc br ON cb.id_bon = br.id_bon
       WHERE br.id_commercant = $1 AND cb.utilise = TRUE`,
            [id]
        );

        res.json({
            total_offers: parseInt(offersCountResult.rows[0].count),
            active_offers: parseInt(activeOffersResult.rows[0].count),
            total_usage: parseInt(usageResult.rows[0].count),
        });
    } catch (error) {
        console.error('Erreur récupération statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;