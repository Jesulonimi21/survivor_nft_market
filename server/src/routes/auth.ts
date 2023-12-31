import express from "express";
import { authControllers } from "../controllers";
import { body } from "express-validator";
const router = express.Router();

router.post("/signup", [body('title').trim().isLength({min: 5})],
 authControllers.signUp);

export default router;