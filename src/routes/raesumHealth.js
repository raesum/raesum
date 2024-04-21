import express from 'express';
import raesumHealthController from "../controllers/raesumHealth.js";
const raesumHealthRouter = express.Router();


raesumHealthRouter.get('/', raesumHealthController);

export default raesumHealthRouter;