import express from "express";
import { nftControllers } from "../controllers";
const router = express.Router();

router.get("/get-create", nftControllers.getCreate);
router.post("/send-create", nftControllers.sendCreate);
router.get("/get-purchase", nftControllers.getPurchase);
router.post("/send-purchase", nftControllers.sendPurchase);
router.get("/get-all-nfts", nftControllers.getNfts);
router.get("/get-sell", nftControllers.getResell);
router.post("/send-sell", nftControllers.sendSell);


export default router;
