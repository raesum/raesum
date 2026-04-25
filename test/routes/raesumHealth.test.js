import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import raesumHealthController from "../../src/controllers/raesumHealth.js";
import raesumDB from "../../src/modules/raesumDB.js";

// Mock Express req, res, next objects
const createMockReq = () => ({
  method: 'GET',
  url: '/health',
  headers: {},
  query: {},
  params: {},
  body: {}
});

const createMockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnThis();
  res.send = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  res.end = vi.fn().mockReturnThis();
  return res;
};

const createMockNext = () => vi.fn();

describe("Testing Health Check", () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = createMockNext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('System is Healthy', async () => {
    const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({
      rows: [
        {
          Healthy: 1
        }
      ]
    });

    await raesumHealthController(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      "title": "Health Check",
      "message": "Passed",
      "messageId": 0
    });
    
    dbMock.mockRestore();
  });

  test('System is Connected to DB but Unhealthy - No rows', async () => {
    const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({});

    await raesumHealthController(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      "title": "Health Check",
      "message": "Failed",
      "messageId": 0
    });
    
    dbMock.mockRestore();
  });

  test('System is Connected to DB but Unhealthy - Empty rows', async () => {
    const dbMock = vi.spyOn(raesumDB, "query").mockResolvedValue({
      rows: []
    });

    await raesumHealthController(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      "title": "Health Check",
      "message": "Failed",
      "messageId": 0
    });
    
    dbMock.mockRestore();
  });

  test('System fails to connect to DB', async () => {
    const dbMock = vi.spyOn(raesumDB, "query").mockRejectedValue(new Error("Simulating DB Fail"));

    await raesumHealthController(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      "title": "Health Check",
      "message": "Failed",
      "messageId": 0
    });
    
    dbMock.mockRestore();
  });
});
