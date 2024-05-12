import express from 'express';
import raesumUser from "../controllers/raesumUser.js";
const raesumAuthRouter = express.Router();

raesumAuthRouter.get('/login', raesumUser.login);
raesumAuthRouter.get('/loggedIn', raesumUser.loggedIn);

export default raesumAuthRouter;