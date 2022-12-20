const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs');
const mysqlConf = require("./db.js").mysql_pool;
const keys = require("./keys.json");

const app = express();
const PORT = 8081;
const callbackAddress = "http://127.0.0.1:5001/setData";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());

/**
 * Prend les données des consentements demandés par le contrat intelligent et les envoie à une autre adresse
 *
 * @param {*} req
 * @param {*} res
 */
app.post('/requestData/:idOrder/:idDeliverer', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_ADD)) {
            throw new Error("Mauvaise authentification");
        }

        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    error: "Une erreur s'est produite",
                    message: err.message
                });

            } else {
                try {
                    const sql = `
                    SELECT address, town, door_code, phone FROM client
                    WHERE id = (
                        SELECT id_client FROM orderClient
                        WHERE id = ${req.params.idOrder}
                        AND delivered = false
                        AND id_deliverer = ${req.params.idDeliverer}
                    );`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: err.message
                            });

                        } else {
                            const data = result[0];
                            const date = new Date();
                            data.idOrder = req.params.idOrder;
                            data.idDeliverer = req.params.idDeliverer;
                            var file = fs.readFileSync('./log-file.txt', 'utf8');
                            if (file === "") {
                                file = {};

                            } else {
                                file = JSON.parse(file);
                            }
                            const dataLog = { date: date.getTime(), idOrder: req.params.idOrder, idDeliverer: req.params.idDeliverer };
                            const timeCut = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

                            fetch(callbackAddress, {
                                method: 'POST',
                                body: JSON.stringify({ data: data }),
                                headers: {
                                    'Content-Type': 'application/json',
                                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_GET_CALLBACK,
                                }

                            }).then(r => {
                                if (r.status == 200) {
                                    dataLog.error = false;
                                    res.status(200).json({ res: "1" });

                                } else {
                                    dataLog.error = true;
                                    res.status(400).json({ res: "0" });
                                }

                                if (timeCut in file) {
                                    file[timeCut].push(dataLog);

                                } else {
                                    file[timeCut] = [dataLog];
                                }
                                fs.writeFileSync('./log-file.txt', JSON.stringify(file));
                            });
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({ res: err.message });
        console.error({ date: Date.now(), res: err.message });
    }
});

/**
 * Vérifie si le client existe
 *
 * @param {*} req
 * @param {*} res
 */
