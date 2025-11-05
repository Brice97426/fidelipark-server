const bcrypt = require('bcrypt');
const pool = require('../src/config/database');

(async () => {
  try {
    console.log('Mise à jour des mots de passe de test...');
    
    const plainPassword = 'password123';
    const hash = await bcrypt.hash(plainPassword, 10);
    
    console.log('Hash généré:', hash);

    // Clients
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
      console.log('✅ Client mis à jour:', mail);
    }

    // Commerçants
    const merchants = [
      'contact@boutique-mode.re',
      'resto@lecreole.re'
    ];

    for (const mail of merchants) {
      await pool.query(
        'UPDATE commercant SET mdp = $1, actif = TRUE WHERE mail = $2',
        [hash, mail]
      );
      console.log('✅ Commerçant mis à jour:', mail);
    }

    // Admin
    await pool.query(
      'UPDATE administrateur SET mdp = $1, actif = TRUE WHERE mail = $2',
      [hash, 'admin@fidelipark.re']
    );
    console.log('✅ Administrateur mis à jour: admin@fidelipark.re');

    console.log('\n🎉 Tous les mots de passe ont été mis à jour!');
    console.log('Mot de passe pour tous les comptes de test: password123\n');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
})();
