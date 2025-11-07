# 🚀 FidéliPark - Backend API

Backend API pour l'application FidéliPark - Système de fidélisation du centre-ville de Saint-Pierre, La Réunion.

## 👥 Équipe

- **Brice BERNARDIN** - b.bernardin@rt-iut.re
- **Killian DENA** - k.dena@rt-iut.re

BUT RT3 - Année 2025-2026

## 🏗️ Architecture Technique

### Services Requis
- **Node.js**: v18+ (Runtime JavaScript)
- **PostgreSQL**: v14+ (Base de données relationnelle)
- **Redis**: v7+ (Cache et sessions)
- **PM2**: Gestionnaire de processus (production)

### Stack Technologique
- **Framework**: Express.js v5.1.0
- **Base de données**: PostgreSQL (pg v8.16.3)
- **Cache/Sessions**: Redis v5.9.0 + connect-redis v9.0.0
- **Authentification**: JWT (jsonwebtoken v9.0.2) + bcrypt v6.0.0
- **Sécurité**: Helmet v8.1.0, express-rate-limit v8.2.1, express-validator v7.3.0
- **Upload**: Multer v2.0.2
- **QR Code**: qrcode v1.5.4, jsqr v1.4.0
- **OCR**: Tesseract.js v6.0.1
- **Image**: Sharp v0.34.4
- **Logging**: Winston v3.18.3, Morgan v1.10.1
- **HTTP Client**: Axios v1.13.1 (pour API PayByPhone)

## 📂 Structure du Projet

```
fidelipark-server/
├── src/
│   ├── config/              # Configuration
│   │   ├── database.js      # Connexion PostgreSQL
│   │   └── redis.js         # Connexion Redis
│   ├── models/              # Modèles de données
│   │   └── Client.js        # Modèle Client
│   ├── routes/              # Routes API
│   │   └── auth.routes.js   # Routes authentification
│   ├── middlewares/         # Middlewares Express
│   ├── services/            # Services métier
│   ├── utils/               # Utilitaires
│   └── server.js            # Point d'entrée serveur
├── scripts/                 # Scripts utilitaires
│   └── update-test-passwords.js
├── uploads/                 # Fichiers uploadés
├── logs/                    # Logs PM2
├── .env                     # Variables d'environnement
├── .gitignore
├── package.json
├── ecosystem.config.js      # Configuration PM2
└── README.md
```

## 📦 Installation

### Prérequis
```bash
# Node.js et npm
node --version  # v18+
npm --version

# PostgreSQL
psql --version  # v14+

# Redis
redis-cli --version  # v7+
```

### Installation des dépendances
```bash
npm install
```

### Configuration de la base de données

1. **Créer la base de données PostgreSQL**
```sql
CREATE DATABASE fidelipark;
```

2. **Créer les tables** (voir modèle conceptuel dans la documentation)
```sql
-- Table Client
CREATE TABLE client (
    id_client SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    nb_tel VARCHAR(20),
    mail VARCHAR(255) UNIQUE NOT NULL,
    mdp TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Voiture
CREATE TABLE voiture (
    id_voiture SERIAL PRIMARY KEY,
    plaque VARCHAR(20) UNIQUE NOT NULL,
    id_client INTEGER REFERENCES client(id_client) ON DELETE CASCADE
);

-- Table Commercant
CREATE TABLE commercant (
    id_commercant SERIAL PRIMARY KEY,
    nom_magasin VARCHAR(255) NOT NULL,
    mail VARCHAR(255) UNIQUE NOT NULL,
    mdp TEXT NOT NULL,
    nb_tel VARCHAR(20),
    adresse TEXT NOT NULL,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Bon_Reduc
CREATE TABLE bon_reduc (
    id_bon SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    valeur DECIMAL(10,2) NOT NULL,
    date_expiration DATE NOT NULL,
    id_commercant INTEGER REFERENCES commercant(id_commercant) ON DELETE CASCADE
);

-- Table Client_Bon (association)
CREATE TABLE client_bon (
    id_client INTEGER REFERENCES client(id_client) ON DELETE CASCADE,
    id_bon INTEGER REFERENCES bon_reduc(id_bon) ON DELETE CASCADE,
    date_obtention TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    utilise BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id_client, id_bon)
);

-- Table Administrateur
CREATE TABLE administrateur (
    id_admin SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    mail VARCHAR(255) UNIQUE NOT NULL,
    mdp TEXT NOT NULL,
    actif BOOLEAN DEFAULT TRUE
);
```

