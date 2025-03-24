import { Router } from "express";
import { prisma } from "../app.js";
import { body, validationResult } from "express-validator";

const returnMs = (duration, type) => {
    switch (type) {
        case "minute":
            return 60000 * duration;
        case "hour":
            return 3600000 * duration;
        case "day":
            return 86400000 * duration;
        case "month":
            return 2629800000 * duration;
        case "year":
            return 31557600000 * duration;
    }
};

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
        .isIn(["minute", "hour", "day", "month", "year"])
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

    const directory = await prisma.directory.findUnique({
        where: {
            uniqueIdentifier: req.query.directory,
        },
    });

    if (directory !== null) {
        return res.status(200).render("./sharedForm", {
            uniqueIdentifier: req.query.directory,
            directory: directory,
        });
    }

    return res.redirect("/");
});

sharedRouter.get("/file/:uniqueIdentifier", async (req, res) => {
    const file = await prisma.file.findUnique({
        where: {
            filename: req.params.uniqueIdentifier,
        },
        include: {
            fileInformation: true,
        },
    });

    if (file !== null) {
        const directory = await prisma.directory.findUnique({
            where: {
                path: file.fileInformation.destinationOfFilename,
            },
        });

        console.log(file, directory);

        if (directory !== null) {
            const directoryIsShared = await prisma.sharedDirectory.findUnique({
                where: {
                    directoryId: directory.id,
                },
                include: {
                    directory: true,
                },
            });

            console.log(directoryIsShared);

            return res
                .status(200)
                .render("./fileDetails", { file: file, shared: true });
        }
    }

    res.status(404).send("Shared File not existing or being shared");
});

sharedRouter.get("/directory/:uniqueIdentifier", (req, res) => {});

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
            path: { startsWith: directory.directory.path },
            NOT: {
                path: {
                    equals: directory.directory.path,
                },
            },
        },
    });

    const filesInDirectory = await prisma.file.findMany({
        where: {
            fileInformation: {
                destinationOfFilename: directory.directory.path,
            },
        },
        include: {
            fileInformation: true,
        },
    });

    res.status(200).render("./sharedDirectory", {
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
        console.log(req.body);

        const directoryIsShared = await prisma.sharedDirectory.findUnique({
            where: {
                id: directory.id,
            },
        });

        console.log(directoryIsShared);

        let startDate = new Date();
        let untilDate = new Date(
            startDate.getTime() + returnMs(req.body.duration, req.body.type),
        );

        if (directoryIsShared !== null) {
            await prisma.sharedDirectory.update({
                where: {
                    directoryId: directory.id,
                },
                data: {
                    duration: Number.parseInt(req.body.duration),
                    type: req.body.type,
                    startDate: startDate,
                    untilDate: untilDate,
                },
            });
        } else {
            await prisma.sharedDirectory.create({
                data: {
                    directoryId: directory.id,
                    duration: Number.parseInt(req.body.duration),
                    type: req.body.type,
                    startDate: startDate,
                    untilDate: untilDate,
                },
            });
        }
    }

    res.status(404).send("Directory to be shared not found");
});

export default sharedRouter;
