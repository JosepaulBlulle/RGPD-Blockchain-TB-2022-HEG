const XLSX = require('xlsx');
const XlsxPopulate = require('xlsx-populate');
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs');
const keys = require('./keys.json');

const app = express();
const PORT = 8080;
const callbackAddress = "http://127.0.0.1:5000/sendemails";
const filename = "database_email.xlsx";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());

/**
 * Prend les données des consentements demandés par le contrat intelligent et les envoie à une autre adresse
 *
 * @param {*} req
 * @param {*} res
 */
app.post('/emails/:id', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_EMAIL)) {
            throw new Error("Mauvaise authentification");
        }
        var file;
        try {
            file = XLSX.readFile('./' + filename);

        } catch {
            throw new Error("Erreur de lecture sur la base de donnée");
        }
        const listParams = [0, 10, 11, 1];
        const sheetName = file.SheetNames[0];
        var data = XLSX.utils.sheet_to_json(file.Sheets[sheetName]);

        // { "1": 11, "2": 0 }
        try {
            var listConsents = JSON.parse(req.params.id);
            if (!(typeof listConsents === 'object' && !Array.isArray(listConsents) && listConsents !== null)) {
                throw new Error();
            }

        } catch {
            throw new Error("Paramètre non valide");
        }

        data = data.filter(row => listConsents[row.id] != undefined);
        data.forEach(item => {
            if (!(listParams.includes(listConsents[item.id]))) {
                throw new Error("Paramètre non valide");
            }
            if (listConsents[item.id] < 10) {
                item.username = null;
            }
            if (listConsents[item.id] == 10 || listConsents[item.id] == 0) {
                item.gender = null;
            }
        });

        if (data.length === 0) {
            throw new Error("Aucun consentement d'email ou idendifiants non trouvés");

        } else {
            const date = new Date();
            var dataLog;
            file = fs.readFileSync('./log-file.txt', 'utf8');
            if (file === "") {
                file = {};

            } else {
                file = JSON.parse(file);
            }
            const timeCut = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

            if (Array.isArray(data)) {
                dataLog = { date: date.getTime(), listId: [] };
                data.forEach(item => dataLog.listId.push(item.id));

            } else {
                dataLog = { date: date.getTime(), listId: data.id };
            }

            fetch(callbackAddress, {
                method: 'POST',
                body: JSON.stringify({ emails: data }),
                headers: {
                    'Content-Type': 'application/json',
                    'MY_APP_API_KEY': keys.MY_APP_API_KEY_EMAIL_CALLBACK,
                }

            }).then(r => {
                if (r.status == 200) {
                    dataLog.error = false;
                    res.status(200).json({ res: "1" });

                } else {
                    dataLog.error = true;
                }
            });

            if (dataLog.error) {
                throw new Error({ message: "Erreur sur l'envoi d'email" });

            } if (timeCut in file) {
                file[timeCut].push(dataLog);

            } else {
                file[timeCut] = [dataLog];
            }
            fs.writeFileSync('./log-file.txt', JSON.stringify(file));
        }

    } catch (err) {
        res.status(400).json({ res: err.message });
        console.error({ date: Date.now(), res: err.message });
    }
});

/**
 * Prend les données d'un utilisateur pour lui montrer afin qu'il puisse les modifier
 *
 * @param {*} req
 * @param {*} res
 */
app.get('/data/:id', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_GET)) {
            throw new Error("Mauvaise authentification");
        }

        var file;
        try {
            file = XLSX.readFile('./' + filename);

        } catch {
            throw new Error("Erreur de lecture sur la base de donnée");
        }

        const sheetName = file.SheetNames[0];
        var data = XLSX.utils.sheet_to_json(file.Sheets[sheetName]);
        data = data.find(row => row.id == req.params.id);

        if (data == undefined) {
            throw new Error("Id non trouvé");

        } else {
            res.status(200).json(data);
        }

    } catch (err) {
        res.status(400).json({ res: err.message });
        console.error({ date: Date.now(), res: err.message });
    }
});

/**
 * Modifie les données d'un client
 *
 * @param {*} req
 * @param {*} res
 */
