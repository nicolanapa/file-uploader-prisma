import { Router } from "express";
import multer from "multer";

const upload = multer({ dest: "./drive" });

const uploadRouter = new Router();

uploadRouter.post("/", upload.single("uploadedFile"), (req, res) => {
    console.log(req.body);
    console.log(req.file);
});

export default uploadRouter;
