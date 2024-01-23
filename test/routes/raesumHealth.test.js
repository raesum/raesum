import raesumHealthController from "../../src/controllers/raesumHealth.js";
import raesumDB from "../../src/modules/raesumDB.js"
import * as express from "express";
import config from "config";
import {jest} from '@jest/globals'
import { getMockReq, getMockRes } from '@jest-mock/express'

jest.mock('../../src/controllers/raesumHealth.js')

const req = getMockReq()
const { res, next, mockClear } = getMockRes()


describe("Testing Health Check", ()=>{
    afterEach(() => {
        jest.resetModules();
        jest.restoreAllMocks();
    });
    beforeEach(() => {
        mockClear() // can also use clearMockRes()
    })

    test('System is Healthy', async () => {

        const configMock = jest.spyOn(raesumDB,"query").mockImplementation(()=>{
            return {
                "rows": [
                    {
                        "Healthy": 1
                    }
                ]
            }
        });


        await raesumHealthController(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    test('System is Connected to DB but Unhealthy', async () => {
        const configMock = jest.spyOn(raesumDB,"query").mockImplementation(()=>{
            return {}
        });

        await raesumHealthController(req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
    });
    test('System is Connected to DB but Unhealthy', async () => {
        const configMock = jest.spyOn(raesumDB,"query").mockImplementation(()=>{
            throw new Error("Simulating DB Fail")
        });

        await raesumHealthController(req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
    });
})
