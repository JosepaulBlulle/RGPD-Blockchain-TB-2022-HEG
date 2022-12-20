const express = require("express");
const cookieParser = require("cookie-parser");
const mysqlConf = require("./db.js").mysql_pool;
const connectWeb3 = require("./web3/connectWeb3");
const { adminAuth, basicAuth, auditAuth } = require("./middleware/auth.js");
const app = express();
const PORT = 5000;
const MY_APP_API_KEY_SEND = "044df62a225bca215d84d805c2515ec44218ef081cd5de907f1686edab4da368";

app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", require("./Auth/Route"));

app.set("view engine", "ejs");

app.get("/", (req, res) => res.render("home"));
app.get("/register", (req, res) => res.render("register"));
app.get("/login", (req, res) => res.render("login"));
app.get("/admin", adminAuth, (req, res) => res.render("admin"));
app.get("/basic", basicAuth, (req, res) => res.render("user"));
app.get("/audit", auditAuth, (req, res) => res.render("audit"));
app.get("/logout", (req, res) => {
    res.cookie("token", "", { maxAge: "1" });
    res.redirect("/");
});

/**
 * Envoie les emails depuis les données reçues
 *
 * @param {*} req
 * @param {*} res
 */
app.post("/sendemails", (req, res) => {
    try {
        if (!(req.header("MY_APP_API_KEY") == MY_APP_API_KEY_SEND)) throw new Error("Mauvaise authentification");

        const { emails } = req.body;
        // Simulation de l'envoie des emails
        if (emails.length > 0) {
            console.log(emails);
        }
        res.status(200).send();

    } catch (err) {
        res.status(400).json({ res: err.message });
    }
});

// Erreur de gestion
process.on("unhandledRejection", err => {
    console.log(`Une erreur c'est produite : ${err.message}`);
    server.close(_=> process.exit(1));
});

/**
 * Envoie le déclencheur pour recevoir la requête d'envoi d'emails
 *
 */
const prepareEmails = _=> {
    connectWeb3.prepareEmails();
};

const server = app.listen(PORT, _=> console.log(`Serveur connecté sur le port ${PORT}`));

/**
 * Crée la table "user" si elle n'existe pas et crée 1 admin et 1 audit
 *
 */
const initializeTable = _=> {
    mysqlConf.getConnection((err, connection) => {
        if (err) throw err;
        try {
            const sql = `
            CREATE TABLE IF NOT EXISTS user (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('Basic', 'Admin', 'Audit') NOT NULL DEFAULT 'Basic'
            );
            INSERT IGNORE INTO user (username, password, role) VALUES ("admin", "$2a$10$7oIz5x.UuS06U/CJiC/HP.sDP1zQmmwv6NXatqMA7mXq/LH9KdvN2", "Admin");
            INSERT IGNORE INTO user (username, password, role) VALUES ("audit", "$2a$10$4FvwREHr5czaShe8tQwl3eMyibJBvP5yQxAosnBdrUUzZ7SncY2DW", "Audit");`;
            connection.query(sql, (err, result) => {
                if (err) throw err;
                console.log("MySQL Connecté");
            });

        } finally {
            connection.release();
        }
    });
};

initializeTable();

//const interval = setInterval(prepareEmails, 60*60*24*7*1000);
//prepareEmails();
