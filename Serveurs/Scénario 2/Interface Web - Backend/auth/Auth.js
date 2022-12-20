const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const connectWeb3 = require("../web3/connectWeb3");
const server = require("../server");
const keys = require("../keys.json");
const URL_STORAGE = "http://127.0.0.1:8081";

/**
 * Logue un client ou un livreur
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.login = (req, res, next) => {
    const { id, role } = req.body;
    if (!id || !role) {
        return res.status(400).json({ message: "Id et/ou role non indiqué" });
    }

    fetch(URL_STORAGE + '/' + role + '/' + id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'MY_APP_API_KEY': keys.MY_APP_API_KEY_GET,
        }

    }).then(async result => {
        if (result.status == 400) {
            const data = await result.json();
            res.status(400).json({
                error: data.error,
                message: data.message,
            });

        } else {
            const maxAge = 3 * 60 * 60;
            const token = jwt.sign(
                { id: id, role: role },
                keys.jwtSecret,
                { expiresIn: maxAge } // 3hrs in sec
            );
            res.cookie("token", token, {
                httpOnly: true,
                maxAge: maxAge * 1000, // 3hrs in ms
            });
            res.status(200).json();
        }
    });
};

/**
 * Donne les information concernant une commande depuis la base de données
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getOrder = (req, res, next) => {
    const { token } = req.cookies;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            fetch(URL_STORAGE + '/order/' + decodedToken.role + '/' + decodedToken.id, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_GET,
                }

            }).then(async result => {
                const data = await result.json();
                if (result.status === 400) {
                    res.status(400).json({
                        error: data.error,
                        message: data.message
                    });

                } else {
                    res.status(200).json(data);
                }
            });
        }
    });
};

/**
 * Ajoute une nouvelle commande à la base de données par un client
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.addOrder = (req, res, next) => {
    const { token } = req.cookies;
    const { timestamp } = req.body;

    if (!timestamp) {
        return res.status(400).json({ message: "La date limite ne doit pas être nulle" });
    }

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            fetch(URL_STORAGE + '/order/' + decodedToken.role + '/' + decodedToken.id, {
                method: 'POST',
                body: JSON.stringify({ timestamp: Math.floor(timestamp / 1000) }),
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_ADD,
                }

            }).then(async result => {
                const data = await result.json();
                if (result.status == 400) {
                    res.status(400).json({
                        error: data.error,
                        message: data.message
                    });

                } else  {
                    res.data = { idOrder: data.idOrder, idDeliverer: data.idDeliverer, timestamp: Math.floor(timestamp / 1000) };
                    next();
                }
            });
        }
    });
};

/**
 * Change le livreur sur la base de données
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.changeDeliverer = (req, res, next) => {
    const { idOrder } = req.body;
    const { token } = req.cookies;
    if (!idOrder) {
        return res.status(400).json({ message: "Id non indiqué" });
    }

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            fetch(URL_STORAGE + '/order/' + idOrder + '/' + decodedToken.role + '/' + decodedToken.id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_PUT,
                }

            }).then(async result => {
                const data = await result.json();
                if (result.status === 400) {
                    res.status(400).json({
                        error: data.error,
                        message: data.message
                    });

                } else {
                    res.data = data;
                    next();
                }

            }).catch(err => {
                res.status(400).json({
                    error: err.error,
                    message: err.message
                });
            });
        }
    });
};

/**
 * Ajoute une autorisation sur le contrat intelligent
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.addAuthorization = async (req, res, next) => {
    const deleteOrder = async idOrder => {
        var temp;
        await fetch(URL_STORAGE + '/order/' + idOrder, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'MY_APP_API_KEY': keys.MY_APP_API_KEY_ADD,
            }

        }).then(async result => {
            const data = await result.json();
            temp = data.deleted;

        }).catch(err => {
            temp = false;
        });
        return await temp;
    };

    const { token } = await req.cookies;
    const { idOrder, idDeliverer, timestamp } = await res.data;
    delete await res.data;
    if (!idOrder || !idDeliverer || !timestamp) {
        return res.status(400).json({ message: "Erreur au niveau de la base de données" });
    }

    jwt.verify(token, keys.jwtSecret, async (err, decodedToken) => {
        if (err) {
            await deleteOrder(idOrder);
            res.status(401).json({ message: "Non autorisé" });

        } else {
            await connectWeb3.addAuthorization(idOrder, idDeliverer, timestamp).then( _=> {
                res.status(201).send();

            }).catch(async err => {
                if (await deleteOrder(idOrder)) {
                    res.status(400).json({ message: "Erreur au niveau du contrat intelligent" });

                } else {
                    res.status(400).json({ message: "Erreur au niveau du contrat intelligent et de la base de données" });
                }
            });
        }
    });
}

/**
 * Change le livreur d'une autorisation sur le contrat intelligent
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.changeDelivererAuthorization = (req, res, next) => {
    const revertChangedDeliverer = async (idOrder, decodedToken, idDeliverer) => {
        var temp;
        await fetch(URL_STORAGE + '/order/' + idOrder + '/' + decodedToken.role + '/' + decodedToken.id, {
            method: 'PUT',
            body: JSON.stringify({ revert: idDeliverer }),
            headers: {
                'Content-Type': 'application/json',
                'MY_APP_API_KEY': keys.MY_APP_API_KEY_PUT,
            }

        }).then(async result => {
            const data = await result.json();
            temp = data.idDeliverer;

        }).catch(err => {
            temp = false;
        });
        return await temp;
    };
    const { idOrder } = req.body;
    const { token } = req.cookies;
    const { idDeliverer } = res.data;
    delete res.data;
    if (!idOrder || !idDeliverer) {
        return res.status(400).json({ message: "Id de la commande ou du livreur manquant" });
    }

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            connectWeb3.changeDelivererAuthorization(idOrder, idDeliverer).then(_=> {
                res.status(200).send();

            }).catch(async err => {
                if (await revertChangedDeliverer(idOrder, decodedToken, idDeliverer)) {
                    res.status(400).json({ message: "Erreur au niveau du contrat intelligent" });

                } else {
                    res.status(400).json({ message: "Erreur au niveau du contrat intelligent et de la base de données" });
                }
            });
        }
    });
};

/**
 * Attribue la valeur concernant la livraison effectée à une commande à vrai sur la base de données
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.setDelivered = (req, res, next) => {
    const { idOrder } = req.body;
    const { token } = req.cookies;
    if (!idOrder) {
        return res.status(400).json({ message: "Id de la commande manquant" });
    }

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            fetch(URL_STORAGE + '/order/delivered', {
                method: 'PUT',
                body: JSON.stringify({ idOrder: idOrder }),
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_PUT,
                }

            }).then(async result => {
                if (result.status == 400) {
                    const data = await result.json();
                    res.status(400).json({
                        error: data.error,
                        message: data.message
                    });

                } else {
                    res.status(200).send();
                }

            }).catch(err => {
                res.status(400).json({
                    error: err.error,
                    message: err.message
                })
            });
        }
    });
};

/**
 * Demande au contrat intelligent de lancer la requête à la base de données de nous donner les données d'un client
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getData = (req, res, next) => {
    const { idOrder } = req.body;
    const { token } = req.cookies;

    if (!idOrder) {
        return res.status(400).json({ message: "Id de la commande manquant" });
    }

    jwt.verify(token, keys.jwtSecret, async (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            if (!req.session.client) {
                await server.addValue(idOrder, { idDeliverer: decodedToken.id, idOrder: idOrder, idSession: req.session.id });
                await connectWeb3.sendData(idOrder, decodedToken.id).then(_=> {
                    server.getSessionStore().get(req.session.id, (err, session) => {
                        if (err) {
                            res.status(400).json({ message: err.message });

                        } else {
                            res.status(200).json(session.client);
                        }
                    });

                }).catch(err => {
                    server.removeValue(idOrder);
                    // TODO : prendre les messages de require() du smart contrat
                    res.status(400).json({ message: "Erreur au niveau du contrat intelligent" });
                });

            } else {
                res.status(200).json(req.session.client);
            }
        }
    });
};

/**
 * Demande au contrat intelligent de transmettre toutes les autorisations d'une date donnée
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getAuthorizationAudit = (req, res, next) => {
    const { token } = req.cookies;
    const { page, timestamp } = req.body;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else if (!isNaN(page) && page > 0 && (timestamp == null || typeof timestamp == "number")) {
            const from = (page - 1) * 100;
            const to = page * 100 - 1;
            connectWeb3.getAllAuthorization(from, to, timestamp).then(listAuthorization => {
                if (listAuthorization.list != undefined) {
                    res.status(200).json(listAuthorization);

                } else {
                    res.status(400).json({ message: listAuthorization.message})//message: "Erreur sur le contrat intelligent" });
                }
            });

        } else {
            res.status(400).json({ message: "L'identifiant et/ou le temps ne sont pas corrects" });
        }
    });
};

/**
 * Demande au contrat intelligent de transmettre tous les logs d'une date donnée
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
 * Donne la taille de la liste des autorisations
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.getCountAuthorization = (req, res, next) => {
    const { token } = req.cookies;
    const { timestamp } = req.body;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            console.log("TGG")
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
 * Simulation de la suppression des autorisations dépassées dans le contrat intelligent
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.deleteOldAuthorization = (req, res, next) => {
    const { token } = req.cookies;

    jwt.verify(token, keys.jwtSecret, (err, decodedToken) => {
        if (err) {
            res.status(401).json({ message: "Non autorisé" });

        } else {
            fetch(URL_STORAGE + '/order/delivered/removed', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_GET,
                }

            }).then(async listIdOrder => {
                const data = await listIdOrder.json();
                if (data && data.length > 0) {
                    connectWeb3.deleteAuthorization(data).then(deleted => {
                        if (deleted) {
                            fetch(URL_STORAGE + '/order/delivered/removed', {
                                method: 'PUT',
                                body: JSON.stringify({ listIdOrder: data }),
                                headers: {
                                    'Content-Type': 'application/json',
                                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_PUT,
                                }

                            }).then(result => {
                                res.status(200).send();
                            });

                        } else {
                            throw new Error("Des autorisations devant être supprimées n'ont pas été trouvées dans le contrat intelligent");
                        }

                    }).catch(err => {
                        res.status(400).json({
                            message: "Une erreur est survenue",
                            error: err.message,
                        });
                    });

                } else {
                    res.status(400).json({
                        message: "Aucune autorisation à supprimer (doivent être livrées)"
                    });
                }

            }).catch(err => {
                res.status(400).json({
                    message: "Une erreur est survenue",
                    error: err.message,
                });
            });
        }
    });


};

/**
 * Remet à zéro le scénario
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.resetAll = (req, res, next) => {
    fetch(URL_STORAGE + '/order', {
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
        res.status(400).json({ message: err.message });
    });
};
