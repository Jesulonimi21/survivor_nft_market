import express from "express";
import {authControllers} from "../controllers";
const router = express.Router();

router.post("/signup",  authControllers.signUp);

export default router;