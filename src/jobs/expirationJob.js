// Tâche planifiée : expiration des abonnements et notifications
const subscriptionService = require('../services/subscription.service');

// Intervalle entre deux vérifications d'expiration d'abonnements (24 heures).
const INTERVAL_MS = 24 * 60 * 60 * 1000;

// Identifiant du timer setInterval ; null si le job n'est pas démarré.
let intervalId = null;

// Démarre le job planifié de vérification des échéances d'abonnements.
// Exécute immédiatement une première passe, puis toutes les 24 h.
function start() {
  if (intervalId) return;

  // Exécute une passe de vérification des abonnements expirés ou proches de l'échéance.
  const run = async () => {
    try {
      await subscriptionService.runExpirationChecks();
      console.log('[expirationJob] Vérification des échéances effectuée');
    } catch (err) {
      console.error('[expirationJob]', err.message);
    }
  };

  run();
  intervalId = setInterval(run, INTERVAL_MS);
  intervalId.unref?.();
  console.log('[expirationJob] Démarré (toutes les 24h)');
}

// Arrête le job planifié et libère le timer.
function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[expirationJob] Arrêté');
  }
}

module.exports = { start, stop };
