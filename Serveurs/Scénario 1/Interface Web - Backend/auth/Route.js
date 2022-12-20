const express = require("express");
const router = express.Router();
const { register, login, deleteUser, getUsers, getConsent, setConsent, deleteConsent, addData, deleteData, getLogByDate, getConsentAudit, getCountConsent, resetAll, prepareEmails, getData, changeData } = require("./Auth");
const { adminAuth, auditAuth, basicAuth } = require("../middleware/auth");

// Enregistre un client
router.route("/register").post(register, addData, setConsent);
// Logue un client
router.route("/login").post(login);

// Supprime le compte du client
router.route("/deleteUser").delete(basicAuth, deleteData, deleteUser, deleteConsent);
// Donne les consentements du client
router.route("/getConsent").get(basicAuth, getConsent);
// Modifie les consentements du client
router.route("/setConsent").put(basicAuth, setConsent);
// Donne les données liées aux consentements du client
router.route("/getData").get(basicAuth, getData);
// Modifie les données liées aux consentements du client
router.route("/changeData").put(basicAuth, changeData);

// Donne les logs pour une date
router.route("/getLogByDate").post(auditAuth, getLogByDate);
// Donne les consentements pour une date
router.route("/getConsentAudit").post(auditAuth, getConsentAudit);
// Donne la taille de la liste des consentements
router.route("/getCountConsent").post(auditAuth, getCountConsent);

// Donne tous les utilisateurs dans la base de données
router.route("/getUsers").get(adminAuth, getUsers);
// Réinitialise toutes les données du scénario pour le remttre à zéro
router.route("/resetAll").delete(adminAuth, resetAll);
// Amorce la requête pour recevoir les données des clients et simule l'envoi
router.route("/prepareEmails").post(adminAuth, prepareEmails);

module.exports = router;
