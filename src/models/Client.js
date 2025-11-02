const pool = require('../config/database');

class Client {
  static async findAll() {
    const result = await pool.query('SELECT * FROM Client ORDER BY Id_Client');
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM Client WHERE Id_Client = $1', [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query('SELECT * FROM Client WHERE Mail = $1', [email]);
    return result.rows[0];
  }

  static async create(data) {
    const { nom, prenom, nb_tel, mail, mdp } = data;
    const result = await pool.query(
      'INSERT INTO Client (Nom, Prenom, Nb_Tel, Mail, Mdp) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nom, prenom, nb_tel, mail, mdp]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { nom, prenom, nb_tel, mail } = data;
    const result = await pool.query(
      'UPDATE Client SET Nom = $1, Prenom = $2, Nb_Tel = $3, Mail = $4, Updated_At = CURRENT_TIMESTAMP WHERE Id_Client = $5 RETURNING *',
      [nom, prenom, nb_tel, mail, id]
    );
    return result.rows[0];
  }

  static async updatePoints(id, points) {
    const result = await pool.query(
      'UPDATE Client SET Points = Points + $1, Updated_At = CURRENT_TIMESTAMP WHERE Id_Client = $2 RETURNING *',
      [points, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM Client WHERE Id_Client = $1', [id]);
    return true;
  }
}

module.exports = Client;
