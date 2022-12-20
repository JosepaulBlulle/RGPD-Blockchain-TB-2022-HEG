const jwt = require("jsonwebtoken");
const jwtSecret = require("../keys.json").jwtSecret;
//const jwtSecret = "8055ba31b4d8dbfd0f8b4b36f5cb1d8ac0297c5b28170bdf7aed95ddcbe46b14e75a9f";

/**
 * Vérifie si le compte a le role de client
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.clientAuth = (req, res, next) => {
    const { token } = req.cookies;

    if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err || decodedToken.role !== "client") {
                res.status(401).json({ message: "Non autorisé" });

            } else {
                next();
            }
        });

    } else {
        res.status(401).json({ message: "Non autorisé, jeton non existant" });
    }
};

/**
 * Vérifie si le compte a le role de livreur
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.delivererAuth = (req, res, next) => {
    const { token } = req.cookies;

    if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err || decodedToken.role !== "deliverer") {
                res.status(401).json({ message: "Non autorisé" });

            } else {
                next();
            }
        });

    } else {
        res.status(401).json({ message: "Non autorisé, jeton non existant" });
    }
};

/**
 * Vérifie si le compte a le role d'audit
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.auditAuth = (req, res, next) => {
    const { token } = req.cookies;

    if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err || decodedToken.role !== "audit") {
                res.status(401).json({ message: "Non autorisé" });

            } else {
                next();
            }
        });

    } else {
        res.status(401).json({ message: "Non autorisé, jeton non existant" });
    }
};

/**
 * Vérifie si le compte a le role d'admin
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.adminAuth = (req, res, next) => {
    const { token } = req.cookies;

    if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err || decodedToken.role !== "admin") {
                res.status(401).json({ message: "Non autorisé" });

            } else {
                next();
            }
        });

    } else {
        res.status(401).json({ message: "Non autorisé, jeton non existant" });
    }
};
