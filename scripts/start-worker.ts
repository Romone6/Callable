import { startExecutionWorker } from "../lib/execution-worker";

async function main() {
  const runtime = await startExecutionWorker();
  console.log("Execution worker started.");

  const shutdown = async () => {
    await runtime.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
