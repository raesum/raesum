import raesumHealthController from "../../src/controllers/raesumHealth.js";
import raesumDB from "../../src/modules/raesumDB.js"
import * as express from "express";
import config from "config";
import {jest} from '@jest/globals'
jest.mock('../../src/controllers/raesumHealth.js')

const mockRequest = () => {
    return {}
}
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(200);
    res.json = jest.fn().mockReturnValue({});
    return res;
}

describe("Testing Health Check", ()=>{
    afterEach(() => {
        jest.resetModules();
        jest.restoreAllMocks();
    });

    test('System is Healthy', async () => {

        const configMock = jest.spyOn(raesumDB,"query").mockImplementation((key)=>{
            let returnVal;
            if(key=="cloudBasedSecrets"){
                returnVal= {
                    "rows": [
                        {
                            "Healthy": 1
                        }
                    ]
                }
            }
            return returnVal
        });

        const mReq = mockRequest();
        const mRes = mockResponse();
        const mNext = jest.fn();
        await raesumHealthController(mReq, mRes, mNext);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('System is Unealthy', async () => {
        const configMock = jest.spyOn(raesumDB,"query").mockImplementation((key)=>{
            let returnVal;
            if(key=="cloudBasedSecrets"){
                returnVal= {

                }
            }
            return returnVal
        });

        const mReq = mockRequest();
        const mRes = mockResponse();
        const mNext = jest.fn();
        await raesumHealthController(mReq, mRes, mNext);
        expect(res.status).toHaveBeenCalledWith(500);
    });

})