app.get('/client/:id', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_GET)) {
            throw new Error("Mauvaise authentification");
        }

        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    error: "Une erreur s'est produite",
                    message: err.message
                });

            } else {
                try {
                    const sql = `SELECT id FROM client WHERE id = ${req.params.id};`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: err.message
                            });

                        } else if (result.length === 0) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: "L'utilisateur n'a pas été trouvé"
                            });

                        } else {
                            res.status(200).send();
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Vérifie si le livreur existe
 *
 * @param {*} req
 * @param {*} res
 */
app.get('/deliverer/:id', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_GET)) {
            throw new Error("Mauvaise authentification");
        }

        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    message: "Une erreur s'est produite",
                    error: err.message
                });

            } else {
                try {
                    const sql = `SELECT id FROM deliverer WHERE id = ${req.params.id};`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                message: "Une erreur s'est produite",
                                error: err.message
                            });

                        } else if (result.length === 0) {
                            res.status(400).json({
                                message: "Une erreur s'est produite",
                                error: "L'utilisateur n'a pas été trouvé"
                            });

                        } else {
                            res.status(200).send();
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Vérifie si l'auditeur existe
 *
 * @param {*} req
 * @param {*} res
 */
app.get('/audit/:id', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_GET)) {
            throw new Error("Mauvaise authentification");
        }

        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    message: "Une erreur s'est produite",
                    error: err.message
                });

            } else {
                try {
                    const sql = `SELECT id FROM audit WHERE id = ${req.params.id};`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                message: "Une erreur s'est produite",
                                error: err.message
                            });

                        } else if (result.length === 0) {
                            res.status(400).json({
                                message: "Une erreur s'est produite",
                                error: "L'utilisateur n'a pas été trouvé"
                            });

                        } else {
                            res.status(200).send();
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Donne toutes les commandes d'un client
 *
 * @param {*} req
 * @param {*} res
 */
app.get('/order/client/:id', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_GET)) {
            throw new Error("Mauvaise authentification");
        }

        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    error: "Une erreur s'est produite",
                    message: err.message
                });

            } else {
                try {
                    const sql = `SELECT id, id_deliverer, delivered, timestamp FROM orderClient WHERE id_client = ${req.params.id};`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: err.message
                            });

                        } else {
                            const temp = [];
                            result.forEach(item => {
                                temp.push({ id: item.id, idDeliverer: item.id_deliverer, delivered: item.delivered, timestamp: item.timestamp });
                            });
                            res.status(200).json(temp);
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Donne toutes les commandes à être livrées par un livreur
 *
 * @param {*} req
 * @param {*} res
 */
app.get('/order/deliverer/:id', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_GET)) {
            throw new Error("Mauvaise authentification");
        }

        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    error: "Une erreur s'est produite",
                    message: err.message
                });

            } else {
                try {
                    const sql = `SELECT id, delivered, timestamp FROM orderClient WHERE id_deliverer = ${req.params.id};`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: err.message
                            });

                        } else {
                            const temp = [];
                            result.forEach(item => {
                                temp.push({ id: item.id, delivered: item.delivered, timestamp: item.timestamp });
                            });
                            res.status(200).json(temp);
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Change une commande à livrée
 *
 * @param {*} req
 * @param {*} res
 */
app.put('/order/delivered', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_PUT)) {
            throw new Error("Mauvaise authentification");
        }

        const { idOrder } = req.body;
        if (!idOrder) {
            throw new Error("Commande non trouvée");
        }

        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    error: "Une erreur s'est produite",
                    message: err.message
                });

            } else {
                try {
                    const sql = `UPDATE orderClient SET delivered = true WHERE id = ${idOrder};`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: err.message
                            });

                        } else if (result.affectedRows == 0) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: "Commande non trouvée"
                            });

                        } else {
                            res.status(200).send();
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Donne toutes les commandes qui doivent être supprimées du contrat intelligent
 *
 * @param {*} req
 * @param {*} res
 */
app.get('/order/delivered/removed', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_GET)) {
            throw new Error("Mauvaise authentification");
        }

        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    error: "Une erreur s'est produite",
                    message: err.message
                });

            } else {
                try {
                    const sql = `SELECT id FROM orderClient WHERE delivered = true AND removed = false;`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: err.message
                            });

                        } else {
                            const temp = [];
                            result.forEach(item => temp.push(item.id));
                            res.status(200).json(temp);
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Change à supprimées les commandes que l'on vient de supprimer du contrat intelligent
 *
 * @param {*} req
 * @param {*} res
 */
app.put('/order/delivered/removed', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_PUT)) {
            throw new Error("Mauvaise authentification");
        }

        const { listIdOrder } = req.body;
        if (listIdOrder && listIdOrder.length > 0) {
            mysqlConf.getConnection((err, connection) => {
                if (err) {
                    res.status(400).json({
                        error: "Une erreur s'est produite",
                        message: err.message
                    });

                } else {
                    try {
                        const sql = `UPDATE orderClient SET removed = true WHERE delivered = true AND id in ('${listIdOrder.join("','")}');`;
                        connection.query(sql, (err, result) => {
                            if (err) {
                                res.status(400).json({
                                    error: "Une erreur s'est produite",
                                    message: err.message
                                });

                            } else if (result.affectedRows != listIdOrder.length) {
                                res.status(200).send(); // log ? -> get mauvais

                            } else {
                                res.status(200).send();
                            }
                        });

                    } finally {
                        connection.release();
                    }
                }
            });

        } else {
            res.status(200).send();
        }

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Ajoute une commande d'un client
 *
 * @param {*} req
 * @param {*} res
 */
