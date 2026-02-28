# Users Service — Documentation technique

> Microservice de gestion des profils utilisateurs pour **DANEBCYS**.  
> Profils (proxy Auth), adresses (PostgreSQL), favoris (proxy), notifications (proxy), commandes (proxy), abonnements (proxy).

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture du projet](#2-architecture-du-projet)
3. [Profils (via Auth Service)](#3-profils-via-auth-service)
4. [Adresses (PostgreSQL)](#4-adresses-postgresql)
5. [Favoris (proxy Favorites-service)](#5-favoris-proxy-favorites-service)
6. [Notifications (proxy Notifications-service)](#6-notifications-proxy-notifications-service)
7. [Commandes (proxy Orders Service)](#7-commandes-proxy-orders-service)
8. [Abonnements (proxy Subscriptions-service)](#8-abonnements-proxy-subscriptions-service)
9. [Administration](#9-administration)
10. [Schéma PostgreSQL](#10-schéma-postgresql)
11. [Endpoints API](#11-endpoints-api)
12. [Variables d'environnement](#12-variables-denvironnement)
13. [Installation et lancement](#13-installation-et-lancement)

---

## 1. Vue d'ensemble

| Fonctionnalité | Stockage | Description |
|----------------|----------|-------------|
| Profils | Auth Service (proxy) | Lecture/écriture via API interne |
| Adresses | PostgreSQL (`danebcys`) | CRUD avec adresse par défaut unique |
| Favoris | Favorites-service (proxy) | Ajout/suppression d'annonces favorites |
| Notifications | Notifications-service (proxy) | Notifications user avec read/unread |
| Commandes | Orders Service (proxy) | GET /me/orders proxy vers Orders |
| Abonnements | Subscriptions-service (proxy) | Premium, étudiant via premium_level |

**Port** : 3002  
**Base de données** : PostgreSQL (base partagée `danebcys`)

---

## 2. Architecture du projet

```
Users-service/
├── src/
│   ├── config/
│   │   ├── database.js          # Pool PostgreSQL (adresses)
│   │   └── env.js
│   ├── controllers/
│   │   ├── profile.controller.js
│   │   ├── address.controller.js
│   │   ├── favorite.controller.js
│   │   └── admin.controller.js
│   ├── middlewares/
│   │   ├── auth.js              # JWT validation via Auth Service
│   │   ├── admin.js             # requireAdmin
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── user.routes.js       # /api/v1/users
│   │   ├── admin.routes.js      # /api/v1/users/admin
│   │   └── internal.routes.js   # /internal
│   ├── services/
│   │   ├── authClient.js        # Client HTTP natif Auth Service
│   │   ├── ordersClient.js      # Client HTTP natif Orders Service
│   │   ├── favoritesProxy.js    # Proxy vers Favorites-service
│   │   ├── notificationsProxy.js
│   │   ├── subscriptionsProxy.js
│   │   ├── profile.service.js
│   │   └── address.service.js
│   ├── utils/
│   │   └── errors.js
│   └── app.js
├── public/
│   ├── index.html
│   └── test.js
├── init.sql                     # Table addresses
├── server.js
├── .env, .gitignore, package.json
└── DOCUMENTATION.md
```

---

## 3. Profils (via Auth Service)

Les données utilisateur core (username, email, phone, role, premium_level) sont stockées dans Auth Service. Users Service agit comme proxy via les routes internes d'Auth Service (`/internal/users/:id`).

---

## 4. Adresses (PostgreSQL)

Table `addresses` avec soft delete. Une seule adresse par défaut par utilisateur (partial unique index sur `(user_id) WHERE is_default = TRUE`).

---

## 5. Favoris (proxy Favorites-service)

Les favoris sont gérés par **Favorites-service** (port 3009). Users-service fait proxy vers les routes `/api/v1/favorites` et expose les routes internes pour les autres services.

---

## 6. Notifications (proxy Notifications-service)

Les notifications sont gérées par **Notifications-service** (port 3010). Users-service fait proxy vers les routes `/api/v1/notifications`.

---

## 7. Commandes (proxy Orders Service)

`GET /me/orders` est un proxy vers Orders Service `GET /internal/orders/user/:userId`.

---

## 8. Abonnements (proxy Subscriptions-service)

- `GET /me/subscription` : retourne mon abonnement (statut, dates)
- `POST /me/subscription` : demande un abonnement (proxy vers Subscriptions-service, validation admin requise)

---

## 9. Administration

Routes admin (`/api/v1/users/admin`) pour gestion des utilisateurs, rôles, abonnements. Nécessite rôle `admin`.

---

## 10. Schéma PostgreSQL

### Table `addresses`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID (PK) | gen_random_uuid() |
| user_id | UUID (FK) | → users.id (Auth) |
| street | VARCHAR(255) | Rue |
| city | VARCHAR(100) | Ville |
| postal_code | VARCHAR(20) | Code postal |
| country | VARCHAR(100) | Pays |
| is_default | BOOLEAN | Une seule par user (partial unique) |
| deleted | BOOLEAN | Soft delete |
| created_at, updated_at | TIMESTAMPTZ | Horodatage |

---

## 11. Endpoints API

### Routes utilisateur — `/api/v1/users` (auth requise)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /me | Profil complet |
| PUT | /me | Modifier profil |
| DELETE | /me | Supprimer compte |
| GET | /me/orders | Mes commandes (proxy) |
| GET | /me/notifications | Mes notifications |
| GET | /me/notifications/unread | Nombre non lues |
| PUT | /me/notifications/read-all | Tout marquer lu |
| PUT | /me/notifications/:id/read | Marquer une notification lue |
| GET | /me/subscription | Mon abonnement |
| POST | /me/subscription | Demander un abonnement |
| GET | /me/addresses | Mes adresses |
| POST | /me/addresses | Ajouter adresse |
| GET | /me/addresses/:id | Détail adresse |
| PUT | /me/addresses/:id | Modifier adresse |
| DELETE | /me/addresses/:id | Supprimer adresse |
| PUT | /me/addresses/:id/default | Adresse par défaut |
| GET | /me/favorites | Mes favoris |
| GET | /me/favorites/count | Nombre de favoris |
| GET | /me/favorites/:adId/check | Vérifier si favori |
| POST | /me/favorites/:adId | Ajouter favori |
| DELETE | /me/favorites/:adId | Retirer favori |
| GET | /:id | Profil public |

### Routes admin — `/api/v1/users/admin`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /roles | Liste des rôles |
| GET | /users | Liste des utilisateurs |
| GET | /users/:id | Détail utilisateur |
| PUT | /users/:id/role | Modifier rôle |
| DELETE | /users/:id | Soft delete |
| PUT | /users/:id/restore | Restaurer |
| GET | /subscriptions/pending | Demandes abonnements en attente |
| PUT | /subscriptions/:id/approve | Valider une demande (1 mois) |
| PUT | /subscriptions/:id/reject | Refuser une demande |

### Routes internes — `/internal`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /favorites/:userId/:adId | Vérifier favori (inter-service) |
| GET | /favorites/:userId/count | Compter favoris (inter-service) |

---

## 12. Variables d'environnement

| Variable | Description |
|----------|-------------|
| PORT | Port (défaut 3002) |
| PG_* | PostgreSQL (danebcys) |
| AUTH_SERVICE_URL | URL Auth Service |
| ORDERS_SERVICE_URL | URL Orders Service |
| FAVORITES_SERVICE_URL | URL Favorites-service (3009) |
| NOTIFICATIONS_SERVICE_URL | URL Notifications-service (3010) |
| SUBSCRIPTIONS_SERVICE_URL | URL Subscriptions-service (3008) |
| INTER_SERVICE_KEY | Clé inter-services |

---

## 13. Installation et lancement

```bash
cd Users-service
npm install
npm start
```

Nécessite : Auth Service (3001), Favorites-service (3009), Notifications-service (3010), Subscriptions-service (3008), Orders Service, PostgreSQL.
