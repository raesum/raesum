import raesumDB from "../src/modules/raesumDB.js";
import raesumCache from "../src/modules/raesumCache.js";

export default async function globalTeardown() {
  // Close database connections
    await raesumDB.end();
    await raesumCache.end();
}