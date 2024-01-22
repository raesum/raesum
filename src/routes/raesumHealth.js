import express from 'express';
import raesumHealthController from "../controllers/raesumHealth.js";
const raesumHealtRouter = express.Router();


raesumHealtRouter.get('/', raesumHealthController);