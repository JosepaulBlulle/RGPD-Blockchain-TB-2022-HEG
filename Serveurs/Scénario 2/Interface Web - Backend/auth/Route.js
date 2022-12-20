const express = require("express");
const router = express.Router();
const { login, addAuthorization, getOrder, addOrder, changeDeliverer, changeDelivererAuthorization, getData, setDelivered, getLogByDate, getAuthorizationAudit, resetAll, deleteOldAuthorization, getCountAuthorization } = require("./Auth");
const { clientAuth, delivererAuth, auditAuth, adminAuth } = require("../middleware/auth");

// Logue un utilisateur
router.route("/login").post(login);

// Demande toutes les commandes d'un client
router.route("/order/client").get(clientAuth, getOrder);
// Ajoute une commande d'un client
router.route("/order/client").post(clientAuth, addOrder, addAuthorization);

// Demande toutes les commandes d'un livreur
router.route("/order/deliverer").get(delivererAuth, getOrder);
// Change le livreur d'un commande
router.route("/order/deliverer").put(delivererAuth, changeDeliverer, changeDelivererAuthorization);
// Met à livrée une commande d'un livreur
router.route("/order/delivered").put(delivererAuth, setDelivered);
// Demande les données d'un client pour une commande d'un livreur
router.route("/client/data").post(delivererAuth, getData);

router.route("/getLogByDate").post(auditAuth, getLogByDate);
router.route("/getAuthorizationAudit").post(auditAuth, getAuthorizationAudit);
router.route("/getCountAuthorization").post(auditAuth, getCountAuthorization);

// Remet à zéro le scénario
router.route("/resetAll").delete(adminAuth, resetAll);
// Simulation de la suppression des autorisations dépassées dans le contrat intelligent
router.route("/deleteOldAuthorization").delete(adminAuth, deleteOldAuthorization);

module.exports = router;
