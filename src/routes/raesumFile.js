import express from 'express';
import raesumFile from '../controllers/raesumFile.js';
import raesumFileValidationMiddleware from '../middleware/raesumFileValidator.js';
import multer from 'multer';

const upload = multer({});

const raesumFileRouter = express.Router();

raesumFileRouter.get('/get/:fileId', raesumFile.getById);
raesumFileRouter.get('/get/', raesumFile.getList);

raesumFileRouter.get('/data/:fileId', raesumFile.getFileById);

raesumFileRouter.get('/metadata/get/keys/', raesumFile.getMetaDataKeys);
raesumFileRouter.get(
    '/metadata/get/byKey/:key/:fileId',
    raesumFile.getOneFileMetaData
);
raesumFileRouter.get('/metadata/get/:fileId', raesumFile.getAllFileMetaData);

raesumFileRouter.post(
    '/metadata/set/byKey/:key/:fileId',
    raesumFile.setOneFileMetaData
);
raesumFileRouter.post(
    '/metadata/delete/byKey/:key/:fileId',
    raesumFile.deleteOneFileMetaData
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
