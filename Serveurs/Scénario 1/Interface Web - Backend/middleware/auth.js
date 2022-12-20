const jwt = require("jsonwebtoken");
const jwtSecret = require("../keys.json").jwtSecret;
/**
 * Vérifie si le compte a le role "Admin"
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.adminAuth = (req, res, next) => {
    const { token } = req.cookies;

    if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err || decodedToken.role !== "Admin") {
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
 * Vérifie si le compte a le role "Basic"
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.basicAuth = (req, res, next) => {
    const { token } = req.cookies;

    if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err || decodedToken.role !== "Basic" || req.body.message !== undefined) {
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
 * Vérifie si le compte a le role "Audit"
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.auditAuth = (req, res, next) => {
    const { token } = req.cookies;

    if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err || decodedToken.role !== "Audit") {
                res.status(401).json({ message: "Non autorisé" });

            } else {
                next();
            }
        });

    } else {
        res.status(401).json({ message: "Non autorisé, jeton non existant" });
    }
};