app.put('/data/:id', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_PUT)) {
            throw new Error("Mauvaise authentification");
        }

        try {
            const { email, gender } = req.body;
            if (!email) {
                throw new Error();
            }
            var i = 2;
            XlsxPopulate.fromFileAsync("./" + filename).then(wb => {
                while(wb.sheet(0).row(i).cell(1).value() != undefined && wb.sheet(0).row(i).cell(1).value() != req.params.id) {
                    i++;
                }
                if (wb.sheet(0).row(i).cell(1).value() == req.params.id) {
                    wb.sheet(0).row(i).cell(2).value(email);
                    wb.sheet(0).row(i).cell(4).value(gender==null?"":gender);
                    wb.toFileAsync("./database_email.xlsx");

                } else {
                    throw new Error(); // Devrait être loguée, id non trouvé
                }
                res.status(200).send();
            });

        } catch {
            throw new Error("Erreur sur la base de donnée");
        }

    } catch (err) {
        res.status(400).json('{ "error" : ' + err.message + ' }');
        console.error({ date: Date.now(), res: err.message });
    }
});

/**
 * Ajoute les données liés aux consentements d'un utilisateur
 *
 * @param {*} req
 * @param {*} res
 */
app.post('/data', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_ADD)) {
            throw new Error("Mauvaise authentification");
        }

        var idAlready = false;
        try {
            const { id, email, username, gender } = req.body;
            var i = 2;
            XlsxPopulate.fromFileAsync("./" + filename).then(wb => {
                while (wb.sheet(0).row(i).cell(1).value() != undefined && wb.sheet(0).row(i).cell(1).value() != id) {
                    i++;
                }

                if (wb.sheet(0).row(i).cell(1).value() != id) {
                    wb.sheet(0).row(i).cell(1).value(id);
                    wb.sheet(0).row(i).cell(2).value(email);
                    wb.sheet(0).row(i).cell(3).value(username);
                    wb.sheet(0).row(i).cell(4).value(gender);
                    wb.toFileAsync("./database_email.xlsx");

                } else {
                    idAlready = true;
                }
            });

        } catch {
            throw new Error("Erreur sur la base de donnée");
        }

        if (idAlready) {
            throw new Error("L'utilisateur existe déjà");
        }
        res.status(200).send();

    } catch (err) {
        res.status(400).json('{ "error" : ' + err.message + ' }');
        console.error({ date: Date.now(), res: err.message });
    }
});

/**
 * Supprime toutes les données de la base Excel (Utilisation pour effectuer des tests, pas en production)
 *
 * @param {*} req
 * @param {*} res
 */
app.delete('/data/all', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_DEL_ALL)) {
            throw new Error("Mauvaise authentification");
        }

        XlsxPopulate.fromFileAsync("./" + filename).then(wb => {
            var i = 2;
            while (wb.sheet(0).row(i).cell(1).value() != undefined) {
                wb.sheet(0).row(i).cell(1).value(undefined);
                wb.sheet(0).row(i).cell(2).value(undefined);
                wb.sheet(0).row(i).cell(3).value(undefined);
                wb.sheet(0).row(i).cell(4).value(undefined);
                wb.sheet(0).row(i).cell(5).value(undefined);
                i++;
            }
            wb.toFileAsync("./" + filename);
        });
        fs.writeFileSync("log-file.txt", "");
        fs.writeFileSync("error-file.txt", "");
        res.status(200).send();

    } catch (err) {
        res.status(400).send('{ "error" : ' + err.message + ' }');
        console.error({ date: Date.now(), res: err.message });
    }
});

/**
 * Supprime les données liés aux consentements d'un utilisateur avec son id
 *
 * @param {*} req
 * @param {*} res
 */
app.delete('/data', (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_DEL)) {
            throw new Error("Mauvaise authentification");
        }

        var idNotFound = false;
        XlsxPopulate.fromFileAsync("./" + filename).then(wb => {
            const { id } = req.body;
            var i = 2;
            while (wb.sheet(0).row(i).cell(1).value() != undefined && wb.sheet(0).row(i).cell(1).value() != id) {
                i++;
            }

            if (wb.sheet(0).row(i).cell(1).value() == id) {
                wb.sheet(0).row(i).cell(1).value(undefined);
                wb.sheet(0).row(i).cell(2).value(undefined);
                wb.sheet(0).row(i).cell(3).value(undefined);
                wb.sheet(0).row(i).cell(4).value(undefined);
                wb.sheet(0).row(i).cell(5).value(undefined);
                wb.toFileAsync("./" + filename);

            } else {
                idNotFound = true;
            }
        });

        if (idNotFound) {
            throw new Error("L'utilisteur n'existe pas");
        }
        res.status(200).send();

    } catch (err) {
        res.send('{ "error" : ' + err.message + ' }');
        console.error({ date: Date.now(), res: err.message });
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

const server = app.listen(PORT, _=> console.log(`Serveur connecté sur le port ${PORT}`));
