import express from "express";
import process from "process";
import url from "url";
import path from "path";
import session from "express-session";
import passport from "./db/passport.js";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { PrismaClient } from "@prisma/client";
import loginRouter from "./routes/loginRouter.js";
import uploadRouter from "./routes/uploadRouter.js";
import directoryRouter from "./routes/directoryRouter.js";
import fileRouter from "./routes/fileRouter.js";
import sharedRouter from "./routes/sharedRouter.js";

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

app.get("/", async (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("Not authenticated");

        return res.redirect("/login");
    }

    const directories = await prisma.directory.findMany({
        include: {
            SharedDirectory: true,
        },
    });
    const files = await prisma.file.findMany({
        include: {
            fileInformation: true,
        },
    });

    console.log(directories, "\n", files);

    res.status(200).render("./home", {
        directories: directories ? directories : [],
        files: files ? files : [],
        path: "./drive",
    });
});

app.use("/login", loginRouter);

app.use("/upload", uploadRouter);

app.use("/directory", directoryRouter);

app.use("/shared", sharedRouter);

app.use("/file", fileRouter);

app.get("/styles/:file", (req, res) => {
    res.sendFile(__dirname + req.path);
});

app.get("/icons/:file", (req, res) => {
    res.sendFile(__dirname + req.path);
});

app.listen(PORT);
