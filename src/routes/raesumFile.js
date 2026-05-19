import express from 'express';
import raesumFile from '../controllers/raesumFile.js';
import raesumFileValidationMiddleware from '../middleware/raesumFileValidator.js';
import multer from 'multer';

const upload = multer({});

const raesumFileRouter = express.Router();

raesumFileRouter.get('/get/:fileId', raesumFile.getById);
raesumFileRouter.get('/get/byUser/:userId', raesumFile.getList);
raesumFileRouter.get('/get/byUser/', raesumFile.getList);

raesumFileRouter.get('/data/:fileId', raesumFile.getFileById);

raesumFileRouter.get('/metadata/get/keys/', raesumFile.getMetadataKeys);
raesumFileRouter.get(
    '/metadata/get/byKey/:key/:fileId',
    raesumFile.getOneFileMetadata
);
raesumFileRouter.get('/metadata/get/:fileId', raesumFile.getAllFileMetadata);

raesumFileRouter.post(
    '/metadata/set/byKey/:key/:fileId',
    raesumFile.setOneFileMetadata
);
raesumFileRouter.post(
    '/metadata/delete/byKey/:key/:fileId',
    raesumFile.deleteOneFileMetadata
);

raesumFileRouter.post(
    '/upload/:fileId',
    upload.single('file'),
    raesumFileValidationMiddleware,
    raesumFile.upload
);
raesumFileRouter.post(
    '/upload/',
    upload.single('file'),
    raesumFileValidationMiddleware,
    raesumFile.upload
);

raesumFileRouter.post('/delete/:fileId', raesumFile.delete);

export default raesumFileRouter;
