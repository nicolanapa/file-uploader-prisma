import passport from "passport";
import LocalStrategy from "passport-local";
import { prisma } from "../app.js";
import * as argon2 from "argon2";

const customFields = {
    usernameField: "username",
    passwordField: "password",
};

passport.use(
    new LocalStrategy(customFields, async (username, password, done) => {
        const user = await prisma.user.findUnique({
            where: {
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

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = prisma.user.findUnique({ where: { id: id } });

        done(null, user);
    } catch (err) {
        done(err);
    }
});
export default passport;