app.post('/order/client/:id', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_ADD)) {
            throw new Error("Mauvaise authentification");
        }

        const { timestamp } = req.body;
        if (!timestamp) {
            throw new Error("La date limite ne doit pas être nulle");
        }
        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    error: "Une erreur s'est produite",
                    message: err.message
                });

            } else {
                try {
                    const sql = `
                    INSERT INTO orderClient (id_client, id_deliverer, timestamp)
                    VALUES (${req.params.id}, (SELECT id FROM deliverer ORDER BY RAND() LIMIT 1), ${timestamp});
                    SELECT LAST_INSERT_ID() AS "id";
                    SELECT id_deliverer FROM orderClient WHERE id = LAST_INSERT_ID();`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: err.message
                            });

                        } else {
                            res.status(200).json({ idOrder: result[1][0].id, idDeliverer: result[2][0].id_deliverer });
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Modifie le livreur d'une commande
 *
 * @param {*} req
 * @param {*} res
 */
app.put('/order/:idOrder/deliverer/:idDeliverer', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_PUT)) {
            throw new Error("Mauvaise authentification");
        }

        const { revert } = req.body;
        mysqlConf.getConnection((err, connection) => {
            if (err) {
                return res.status(400).json({
                    error: "Une erreur s'est produite",
                    message: err.message
                });

            } else {
                try {
                    var error = false;
                    var sql = `
                        SELECT id FROM orderClient WHERE id_deliverer = ${revert?revert:req.params.idDeliverer} AND id = ${req.params.idOrder};
                        SELECT COUNT(id) AS "count" FROM deliverer;
                    `;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            error = true;
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: err.message
                            });

                        } else if (result[0].length == 0) {
                            error = true;
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: "La commande n'a pas été trouvée"
                            });

                        } else if (result[1].count < 2) {
                            error = true;
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: "Il existe qu'un seul livreur"
                            });
                        }
                    });

                    if (!error) {
                        if (revert) {
                            sql = `UPDATE orderClient SET id_deliverer = ${req.params.idDeliverer} WHERE id = ${req.params.idOrder};`;

                        } else {
                            sql = `
                                UPDATE orderClient SET id_deliverer = (SELECT id FROM deliverer WHERE id != ${req.params.idDeliverer} ORDER BY RAND() LIMIT 1) WHERE id = ${req.params.idOrder};
                                SELECT id_deliverer FROM orderClient WHERE id = ${req.params.idOrder};`;
                        }
                        connection.query(sql, (err, result) => {
                            if (err) {
                                res.status(400).json({
                                    error: "Une erreur s'est produite",
                                    message: err.message
                                });

                            } else if (result.affectedRows == 0) {
                                res.status(400).send();

                            } else if (revert) {
                                res.status(200).json({ idDeliverer: req.params.idDeliverer });

                            } else {
                                res.status(200).json({ idDeliverer: result[1][0].id_deliverer });
                            }
                        });
                    }

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Supprime une commande lors d'une erreur
 *
 * @param {*} req
 * @param {*} res
 */
app.delete('/order/:idOrder', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_DEL)) {
            throw new Error("Mauvaise authentification");
        }

        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    error: "Une erreur s'est produite",
                    message: err.message
                });

            } else {
                try {
                    const sql = `DELETE FROM orderClient WHERE id = ${req.params.idOrder};`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: err.message
                            });

                        } else if (result.affectedRows == 0) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: "Commande non trouvée"
                            });

                        } else {
                            res.status(200).send({ deleted: true });
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

/**
 * Donne les logs entre 2 dates
 *
 * @param {*} req
 * @param {*} res
 */
app.post('/log', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_LOG)) {
            throw new Error("Mauvaise authentification");
        }

        const { dateStart, dateEnd } = req.body;
        const data = fs.readFileSync('./log-file.txt', 'utf8');
        var dataJson = {};

        if (data != "") {
            dataJson = JSON.parse(data);
            Object.keys(dataJson).forEach(key => {
                const intKey = parseInt(key);
                if (intKey < dateStart || intKey > dateEnd) {
                    delete dataJson[key];
                }
            });
        }
        res.status(200).json(dataJson);

    } catch (err) {
        res.status(400).json({ error: err.message });
        console.error({ date: Date.now(), res: err.message });
    }
});

