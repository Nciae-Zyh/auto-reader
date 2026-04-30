// Background worker for processing TTS tasks
// Run with: node worker.js

const POLL_INTERVAL = 5000; // 5 seconds

async function processTasks() {
  try {
    const response = await fetch("http://localhost:3000/api/worker/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.processed > 0) {
        console.log(`[Worker] Processed ${data.processed} segments`);
      }
    }
  } catch (error) {
    console.error("[Worker] Error:", error.message);
  }
}

console.log("[Worker] Background worker started");
console.log(`[Worker] Polling every ${POLL_INTERVAL / 1000} seconds`);

setInterval(processTasks, POLL_INTERVAL);
