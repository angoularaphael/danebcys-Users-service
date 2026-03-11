# Users-service — API Endpoints Documentation

> Documentation des endpoints, routes, contrôleurs et formats requête/réponse pour le Users-service et les endpoints Auth liés (profil, compte, sessions).

---

## 1. Structure du projet

### Fichiers principaux

| Fichier | Rôle |
|---------|------|
| `src/app.js` | Point d'entrée Express, montage des routes |
| `src/routes/user.routes.js` | Routes utilisateur `/api/v1/users` |
| `src/routes/admin.routes.js` | Routes admin `/api/v1/users/admin` |
| `src/routes/internal.routes.js` | Routes internes `/internal` (X-Service-Key) |
| `src/controllers/profile.controller.js` | Profil, commandes, notifications, abonnements |
| `src/controllers/address.controller.js` | CRUD adresses |
| `src/controllers/favorite.controller.js` | Favoris (proxy) |
| `src/controllers/admin.controller.js` | Administration |
| `src/services/profile.service.js` | Logique profil (proxy Auth) |
| `src/services/address.service.js` | Logique adresses (PostgreSQL) |
| `src/services/authClient.js` | Client HTTP vers Auth-service |

### Base URL

- **Direct** : `http://localhost:3002/api/v1/users`
- **Via Auth BFF** : `http://localhost:3001/api/v1/users` (recommandé)

**Authentification** : `Authorization: Bearer <access_token>`

---

## 2. Liste des endpoints

### Routes utilisateur (`/api/v1/users`)

| Méthode | Route | Contrôleur | Description |
|---------|-------|------------|-------------|
| GET | /me | profile.controller | Profil complet |
| PUT | /me | profile.controller | Modifier profil |
| DELETE | /me | profile.controller | Supprimer compte |
| GET | /me/orders | profile.controller | Mes commandes (proxy Orders) |
| GET | /me/notifications | profile.controller | Mes notifications |
| GET | /me/notifications/unread | profile.controller | Nombre non lues |
| PUT | /me/notifications/read-all | profile.controller | Tout marquer lu |
| PUT | /me/notifications/:id/read | profile.controller | Marquer une lue |
| GET | /me/subscription | profile.controller | Mon abonnement |
| POST | /me/subscription | profile.controller | Demander abonnement |
| GET | /me/addresses | address.controller | Liste des adresses |
| POST | /me/addresses | address.controller | Ajouter adresse |
| GET | /me/addresses/:id | address.controller | Détail adresse |
| PUT | /me/addresses/:id | address.controller | Modifier adresse |
| DELETE | /me/addresses/:id | address.controller | Supprimer adresse |
| PUT | /me/addresses/:id/default | address.controller | Définir par défaut |
| GET | /me/favorites | favorite.controller | Mes favoris |
| GET | /me/favorites/count | favorite.controller | Nombre favoris |
| GET | /me/favorites/:adId/check | favorite.controller | Vérifier favori |
| POST | /me/favorites/:adId | favorite.controller | Ajouter favori |
| DELETE | /me/favorites/:adId | favorite.controller | Retirer favori |
| GET | /:id | profile.controller | Profil public |

### Routes admin (`/api/v1/users/admin`)

| Méthode | Route | Contrôleur | Description |
|---------|-------|------------|-------------|
| GET | /roles | admin.controller | Liste des rôles |
| GET | /users | admin.controller | Liste utilisateurs |
| GET | /users/:id | admin.controller | Détail utilisateur |
| PUT | /users/:id/role | admin.controller | Modifier rôle |
| DELETE | /users/:id | admin.controller | Soft delete |
| PUT | /users/:id/restore | admin.controller | Restaurer |
| GET | /subscriptions/pending | admin.controller | Abonnements en attente |
| PUT | /subscriptions/:id/approve | admin.controller | Approuver |
| PUT | /subscriptions/:id/reject | admin.controller | Refuser |

### Routes internes (`/internal`)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /favorites/:userId/count | Compter favoris (inter-service) |
| GET | /favorites/:userId/:adId | Vérifier favori (inter-service) |

---

## 3. Endpoints demandés — Formats détaillés

### 3.1 GET /me/addresses

**Description** : Liste toutes les adresses de l'utilisateur connecté (non supprimées).

**Requête**
```
GET /api/v1/users/me/addresses
Authorization: Bearer <access_token>
```

**Réponse 200**
```json
{
  "addresses": [
    {
      "id": "uuid",
      "label": "Domicile",
      "street": "12 rue Example",
      "city": "Paris",
      "zipCode": "75001",
      "country": "France",
      "isDefault": true,
      "createdAt": "2026-03-11T10:00:00.000Z",
      "updatedAt": "2026-03-11T10:00:00.000Z"
    }
  ]
}
```

**Erreurs** : 401 (non authentifié), 500 (erreur serveur)

---

### 3.2 POST /me/addresses

**Description** : Ajoute une nouvelle adresse.