/**
 * Supprime toutes les commandes
 *
 * @param {*} req
 * @param {*} res
 */
app.delete('/order', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_DEL_ALL)) {
            throw new Error("Mauvaise authentification");
        }

        mysqlConf.getConnection((err, connection) => {
            if (err) {
                res.status(400).json({
                    error: "Une erreur s'est produite",
                    message: err.message
                });

            } else {
                try {
                    const sql = `DELETE FROM orderClient;`;
                    connection.query(sql, (err, result) => {
                        if (err) {
                            res.status(400).json({
                                error: "Une erreur s'est produite",
                                message: err.message
                            });

                        } else {
                            res.status(200).send();
                        }
                    });

                } finally {
                    connection.release();
                }
            }
        });

    } catch (err) {
        res.status(400).json({
            error: "Une erreur s'est produite",
            message: err.message
        });
    }
});

const server = app.listen(PORT, _=> console.log(`Server Connected to port ${PORT}`));

/**
 * Crée et remet à 0 les tables "client", "deliverer", "order" puis insère des valeurs de tests
 *
 */
const initializeTable = _=> {
    mysqlConf.getConnection((err, connection) => {
        if (err) {
            throw err;
        }
        try {
            //DROP TABLE IF EXISTS client, deliverer, orderClient, audit;
            const sql = `
            CREATE TABLE IF NOT EXISTS client (
                id INT AUTO_INCREMENT PRIMARY KEY,
                address VARCHAR(255) NOT NULL,
                town VARCHAR(255) NOT NULL,
                postcode VARCHAR(255) NOT NULL,
                door_code VARCHAR(255) DEFAULT NULL,
                phone VARCHAR(255) NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS deliverer (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS audit (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS admin (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS orderClient (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_client INT NOT NULL,
                id_deliverer INT NOT NULL,
                timestamp BIGINT NOT NULL,
                delivered BOOLEAN NOT NULl DEFAULT false,
                removed BOOLEAN NOT NULL DEFAULT false,
                FOREIGN KEY (id_client) REFERENCES client(id),
                FOREIGN KEY (id_deliverer) REFERENCES deliverer(id)
            );
            INSERT IGNORE INTO client (address, town, postcode, door_code, phone) VALUES ("adress1", "ville1", "npa1", "1A234", "078 123 45 67");
            INSERT IGNORE INTO client (address, town, postcode, door_code, phone) VALUES ("adress2", "ville2", "npa2", "432B1", "078 234 56 78");
            INSERT IGNORE INTO client (address, town, postcode, phone) VALUES ("adress3", "ville3", "npa3", "078 345 67 89");
            INSERT IGNORE INTO client (address, town, postcode, phone) VALUES ("adress4", "ville4", "npa4", "078 456 78 90");
            INSERT IGNORE INTO client (address, town, postcode, phone) VALUES ("adress5", "ville5", "npa5", "078 567 89 01");
            INSERT IGNORE INTO deliverer (name) VALUES ("deliverer1");
            INSERT IGNORE INTO deliverer (name) VALUES ("deliverer2");
            INSERT IGNORE INTO deliverer (name) VALUES ("deliverer3");
            INSERT IGNORE INTO deliverer (name) VALUES ("deliverer3");
            INSERT IGNORE INTO deliverer (name) VALUES ("deliverer4");
            INSERT IGNORE INTO deliverer (name) VALUES ("deliverer4");
            INSERT IGNORE INTO audit (name) VALUES ("Audit");
            INSERT IGNORE INTO admin (name) VALUES ("Admin");`;
            connection.query(sql, (err, result) => {
                if (err) {
                    throw err;
                }
                console.log("MySQL Connected");
            });

        } finally {
            connection.release();
        }
    });
};


initializeTable();
