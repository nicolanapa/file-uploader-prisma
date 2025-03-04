import { Router } from "express";
import { prisma } from "../app.js";

const fileRouter = Router();

fileRouter.get("/:uniqueIdentifier", async (req, res) => {
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

export default fileRouter;
