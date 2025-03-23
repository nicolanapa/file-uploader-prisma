import { Router } from "express";
import { prisma } from "../app.js";
import { body, validationResult } from "express-validator";

const validateDuration = [
    body("duration")
        .trim()
        .notEmpty()
        .withMessage("Duration field must not be empty")
        .isInt({ min: 1, max: 1000 })
        .withMessage("Duration must be between 1 and 1000"),
    body("type")
        .trim()
        .notEmpty()
        .withMessage("Type must not be empty")
        .not()
        .isIn(["min", "hour", "day", "month", "year"])
        .withMessage("Wrong type"),
];

const sharedRouter = new Router();

sharedRouter.get("/", async (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("Not authenticated");

        return res.redirect("/login");
    }

    if (req.query.directory === undefined || req.query.directory === "") {
        return res.redirect("/");
    }

    if (
        await prisma.directory.findUnique({
            where: {
                uniqueIdentifier: req.query.directory,
            },
        })
    ) {
        return res
            .status(200)
            .render("./sharedForm", {
                uniqueIdentifier: req.query.uniqueIdentifier,
            });
    }

    return res.redirect("/");
});

sharedRouter.get("/:sharedUniqueIdentifier", async (req, res) => {
    console.log("shared directory id", req.params.sharedUniqueIdentifier);

    if (!Number.isInteger(parseInt(req.params.sharedUniqueIdentifier))) {
        return res.status(400).send("Unique Identifier is not an Integer");
    }

    const directory = await prisma.sharedDirectory.findUnique({
        where: {
            id: parseInt(req.params.sharedUniqueIdentifier),
        },
        include: {
            directory: true,
        },
    });

    console.log(directory);

    if (directory === null) {
        return res.status(404).send("Shared Directory Not Found");
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

sharedRouter.post("/:uniqueIdentifier", validateDuration, async (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("Not authenticated");

        return res.redirect("/login");
    }

    const errors = validationResult(req);

    console.log(errors.array());

    if (!errors.isEmpty()) {
        return res.status(400).redirect("/");
    }

    const directory = await prisma.directory.findUnique({
        where: {
            uniqueIdentifier: req.params.uniqueIdentifier,
        },
    });

    if (directory !== null) {
        //
    }

    res.status(404).send("Directory to be shared not found");
});

export default sharedRouter;
