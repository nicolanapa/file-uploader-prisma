import express from "express";
import process from "process";
import url from "url";
import path from "path";
import session from "express-session";
import passport from "./db/passport.js";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { PrismaClient } from "@prisma/client";
import loginRouter from "./routes/loginRouter.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
export const prisma = new PrismaClient();

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
    session({
        store: new PrismaSessionStore(prisma, {
            checkPeriod: 2 * 60 * 1000,
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        }),
        secret: process.env.SECRET_SESSION,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
    }),
);
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname + "/styles")));
app.use(express.static(path.join(__dirname + "/scripts")));

app.get("/", (req, res) => {
    res.send();
});

app.use("/login", loginRouter);

app.listen(PORT);
