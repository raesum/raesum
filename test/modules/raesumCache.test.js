import raesumConfig from '../../src/modules/raesumConfig';
import raesumCache from "../../src/modules/raesumCache.js";
import config from "config";
import {jest} from '@jest/globals'

describe("Raesum Cache Memory Mode", () => {
    beforeEach(async ()=>{
        await raesumCache.reset();
    });


    // Wait for 20ms to ensure the cache has expired
   test('Get and Set a Key',async ()=> {
       const configMock = jest.spyOn(raesumConfig,"get").mockImplementation((key)=>{
           let returnVal;
           if(key=="connections.cache.type"){
               returnVal="memory"
           }
           return returnVal
       });

       const step1 = await raesumCache.set("testKey","testValue",1000);
       const step2 = await raesumCache.get("testKey");
       expect(step1).toBeTruthy();
       expect(step2).toBe("testValue");
    });
    test('Delete a Key',async ()=>{
        const configMock = jest.spyOn(raesumConfig,"get").mockImplementation((key)=>{
            let returnVal;
            if(key=="connections.cache.type"){
                returnVal="memory"
            }
            return returnVal
        });

        const step1 = await raesumCache.set("testKey","testValue",1000);
        const step3 = await raesumCache.delete("testKey");
        expect(step3).toBeTruthy();
    });
    test('Delete a Key that does not exist',async ()=>{
        const configMock = jest.spyOn(raesumConfig,"get").mockImplementation((key)=>{
            let returnVal;
            if(key=="connections.cache.type"){
                returnVal="memory"
            }
            return returnVal
        });

        const step4 = await raesumCache.delete("testKeyNotExist");
        expect(step4).toBeFalsy();
    });

    // test('Test Key Expiration',async ()=>{
    //     const step1a = raesumCache.set("testKey2","testValue",10);
    //     delay(20);
    //     const step5 = raesumCache.get("testKey2");
    //     await expect(step5).resolves.toBeUndefined();
    // });

});