### Configuration de l'environnement

Créer un fichier `.env` à la racine :
```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fidelipark
DB_USER=votre_user
DB_PASSWORD=votre_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=votre_secret_jwt_super_securise_a_changer
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:19006

# PayByPhone API
PAYBYPHONE_API_URL=https://api.paybyphone.com
PAYBYPHONE_API_KEY=votre_cle_api
```

## 🚀 Démarrage

### Mode développement (avec Nodemon)
```bash
npm run dev
```

### Mode production
```bash
npm start
```

### Avec PM2 (recommandé pour production)
```bash
# Démarrer
npm run pm2:start

# Arrêter
npm run pm2:stop

# Redémarrer
npm run pm2:restart

# Voir les logs
npm run pm2:logs

# Monitoring
npm run pm2:monit
```

## 🧪 Tests

### Test de santé de l'API
```bash
curl http://localhost:3000/
curl http://localhost:3000/health
```

### Test PostgreSQL
```bash
curl http://localhost:3000/test/db
```

### Test Redis
```bash
curl http://localhost:3000/test/redis
```

## 📡 API Endpoints

### Authentification

#### Inscription Client
```http
POST /api/auth/register/client
Content-Type: application/json

{
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@email.com",
  "password": "password123",
  "nb_tel": "0692123456"
}
```

#### Inscription Commerçant
```http
POST /api/auth/register/merchant
Content-Type: application/json

{
  "nom_magasin": "Ma Boutique",
  "email": "contact@boutique.re",
  "password": "password123",
  "adresse": "123 Rue du Commerce, Saint-Pierre",
  "nb_tel": "0262987654"
}
```

#### Connexion
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "jean.dupont@email.com",
  "password": "password123",
  "userType": "CLIENT"  // ou "MERCHANT"
}
```

Réponse :
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@email.com",
    "points": 0,
    "userType": "CLIENT"
  }
}
```

## 🔒 Sécurité

### Fonctionnalités de sécurité implémentées
- ✅ Hashing des mots de passe (bcrypt avec salt de 10)
- ✅ JWT pour l'authentification
- ✅ Validation des données (express-validator)
- ✅ Protection des headers (Helmet)
- ✅ Rate limiting
- ✅ CORS configuré
- ✅ Sessions sécurisées avec Redis
- ✅ Chiffrement des données sensibles (AES-256)
- ✅ Protection CSRF
- ✅ Logs sécurisés (Winston)

### RGPD
- Consentement explicite lors de l'inscription
- Droit d'accès, rectification, suppression des données
- Durée de conservation : 3 ans après dernière activité
- Anonymisation des données de plaques après vérification

## 📚 Modèle de Données

Voir le fichier `Modèle Conceptuel de Données (Base de données)` dans la documentation pour le schéma complet.

### Relations principales
- **Client** ↔ **Voiture** (1:N)
- **Commerçant** ↔ **Bon_Reduc** (1:N)
- **Client** ↔ **Bon_Reduc** (N:N via Client_Bon)

## 🔗 Intégration PayByPhone

L'API FidéliPark communique avec l'API PayByPhone pour vérifier les réservations de parking :

```javascript
// Exemple de vérification
GET /api/paybyphone/verify
{
  "plaque": "AB-123-CD",
  "email": "client@email.com"
}

// Réponse PayByPhone
{
  "valid": true,
  "startTime": "2025-11-07T10:00:00Z",
  "endTime": "2025-11-07T12:00:00Z",
  "plate": "AB-123-CD"
}
```

## 📊 Monitoring et Logs

### Logs avec Winston
```bash
# Logs dans le terminal (dev)
npm run dev

# Logs PM2 (production)
npm run pm2:logs
```

### Fichiers de logs (production)
- `logs/out.log` - Logs standards
- `logs/err.log` - Logs d'erreurs
- `logs/combined.log` - Tous les logs

## 🐛 Debugging

### Script de mise à jour des mots de passe de test
```bash
node scripts/update-test-passwords.js
```

### Comptes de test
**Clients :**
- jean.dupont@email.com / password123
- sophie.martin@email.com / password123

**Commerçants :**
- contact@boutique-mode.re / password123
- resto@lecreole.re / password123

## 📞 Support

- **Email**: b.bernardin@rt-iut.re, k.dena@rt-iut.re
- **Issues**: Créer une issue sur le dépôt Git

## 📄 Licence

Projet académique - BUT RT3 2025-2026  
IUT de La Réunion

---

**Fait avec ❤️ à La Réunion**

