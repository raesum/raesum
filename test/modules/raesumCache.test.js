import raesumConfig from '../../src/modules/raesumConfig';
import raesumCache from "../../src/modules/raesumCache.js";
import config from 'config';
import {jest} from '@jest/globals'


describe("Raesum Cache Redis Mode", () => {
// If a redis server is available test redis based cache

    const redisTestsEnabled = config.get("developmentAndTesting.integrationTestEnabled.redis");
    console.log("Redis Tests Enabled: " + redisTestsEnabled);

    const iftest = (redisTestsEnabled) ? test : test.skip;

    afterEach(async () => {
        await raesumCache.cleanup();
    });
    // Test redis based cache and base function
    iftest('Get and Set a Key Redis Cache', async () => {
        const configMock = jest.spyOn(raesumConfig, "get").mockImplementation((key) => {
            let returnVal;
            if (key == "cache.type") {
                returnVal = "redis"
            } else if (key == "cache.prefix") {
                returnVal = "raesum_test_cache_"
            }
            return returnVal
        });
        const step1 = await raesumCache.set("testKey", "testValue", 1000);
        const step2 = await raesumCache.get("testKey");

        expect(step1).toBeTruthy();
        expect(step2).toBe("testValue");
    });

    iftest('Delete a Key Redis Cache', async () => {
        const configMock = jest.spyOn(raesumConfig, "get").mockImplementation((key) => {
            let returnVal;
            if (key == "cache.type") {
                returnVal = "redis"
            } else if (key == "cache.prefix") {
                returnVal = "raesum_test_cache_"
            }
            return returnVal
        });
        const step1 = await raesumCache.set("testKey", "testValue", 1000);
        const step3 = await raesumCache.delete("testKey");
        expect(step3).toBeTruthy();
    });

    iftest('Delete a Key that does not exist Redis Cache', async () => {
        const configMock = jest.spyOn(raesumConfig, "get").mockImplementation((key) => {
            let returnVal;
            if (key == "cache.type") {
                returnVal = "redis"
            } else if (key == "cache.prefix") {
                returnVal = "raesum_test_cache_"
            }
            return returnVal
        });
        const step4 = await raesumCache.delete("testKeyNotExist");
        expect(step4).toBeFalsy();
    });

});


describe("Raesum Cache Memory Mode", () => {
    beforeEach(async () => {
        await raesumCache.reset();
    });

    afterEach(async () => {
        await raesumCache.cleanup();
    });

    //Test memory based cache and base function
    test('Get and Set a Key', async () => {
        const configMock = jest.spyOn(raesumConfig, "get").mockImplementation((key) => {
            let returnVal;
            if (key == "cache.type") {
                returnVal = "memory"
            } else if (key == "cache.prefix") {
                returnVal = "raesum_test_cache_"
            }
            return returnVal
        });

        const step1 = await raesumCache.set("testKey", "testValue", 1000);
        const step2 = await raesumCache.get("testKey");
        expect(step1).toBeTruthy();
        expect(step2).toBe("testValue");
    });
    test('Delete a Key', async () => {
        const configMock = jest.spyOn(raesumConfig, "get").mockImplementation((key) => {
            let returnVal;
            if (key == "cache.type") {
                returnVal = "memory"
            } else if (key == "cache.prefix") {
                returnVal = "raesum_test_cache_"
            }
            return returnVal
        });

        const step1 = await raesumCache.set("testKey", "testValue2", 1000);
        const step2 = await raesumCache.get("testKey");
        const step3 = await raesumCache.delete("testKey");
        const step4 = await raesumCache.get("testKey");
        expect(step3).toBeTruthy();
    });
    test('Delete a Key that does not exist', async () => {
        const configMock = jest.spyOn(raesumConfig, "get").mockImplementation((key) => {
            let returnVal;
            if (key == "cache.type") {
                returnVal = "memory"
            } else if (key == "cache.prefix") {
                returnVal = "raesum_test_cache_"
            }
            return returnVal
        });

        const step4 = await raesumCache.delete("testKeyNotExist");
        expect(step4).toBeFalsy();
    });


});
