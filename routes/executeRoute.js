import { Router } from "express";
import { CodeExecutor, Worker } from "code-executor";
import RedisServer from "redis-server";
import SnippetStore from "../models/SnippetStore.js";
import dotenv from "dotenv";

const router = Router();
dotenv.config();

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

const server = new RedisServer(6379);
server.open(async (error) => {
  if (error === null) {
    console.log("REDIS STARTED");

    // Route setup inside the Redis server open callback
    router.post("/execute", async (req, res) => {
      let inputs = req.body;

      inputs = inputs.input;

      let buildLang = inputs.language;
      if (buildLang == "Cpp") {
        buildLang = "Cplusplus";
        inputs.language = buildLang;
      } else if (buildLang == "Csharp") {
        buildLang = "csharp";
        inputs.language = buildLang;
      } else if (buildLang == "Java") {
        buildLang = "Java";
        inputs.language = buildLang;
      }
      console.log(buildLang);

      const randNO = getRandomInt(1000);
      const codeExecutor = new CodeExecutor("myExecutor");
      const worker = new Worker("myExecutor");

      try {
        await worker.build([buildLang]);
        worker.start();

        console.log("Received input:", inputs);

        const results = await codeExecutor.runCode(inputs);
        let i = 0;
        if (inputs.testCases) {
          const testResults = inputs.testCases.map((testCase) => {
            const obtainedOutput = results.tests[i].obtainedOutput.trim() || "";
            const remarks = results.tests[i].remarks;
            return {
              ...testCase,
              obtainedOutput,
              remarks,
              exitCode: results.run?.exitCode || 0,
            };
          });
          res.status(200).json({ tests: testResults });
        } else {
          res.status(200).json(results);
        }
      } catch (error) {
        console.error("Code execution failed:", error);
        res
          .status(500)
          .json({ error: "Code execution failed", details: error.message });
      } finally {
        await codeExecutor.stop();
      }
      console.log("Execution finished.");
    });
  } else {
    console.error("Failed to start Redis server:", error);
  }
});

export default router;
