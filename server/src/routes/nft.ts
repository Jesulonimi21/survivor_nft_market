import express from "express";
import { nftControllers } from "../controllers";
const router = express.Router();

router.get("/get-create", nftControllers.getCreate);
router.post("/send-create", nftControllers.sendCreate);

export default router;
