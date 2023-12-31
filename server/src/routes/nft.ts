import express from "express";
import { nftControllers } from "../controllers";
import { body } from "express-validator";
const router = express.Router();

router.get("/get-create", nftControllers.getCreate);

export default router;
