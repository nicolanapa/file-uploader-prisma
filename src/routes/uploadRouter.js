import { Router } from "express";
import multer from "multer";
import * as fs from "node:fs/promises";
import { prisma } from "../app.js";
import { cloudFileHandling } from "../db/CloudFileHandling.js";

const upload = multer({ dest: "./drive" });

const uploadRouter = new Router();

uploadRouter.post("/", upload.single("uploadedFile"), async (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("Not authenticated");

        return res.redirect("/login");
    }

    // console.log(req.body);
    console.log(req.file);

    const fileDoesExist = await prisma.fileInformation.findUnique({
        where: {
            destinationFilename: {
                destinationOfFilename: req.body.path,
                originalFilename: req.file.originalname,
            },
        },
    });

    if (fileDoesExist !== null) {
        await fs.rm(req.file.destination + "/" + req.file.filename);

        return res.redirect("/");
    }

    if (req.body.path !== "./drive") {
        await fs.rename(
            "./drive/" + req.file.filename,
            req.body.path + "/" + req.file.filename,
        );
    }

    console.log("Creating table record for file uploaded...");

    const file = await prisma.file.create({
        data: {
            filename: req.file.filename,
            fileInformation: {
                create: {
                    destinationOfFilename: req.body.path,
                    originalFilename: req.file.originalname,
                    sizeInBytes: req.file.size,
                },
            },
        },
    });

    console.log(file);

    res.redirect("/");

    console.log("Uploading the file to the 'Cloud'...");

    const { cloudPublicId, cloudUrl } = await cloudFileHandling.uploadFile(
        req.body.path + "/" + req.file.filename,
    );

    if (cloudPublicId !== "" && cloudUrl !== "") {
        await prisma.fileInformation.update({
            where: {
                fileId: file.id,
            },
            data: {
                cloudPublicId: cloudPublicId,
                cloudUrl: cloudUrl,
            },
        });
    }
});

export default uploadRouter;
