import { Router } from "express";
import { body, validationResult } from "express-validator";
import * as fs from "node:fs/promises";
import { prisma } from "../app.js";

const validateFolderName = [
    body("directoryName")
        .trim()
        .notEmpty()
        .withMessage("Directory Name must not be empty")
        .not()
        .contains("/")
        .withMessage("No / symbols are allowed")
        .not()
        .contains(".")
        .withMessage("No . symbols are allowed"),
];

const directoryRouter = new Router();

/*directoryRouter.get("/", (req, res) => {
    res.status(200).send("");
});*/

directoryRouter.post("/", validateFolderName, async (req, res) => {
    console.log(req.body);

    if ((await fs.access("./drive")) === undefined) {
        console.log("drive", req.path);

        const errors = validationResult(req);

        console.log(errors.array());

        if (!errors.isEmpty()) {
            return res.status(400).redirect("/");
        }

        let path = "./drive/" + req.body.directoryName;

        if (
            (await prisma.directory.findUnique({
                where: {
                    path: path,
                },
            })) !== null
        ) {
            return res.redirect("/directory/" + req.body.directoryName);
        }

        try {
            await fs.mkdir(path, {
                recursive: true,
            });

            console.log(path);

            await prisma.directory.create({
                data: {
                    path: path,
                },
            });
        } catch (err) {
            console.log(err);
        }
    } else {
        return res.status(504).send();
    }

    // res.status(200).send();
    res.redirect("/");
});

directoryRouter.use((req, res) => {
    console.log("drive", req.path);
});

export default directoryRouter;
