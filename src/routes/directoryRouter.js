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

    const errors = validationResult(req);

    console.log(errors.array());

    if (!errors.isEmpty()) {
        return res.status(400).redirect("/");
    }

    try {
        (await fs.access("./drive")) === undefined ? "" : "";
    } catch {
        await fs.mkdir("./drive");
    }

    console.log("drive", req.path);

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

directoryRouter.post(
    "/:uniqueIdentifier/rename",
    validateFolderName,
    async (req, res) => {
        if (!req.isAuthenticated()) {
            console.log("Not authenticated");

            return res.redirect("/login");
        }

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).redirect("/");
        }

        const directory = await prisma.directory.findUnique({
            where: {
                uniqueIdentifier: req.params.uniqueIdentifier,
            },
        });

        if (directory !== null) {
            const newPath =
                directory.path.substring(
                    0,
                    directory.path.lastIndexOf("/") + 1,
                ) + req.body.directoryName;

            await fs.rename(directory.path, newPath);

            await prisma.directory.update({
                where: {
                    uniqueIdentifier: req.params.uniqueIdentifier,
                },
                data: {
                    path: newPath,
                },
            });

            return res.redirect("/directory/" + directory.uniqueIdentifier);
        }

        res.status(404).send("Directory not found");
    },
);

directoryRouter.post("/:uniqueIdentifier/delete", async (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("Not authenticated");

        return res.redirect("/login");
    }

    const directory = await prisma.directory.findUnique({
        where: {
            uniqueIdentifier: req.params.uniqueIdentifier,
        },
    });

    if (directory !== null) {
        await fs.rm(directory.path, { recursive: true, force: true });

        const filesInDirectory = await prisma.fileInformation.findMany({
            where: {
                destinationOfFilename: {
                    startsWith: directory.path,
                },
            },
            include: { file: true },
        });

        const directoriesInDirectory = await prisma.directory.findMany({
            where: {
                path: {
                    startsWith: directory.path,
                },
            },
        });

        console.log(1, directory, filesInDirectory, directoriesInDirectory);

        const filesId = filesInDirectory.map((file) => file.fileId);
        const directoriesId = directoriesInDirectory.map(
            (directory) => directory.id,
        );

        await prisma.$transaction([
            prisma.fileInformation.deleteMany({
                where: {
                    fileId: { in: filesId },
                },
            }),
            prisma.file.deleteMany({
                where: {
                    id: { in: filesId },
                },
            }),
            prisma.directory.deleteMany({
                where: {
                    id: { in: directoriesId },
                },
            }),
        ]);

        res.redirect("/");
    }
});

export default directoryRouter;
