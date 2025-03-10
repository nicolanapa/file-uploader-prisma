import { Router } from "express";
import { prisma } from "../app.js";
import { body, validationResult } from "express-validator";
import * as fs from "node:fs/promises";

const validateFileName = [
    body("fileName")
        .trim()
        .notEmpty()
        .withMessage("File Name must not be empty")
        .not()
        .contains("/")
        .withMessage("No / symbols are allowed")
        .not(),
];

const fileRouter = Router();

fileRouter.get("/:uniqueIdentifier", async (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("Not authenticated");

        return res.redirect("/login");
    }

    console.log("drive", req.params.uniqueIdentifier);

    const file = await prisma.file.findUnique({
        where: {
            filename: req.params.uniqueIdentifier,
        },
        include: {
            fileInformation: true,
        },
    });

    console.log(file);

    if (file === null) {
        return res.redirect("/");
    }

    res.status(200).render("./fileDetails", {
        file: file ? file : {},
    });
});

fileRouter.post(
    "/:uniqueIdentifier/rename",
    validateFileName,
    async (req, res) => {
        if (!req.isAuthenticated()) {
            console.log("Not authenticated");

            return res.redirect("/login");
        }

        const errors = validationResult(req);

        console.log(errors.array());

        if (!errors.isEmpty()) {
            return res.status(400).redirect("/");
        }

        const file = await prisma.file.findUnique({
            where: {
                filename: req.params.uniqueIdentifier,
            },
            include: {
                fileInformation: true,
            },
        });

        if (file !== null) {
            console.log(file);

            const anotherFileDoesExist =
                await prisma.fileInformation.findUnique({
                    where: {
                        destinationFilename: {
                            destinationOfFilename:
                                file.fileInformation.destinationOfFilename,
                            originalFilename: req.body.fileName,
                        },
                    },
                });

            if (anotherFileDoesExist !== null) {
                return res
                    .status(409)
                    .send("File with the same file name already exists");
            }

            await prisma.fileInformation.update({
                where: {
                    fileId: file.id,
                },
                include: {
                    file: true,
                },
                data: {
                    originalFilename: req.body.fileName,
                },
            });

            return res.redirect("/");
        }

        res.status(404).send("File not found");
    },
);

export default fileRouter;
