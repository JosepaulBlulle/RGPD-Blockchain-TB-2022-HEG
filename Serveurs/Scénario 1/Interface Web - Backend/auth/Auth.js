const mysqlConf = require("../db.js").mysql_pool;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const connectWeb3 = require("../web3/connectWeb3");
const URL_STORAGE = "http://127.0.0.1:8080";
const keys = require("../keys.json");

/**
 * Enregistre un compte avec les informations données
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.register = (req, res, next) => {
    const { username, password, email, gender } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: "Les champs obligatoires doivent être remplis" });

    } else if (password.length < 6) {
        return res.status(400).json({ message: "Le mot de passe a moins de 6 caractères" });
    }

    bcrypt.hash(password, 10).then(hash => {
        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({ message: "L'utilisateur n'a pas été créé" });

            } else {
                try {
                    connection.query(`INSERT INTO user (username, password) VALUES ("${username}", "${hash}"); SELECT id, role FROM user WHERE id = LAST_INSERT_ID();`, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                message: "L'utilisateur n'a pas été créé",
                                //error: err.message,
                            });

                        } else {
                            res.user = { id: result[1][0].id, role: result[1][0].role };
                            const maxAge = 3 * 60 * 60;
                            const token = jwt.sign(
                                { id: result[1][0].id, username: username, role: result[1][0].role },
                                keys.jwtSecret,
                                { expiresIn: maxAge, } // 3 heures en secondes
                            );
                            res.cookie("token", token, {
                                httpOnly: true,
                                maxAge: maxAge * 1000, // 3 heures en millisecondes
                                secure: false,
                                sameSite: 'None',
                            });
                            next();
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });
    });
};

/**
 * Logue un utilisteur
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.login = async (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Nom d'utilisateur ou mot de passse non indiqué" });
    }

    mysqlConf.getConnection((err, connection) => {
        if (err) {
            res.status(400).json({
                message: "Une erreur s'est produite",
                //error: err.message,
            });

        } else {
            try {
                connection.query(`SELECT id, password, role FROM user WHERE username = "${username}";`, (err, result) => {
                    if (err || result.length == 0) {
                        res.status(401).json({
                            message: "Login non réussi",
                            error: "Nom d'utlisateur non trouvé",
                        });

                    } else {
                        bcrypt.compare(password, result[0].password).then(match => {
                            if (match) {
                                const maxAge = 3 * 60 * 60;
                                const token = jwt.sign(
                                    { id: result[0].id, username, role: result[0].role },
                                    keys.jwtSecret,
                                    { expiresIn: maxAge } // 3 heures en secondes
                                );
                                res.cookie("token", token, {
                                    httpOnly: true,
                                    maxAge: maxAge * 1000, // 3 heures en millisecondes
                                });
                                res.status(201).json({ role: result[0].role });

                            } else {
                                res.status(400).json({ message: "Login non réussi" });
                            }
                        });
                    }
                });

            } finally {
                connection.release();
            }
        }
    });
};

/**
 * Supprime les informations de connexion d'un utilisateur de la base de données
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.deleteUser = (req, res, next) => {
    const { token } = req.cookies;
    const user = res.user;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (user == undefined && err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            mysqlConf.getConnection((err, connection) => {
                if (err) {
                    res.status(400).json({
                        message: "Une erreur s'est produite",
                        //error: err.message,
                    });

                } else {
                    try {
                        connection.query(`DELETE FROM user WHERE id = ${(user!=undefined?user.id:decodedToken.id)};`, (err, result) => {
                            if (err) {
                                res.status(400).json({
                                    message: "Une erreur s'est produite",
                                    //error: err.message,
                                });

                            } else if (result.affectedRows === 0) {
                                res.status(400).json({
                                    message: "Une erreur s'est produite",
                                    error: "L'utilisateur n'a pas été trouvé",
                                });

                            } else {
                                next();
                            }
                        });

                    } finally {
                        connection.release();
                    }
                }
            });
        }
    });
};

/**
 * Donne tous les utlisateurs
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getUsers = (req, res, next) => {
    mysqlConf.getConnection((err, connection) => {
        if (err) {
            res.status(401).json({
                message: "Non réussi",
                //error: err.message,
            });

        } else {
            try {
                connection.query(`SELECT id, username, role FROM user;`, (err, result) => {
                    if (err) {
                        res.status(400).json({ error: err.error, message: err.message });

                    } else {
                        res.status(200).json({ user: result });
                    }
                });

            } finally {
                connection.release();
            }
        }
    });
};

/**
 * Donne les consentements d'un utlisateur
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getConsent = (req, res, next) => {
    const { token } = req.cookies;
    const { timestamp, id } = req.body;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            connectWeb3.getConsent(decodedToken.id).then(consentUser => {
                res.status(200).json(consentUser);
            });
        }
    });
}

/**
 * Demande au contrat intelligent de transmettre tous les consentements d'une date donnée
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getConsentAudit = (req, res, next) => {
    const { token } = req.cookies;
    const { page, timestamp } = req.body;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else if (!isNaN(page) && page > 0 && (timestamp == null || typeof timestamp == "number")) {
            const from = (page - 1) * 100;
            const to = page * 100 - 1;
            connectWeb3.getAllConsent(from, to, timestamp).then(listConsent => {
                if (listConsent.list != undefined) {
                    res.status(200).json(listConsent);

                } else {
                    res.status(400).json({ message: "Erreur sur le contrat intelligent" });
                }
            });

        } else {
            res.status(400).json({ message: "L'identifiant et/ou le temps ne sont pas corrects" });
        }
    });
}

/**
 * Donne la taille de la liste des consentements
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getCountConsent = (req, res, next) => {
    const { token } = req.cookies;
    const { timestamp } = req.body;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            connectWeb3.getSize(timestamp).then(data => {
                if (data.size != undefined) {
                    res.status(200).json(data);

                } else {
                    res.status(400).json({ message: data.message });
                }

            });
        }
    });
};

/**
 * Modifie les consentements d'un utlisateur
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.setConsent = (req, res, next) => {
    const { token } = req.cookies;
    const { emailConsent, usernameConsent, genderConsent, timestamp } = req.body;
    const user = res.user;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err && user == undefined) {
            res.status(401).json({ message: "Non autorisé" });

        } else if (emailConsent == undefined || usernameConsent == undefined || genderConsent == undefined || timestamp == undefined || !Number.isInteger(timestamp)) {
            deleteUser();
            deleteData();
            if (timestamp && !Number.isInteger(timestamp)) {
                res.status(400).json({ message: "Une erreur sur le champ de la date" });

            } else if (user != undefined) {
                res.status(400).json({ message: "Une erreur sur les champs s'est produite" });

            } else {
                res.status(400).json({ message: "Tous les champs doivent être indiqués" });
            }
            delete res.user;

        } else {
            connectWeb3.setConsent((user==undefined?decodedToken.id:user.id), emailConsent, usernameConsent, genderConsent, timestamp / 1000).then(_=> {
                res.status(200).json({ role: (user==undefined?decodedToken.role:user.role) });
                delete res.user;
            });
        }
    });
};

/**
 * Supprime les consentements d'un utlisateur
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.deleteConsent = (req, res, next) => {
    const { token } = req.cookies;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            connectWeb3.deleteConsent(decodedToken.id).then(_=> {
                res.status(204).send();
            });
        }
    });
}

/**
 * Enregistre les données liés aux consentements d'un utilisateur
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.addData = (req, res, next) => {
    const { token } = req.cookies;
    const { email, username, gender } = req.body;
    const user = res.user;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err && user == undefined) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            fetch(URL_STORAGE + '/data', {
                method: 'POST',
                body: JSON.stringify({ id: (user==undefined?decodedToken.id:user.id), email: email, username: username, gender: gender }),
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_ADD,
                }

            }).then(result => {
                if (result.status == 400) {
                    throw new Error();
                }
                next();

            }).catch(err => {
                mysqlConf.getConnection((err, connection) => {
                    if (!err) {
                        try {
                            connection.query(`DELETE FROM user WHERE id = ${user==undefined?decodedToken.id:user.id};`);

                        } catch {

                        } finally { connection.release(); }
                    }

                    delete res.user;
                    res.status(400).json({
                        message: "Erreur sur la base de données",
                        //error: err.message,
                    });
                });
            });
        }
    });
};

/**
 * Supprime les données liés aux consentements d'un utilisateur
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.deleteData = (req, res, next) => {
    const { token } = req.cookies;
    const user = res.user;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (user == undefined && err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            fetch(URL_STORAGE + '/data', {
                method: 'DELETE',
                body: JSON.stringify({ id: (user!=undefined?user.id:decodedToken.id)}),
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_DEL,
                },

            }).then(result => {
                if (result.status == 400) {
                    throw new Error();
                }
                next();

            }).catch(err => {
                res.status(400).json({
                    message: "Erreur sur la base de données",
                    //error: err.message,
                })
            });
        }
    });
};

/**
 * Donne à un client ses données
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getData = (req, res, next) => {
    const { token } = req.cookies;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            fetch(URL_STORAGE + '/data/' + decodedToken.id, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_GET,
                },

            }).then(async result => {
                if (result.status == 400) {
                    throw new Error();

                } else {
                    const data = await result.json();
                    res.status(200).json(data);
                }

            }).catch(err => {
                res.status(400).json({
                    message: "Erreur sur la base de données",
                    //error: err.message,
                })
            });
        }
    });
};

/**
 * Modifie les données à un client
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.changeData = (req, res, next) => {
    const { token } = req.cookies;
    const { email, gender } = req.body;

    if (!email) {
        return res.status(400).json({ message: "L'email ne doit pas être vide" });
    }

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            fetch(URL_STORAGE + '/data/' + decodedToken.id, {
                method: 'PUT',
                body: JSON.stringify({ email: email, gender: gender }),
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_PUT,
                },

            }).then(async result => {
                if (result.status == 200) {
                    res.status(200).send();

                } else {
                    throw new Error();
                }

            }).catch(err => {
                res.status(400).json({
                    message: "Erreur sur la base de données",
                    //error: err.message,
                })
            });
        }
    });
};

/**
 * Donne les logs qui se trouvent sur une tranche de date
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getLogByDate = (req, res, next) => {
    const { dateStart, dateEnd } = req.body;
    const { token } = req.cookies;

    if (dateStart == undefined || dateEnd == undefined) {
        return res.status(400).json({ message: "Les dates n'ont pas été indiquées" });

    } else if (typeof dateStart != "number" || typeof dateEnd != "number") {
        return res.status(400).sjon({ message: "Les dates ne sont pas au bon format"});
    }

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            fetch(URL_STORAGE + '/log', {
                method: 'POST',
                body: JSON.stringify({ dateStart: dateStart, dateEnd: dateEnd + 1000 * 60 * 60 * 24 }),
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_LOG,
                },

            }).then(async result => {
                const data = await result.json();
                if (result.status == 400) {
                    throw new Error();

                } else {
                    res.status(200).json({ data: data });
                }

            }).catch(err => {
                res.status(400).json({
                    message: "Erreur sur la base de données",
                    //error: err.message,
                })
            });
        }
    });
};

/**
 * Remmet à zéro le scénario
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.resetAll = (req, res, next) => {
    mysqlConf.getConnection((error, connection) => {
        if (error) {
            display.textContent = `${error.message}${error.error?", " + error.error:''}`;
        }
        try {
            const sql = `DELETE FROM user WHERE role = "Basic";`;
            connection.query(sql, (err, result) => {
                if (err) {
                    display.textContent = `${err.message}${err.error?", " + err.error:''}`;
                }
            });

        } finally {
            connection.release();
        }
    });

    fetch(URL_STORAGE + '/data/all', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'MY_APP_API_KEY': keys.MY_APP_API_KEY_DEL_ALL,
        },

    }).then(async result => {
        if (result.status == 400) {
            throw new Error("Erreur sur la base de données");

        } else {
            await connectWeb3.deleteAll();
            res.status(200).send();
        }

    }).catch(err => {
        res.status(400).json(err);
    });
};

/**
 * Simule l'envoi des newsletters
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.prepareEmails = async (req, res, next) => {
    try {
        await connectWeb3.prepareEmails();
        res.status(200).send();

    } catch (err) {
        res.status(400).send(err);
    }
};
