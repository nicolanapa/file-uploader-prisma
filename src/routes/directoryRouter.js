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
    body("path")
        .trim()
        .default("./drive")
        .contains("./drive")
        .withMessage("Wrong path"),
];

const directoryRouter = new Router();

/*directoryRouter.get("/", (req, res) => {
    res.status(200).send("");
});*/

directoryRouter.post("/", validateFolderName, async (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("Not authenticated");
        
        return res.redirect("/login");
    }

    console.log(req.body);

    if ((await fs.access("./drive")) !== undefined) {
        return res.status(504).send();
    }

    console.log("drive", req.path);

    const errors = validationResult(req);

    console.log(errors.array());

    if (!errors.isEmpty()) {
        return res.status(400).redirect("/");
    }

    let path = req.body.path + "/" + req.body.directoryName;
    console.log(path);

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

        const directory = await prisma.directory.create({
            data: {
                path: path,
            },
        });

        return res.redirect("/directory/" + directory.uniqueIdentifier);
    } catch (err) {
        console.log(err);

        res.redirect("/");
    }
});

directoryRouter.get("/:uniqueIdentifier", async (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("Not authenticated");
        
        return res.redirect("/login");
    }

    console.log("drive", req.params.uniqueIdentifier);

    const directory = await prisma.directory.findUnique({
        where: {
            uniqueIdentifier: req.params.uniqueIdentifier,
        },
    });

    console.log(directory);

    if (directory === null) {
        return res.redirect("/");
    }

    const directoriesInDirectory = await prisma.directory.findMany({
        where: {
            path: { startsWith: directory.path },
            NOT: {
                path: {
                    equals: directory.path,
                },
            },
        },
    });

    const filesInDirectory = await prisma.file.findMany({
        where: {
            fileInformation: {
                destinationOfFilename: directory.path,
            },
        },
        include: {
            fileInformation: true,
        },
    });

    console.log(filesInDirectory);

    res.status(200).render("./home", {
        directories: directoriesInDirectory ? directoriesInDirectory : [],
        files: filesInDirectory ? filesInDirectory : [],
        path: directory.path,
    });
});

export default directoryRouter;
