import passport from "passport";
import LocalStrategy from "passport-local";
import { prisma } from "../app.js";
import * as argon2 from "argon2";

const customFields = {
    usernameField: "username",
    passwordField: "hashedPassword",
};

passport.use(
    new LocalStrategy(customFields, async (username, password, done) => {
        const user = prisma.user.findUnique({
            data: {
                username: username,
            },
        });

        console.log(user);

        if (!user) {
            return done(null, false);
        }

        if (!argon2.verify(user.hashedPassword, password)) {
            return done(null, false);
        }

        return done(null, user);
    }),
);

export default passport;
