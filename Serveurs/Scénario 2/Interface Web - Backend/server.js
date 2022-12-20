const express = require("express");
const session = require("express-session");
const fetch = require("node-fetch")
const { createClient } = require("redis");
let RedisStore = require("connect-redis")(session);
const cookieParser = require("cookie-parser");
const connectWeb3 = require("./web3/connectWeb3");
const keys = require("./keys.json");
const { clientAuth, delivererAuth, auditAuth, adminAuth } = require("./middleware/auth.js");
const URL_STORAGE = "http://127.0.0.1:8081";
const app = express();
const PORT = 5001;
let redisClient = createClient({ legacyMode: true, port: 6379, host: 'redis-stack' });
redisClient.connect();

const sessionStore = new RedisStore({ client: redisClient });
var dictIdSession = {};
const addValue = (key, value) => dictIdSession[key] = value;
const removeValue = key => delete dictIdSession[key];
const getSessionStore = _=> { return sessionStore; };
module.exports = { addValue, removeValue, getSessionStore };

app.use(cookieParser());
app.use(session({
    store: sessionStore,
    secret: keys.SECRET_SESSION,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: (1000 * 60 * 60 * 12) // 12 heures
    }
}));
app.use(express.json());
app.use("/api/auth", require("./Auth/Route"));

app.set("view engine", "ejs");

app.get("/", (req, res) => res.render("login"));
app.get("/client", clientAuth, (req, res) => res.render("client"));
app.get("/deliverer", delivererAuth, (req, res) => res.render("deliverer"));
app.get("/audit", auditAuth, (req, res) => res.render("audit"));
app.get("/admin", adminAuth, (req, res) => res.render("admin"));
app.get("/logout", (req, res) => {
    res.cookie("token", "", { maxAge: "1" });
    res.cookie("connect.sid", "", { maxAge: "1" });
    res.redirect("/");
});

/**
 * Insère les données nécessaire pour les livreurs dans leur variable de session
 *
 * @param {*} req
 * @param {*} res
 */
app.post("/setData", (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == keys.MY_APP_API_KEY_GET_CALLBACK)) {
            throw new Error("Mauvaise authentification");
        }

        const { data } = req.body;
        if (!data.idOrder || !data.idDeliverer) {
            throw new Error("Id manquant");

        } else if (!dictIdSession[data.idOrder]) {
            throw new Error("Erreur de session");

        } else if (dictIdSession[data.idOrder].idDeliverer != data.idDeliverer) {
            throw new Error("Erreur sur l'autorisation");
        }
        const idSession = dictIdSession[data.idOrder].idSession;
        if (!idSession) {
            throw new Error("Session manquante");
        }
        sessionStore.get(idSession, (err, session) => {
            if (err) {
                res.status(400).json({ message: err.message });

            } else {
                session.client = { idOrder: data.idOrder, address: data.address, town: data.town, doorCode: data.door_code, phone: data.phone };
                sessionStore.set(idSession, session, err => {
                    if (err) {
                        res.status(400).json({ message: err.message });

                    } else {
                        removeValue(data.idOrder);
                        res.status(200).json(session.client);
                    }
                });
            }
        });

    } catch (err) {
        const { data } = req.body;
        if (data && data.idOrder) {
            removeValue(data.idOrder);
        }
        res.status(400).json({ message: err.message });
    }
});

/**
 * Supprime toutes les commandes livrées du contrat intelligent et les notent comme supprimées sur la base de données
 *
 */
const deleteAuthorization = _=> {
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

                    }).then(async result => {
                        console.log(await result.json());
                        console.log("Les autorisations ont bien été suprrimées");
                    });

                } else {
                    console.error("Aucune autorisation n'a été supprimée");
                }

            }).catch(err => {
                console.error(err);
            });
        }

    }).catch(err => {
        console.error(err);
    });
};

// Erreur de gestion
process.on("unhandledRejection", err => {
    console.log(`Une erreur s'est produite : ${err.message}`);
    server.close(_=> process.exit(1));
});

const server = app.listen(PORT, _=> console.log(`Server Connected to port ${PORT}`));

//deleteAuthorization();
//const interval = setInterval(deleteAuthorization, 1000 * 10); //* 60 * 24 * 7);
