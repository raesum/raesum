import raesumDB from "../src/modules/raesumDB.js";

export default async function globalTeardown() {
  // Close database connections
    await raesumDB.end();
}