**Requête**
```
POST /api/v1/users/me/addresses
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "label": "Domicile",           // optionnel
  "street": "12 rue Example",    // requis
  "city": "Paris",               // requis
  "zipCode": "75001",            // requis
  "country": "France",           // requis
  "isDefault": false             // optionnel, défaut false
}
```

**Réponse 201**
```json
{
  "address": {
    "id": "uuid",
    "label": "Domicile",
    "street": "12 rue Example",
    "city": "Paris",
    "zipCode": "75001",
    "country": "France",
    "isDefault": false,
    "createdAt": "2026-03-11T10:00:00.000Z",
    "updatedAt": "2026-03-11T10:00:00.000Z"
  }
}
```

**Erreurs** : 400 (street, city, zipCode, country manquants), 401, 500

---

### 3.3 PUT /me — Update user info

**Description** : Met à jour le profil utilisateur (username, firstName, lastName, phone, country). Les données sont stockées dans Auth-service.

**Requête**
```
PUT /api/v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "username": "nouveau_nom",
  "firstName": "Jean",
  "lastName": "Dupont",
  "phone": "+33612345678",
  "country": "France"
}
```

Tous les champs sont optionnels ; au moins un doit être fourni.

**Réponse 200**
```json
{
  "user": {
    "id": "uuid",
    "username": "nouveau_nom",
    "email": "user@example.com",
    "phone": "+33612345678",
    "firstName": "Jean",
    "lastName": "Dupont",
    "emailVerified": true,
    "phoneVerified": false,
    "role": "user",
    "premiumLevel": null,
    "studentProof": null,
    "country": "France",
    "deleted": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-03-11T10:00:00.000Z",
    "lastLoginAt": "2026-03-11T09:00:00.000Z"
  }
}
```

**Erreurs** : 400 (aucun champ à mettre à jour), 401, 404 (utilisateur non trouvé), 500

---

### 3.4 DELETE /me — Delete account

**Description** : Supprime le compte (soft delete). Appelle Auth-service `DELETE /internal/users/:id`.

**Requête**
```
DELETE /api/v1/users/me
Authorization: Bearer <access_token>
```

**Réponse 200**
```json
{
  "message": "Compte supprimé avec succès"
}
```

**Erreurs** : 401, 500

---

### 3.5 Change password — Non implémenté dans Users-service

**Statut** : Aucun endpoint « change password » (utilisateur authentifié modifiant son mot de passe) n'existe dans Users-service ni dans Auth-service.

**Alternative** : Auth-service propose le flux « forgot / reset » :

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/v1/auth/forgot-password | Demande de réinitialisation (envoi code par email) |
| POST | /api/v1/auth/reset-password | Réinitialisation avec code |

**POST /api/v1/auth/forgot-password**
```json
// Request
{ "email": "user@example.com" }

// Response 200
{ "message": "Si un compte existe avec cet email, un code de réinitialisation a été envoyé" }
```

**POST /api/v1/auth/reset-password**
```json
// Request
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "nouveauMotDePasse123"
}

// Response 200
{ "message": "Mot de passe réinitialisé avec succès" }
```

---

### 3.6 Close sessions — Partiellement implémenté

**Statut** : Aucun endpoint dédié « fermer toutes les sessions » n'existe. Seul le logout d’une session est disponible.

**POST /api/v1/auth/logout** (Auth-service)

Ferme la session courante (refresh token + blacklist du access token).

**Requête**
```
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

**Réponse 200**
```json
{
  "message": "Déconnexion réussie"
}
```

**Note** : En cas de réutilisation d’un refresh token (vol détecté), Auth-service révoque automatiquement toutes les sessions de l’utilisateur. Il n’y a pas d’endpoint public pour « révoquer toutes mes sessions » manuellement.

---

## 4. Schéma adresse (PostgreSQL)

| Colonne | Type | Description |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| user_id | UUID | FK → users.id (Auth) |
| label | VARCHAR(100) | Libellé optionnel |
| street | VARCHAR(255) | Rue (requis) |
| city | VARCHAR(100) | Ville (requis) |
| zip_code | VARCHAR(20) | Code postal (requis) |
| country | VARCHAR(100) | Pays (requis) |
| is_default | BOOLEAN | Une seule par user (contrainte unique partielle) |
| deleted | BOOLEAN | Soft delete |
| created_at, updated_at | TIMESTAMPTZ | Horodatage |

---

## 5. Résumé des endpoints recherchés

| Endpoint recherché | Statut | Emplacement |
|--------------------|--------|-------------|
| GET /me/addresses | ✅ Implémenté | Users-service |
| POST /me/addresses | ✅ Implémenté | Users-service |
| Change password | ❌ Non implémenté | — (reset-password uniquement dans Auth) |
| Close sessions | ⚠️ Partiel (logout 1 session) | Auth-service POST /logout |
| Delete account | ✅ Implémenté | Users-service DELETE /me |
| Update user info | ✅ Implémenté | Users-service PUT /me |
