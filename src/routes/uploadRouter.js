import { Router } from "express";
import multer from "multer";
import { prisma } from "../app.js";

const upload = multer({ dest: "./drive" });

const uploadRouter = new Router();

uploadRouter.post("/", upload.single("uploadedFile"), async (req, res) => {
    // console.log(req.body);
    console.log(req.file);

    const file = await prisma.file.create({
        data: {
            filename: req.file.filename,
            FileInformation: {
                create: {
                    originalFilename: req.file.originalname,
                    sizeInBytes: req.file.size,
                },
            },
        },
    });

    console.log(file);

    res.redirect("/");
});

export default uploadRouter;
