import { Router } from "express";
import { body, validationResult } from "express-validator";
import * as fs from "node:fs/promises";

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
        console.log("drive");

        const errors = validationResult(req);

        console.log(errors.array());

        if (!errors.isEmpty()) {
            return res.status(400).redirect("/");
        }

        try {
            await fs.mkdir("./drive/" + req.body.directoryName, {
                recursive: true,
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

export default directoryRouter;
