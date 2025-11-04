// scripts/update-test-passwords.js
const bcrypt = require('bcrypt');
const pool = require('../src/config/database'); // ajuste le chemin si besoin

(async () => {
  try {
    const plain = 'password123';
    const hash = await bcrypt.hash(plain, 10);
    console.log('Hash généré :', hash);

    // Mettre à jour tous les clients de test listés
    const clients = [
      'jean.dupont@email.com',
      'sophie.martin@email.com',
      'luc.bernard@email.com',
      'marie.leroy@email.com'
    ];

    for (const mail of clients) {
      await pool.query(
        'UPDATE client SET mdp = $1, actif = TRUE WHERE mail = $2',
        [hash, mail]
      );
      console.log('Client mis à jour :', mail);
    }

    // Mettre à jour les commerçants listés
    const merchants = [
      'contact@boutique-mode.re',
      'resto@lecreole.re'
    ];

    for (const mail of merchants) {
      await pool.query(
        'UPDATE commercant SET mdp = $1, actif = TRUE WHERE mail = $2',
        [hash, mail]
      );
      console.log('Commerçant mis à jour :', mail);
    }

    console.log('Mise à jour terminée.');
    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
})();
