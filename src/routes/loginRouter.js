import { Router } from "express";
import * as argon2 from "argon2";
import { prisma } from "../app.js";
import passport from "../db/passport.js";

const loginRouter = new Router();

loginRouter.get("/", (req, res) => {
    res.status(200).render("./login");
});

loginRouter.post(
    "/",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
    }),
);

loginRouter.post("/signup", async (req, res) => {
    console.log(req.body);

    const user = await prisma.user.findUnique({
        where: {
            username: req.body.username,
        },
    });

    console.log(user);

    if (user === null || user.length === 0) {
        console.log("Creating user:", req.body.username);

        const hashedPassword = await argon2.hash(req.body.password);
        console.log(hashedPassword);

        const createUser = await prisma.user.create({
            data: {
                username: req.body.username,
                hashedPassword: hashedPassword,
            },
        });

        console.log(createUser);

        console.log(await prisma.user.findMany());

        return res
            .status(createUser ? 201 : 500)
            .send(createUser ? "created" : "error");
    }

    res.status(500).send("user already existing");
});

export default loginRouter;
