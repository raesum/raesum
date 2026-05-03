import express from 'express';
import raesumUser from "../controllers/raesumUser.js";


const raesumUserRouter = express.Router();


raesumUserRouter.get('/get/:userId', raesumUser.getUserById);
raesumUserRouter.get('/get/', raesumUser.getUserById);

raesumUserRouter.get('/metadata/get/keys/', raesumUser.getMetaDataKeys);
raesumUserRouter.get('/metadata/get/byKey/:key/:userId', raesumUser.getOneUserMetaData);
raesumUserRouter.get('/metadata/get/byKey/:key', raesumUser.getOneUserMetaData);
raesumUserRouter.get('/metadata/get/:userId', raesumUser.getAllUserMetaData);
raesumUserRouter.get('/metadata/get', raesumUser.getAllUserMetaData);
raesumUserRouter.get('/metadata/resync', raesumUser.resyncUserFromCognito); // TO-DO rate-limit this

raesumUserRouter.get('/organization/getAllowed', raesumUser.getAllowedOrgs);

raesumUserRouter.post('/metadata/set/byKey/:key/:userId', raesumUser.setOneUserMetaData);
raesumUserRouter.post('/metadata/set/byKey/:key/', raesumUser.setOneUserMetaData);
raesumUserRouter.post('/metadata/delete/byKey/:key/:userId', raesumUser.deleteOneUserMetaData);
raesumUserRouter.post('/metadata/delete/byKey/:key/', raesumUser.deleteOneUserMetaData);

raesumUserRouter.post('/activation/set/:userId', raesumUser.setUserActivation);
raesumUserRouter.post('/activation/set/', raesumUser.setUserActivation);

raesumUserRouter.post('/organization/set/:userId', raesumUser.changeUserOrg);
raesumUserRouter.post('/organization/set/', raesumUser.changeUserOrg);


export default raesumUserRouter;