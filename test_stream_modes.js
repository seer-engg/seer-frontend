/**
 * Test script to compare different LangGraph stream modes
 * Tests: "updates", "events", ["updates", "events"]
 * Measures: timing, event frequency, real-time vs batched behavior
 */

import { Client } from "@langchain/langgraph-sdk";

const SUPERVISOR_URL = "http://localhost:8000";
const SUPERVISOR_AGENT_ID = "supervisor";

async function testStreamMode(mode, testName) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST: ${testName}`);
  console.log(`Stream Mode: ${JSON.stringify(mode)}`);
  console.log(`${"=".repeat(60)}\n`);

  const client = new Client({ apiUrl: SUPERVISOR_URL });
  
  // Create a new thread
  const thread = await client.threads.create();
  const threadId = thread.thread_id;
  console.log(`Created thread: ${threadId}\n`);

  const startTime = Date.now();
  let eventCount = 0;
  let firstEventTime = null;
  let lastEventTime = null;
  const eventTypes = new Set();
  const eventTimestamps = [];

  try {
    const inputData = {
      messages: [
        {
          role: "user",
          content: "What can you do?",
        },
      ],
      todos: [],
      tool_call_counts: { _total: 0 },
    };

    const streamOptions = {
      input: inputData,
      streamMode: mode,
    };

    console.log(`Starting stream with mode: ${JSON.stringify(mode)}...\n`);

    for await (const chunk of client.runs.stream(threadId, SUPERVISOR_AGENT_ID, streamOptions)) {
      const now = Date.now();
      const elapsed = now - startTime;
      
      if (firstEventTime === null) {
        firstEventTime = elapsed;
      }
      lastEventTime = elapsed;
      
      eventCount++;
      const eventType = chunk.event || "unknown";
      eventTypes.add(eventType);
      
      eventTimestamps.push({
        elapsed,
        event: eventType,
        hasData: !!chunk.data,
        dataKeys: chunk.data ? Object.keys(chunk.data) : [],
      });

      // Log each event with timing
      console.log(`[+${elapsed}ms] Event #${eventCount}: ${eventType}`);
      
      if (chunk.data) {
        const dataKeys = Object.keys(chunk.data);
        console.log(`         Data keys: ${dataKeys.join(", ")}`);
        
        // Check for thinking/tool calls in the data
        if (typeof chunk.data === "object") {
          const dataStr = JSON.stringify(chunk.data).substring(0, 200);
          if (dataStr.includes("think") || dataStr.includes("tool") || dataStr.includes("messages")) {
            console.log(`         Contains: ${dataStr}...`);
          }
        }
      }
      
      // Log node updates if present
      if (chunk.data && typeof chunk.data === "object") {
        for (const [key, value] of Object.entries(chunk.data)) {
          if (key !== "messages" && typeof value === "object" && value !== null) {
            console.log(`         Node: ${key}`);
            if (value.messages && Array.isArray(value.messages)) {
              const toolCalls = value.messages.filter(m => 
                m.tool_calls || m.type === "tool" || (m.name && m.name === "think")
              );
              if (toolCalls.length > 0) {
                console.log(`         ⚠️  Found ${toolCalls.length} tool-related messages`);
              }
            }
          }
        }
      }
      
      console.log("");
    }

    // Summary
    console.log(`\n${"-".repeat(60)}`);
    console.log(`SUMMARY for ${testName}:`);
    console.log(`  Total events: ${eventCount}`);
    console.log(`  Event types: ${Array.from(eventTypes).join(", ")}`);
    console.log(`  First event: +${firstEventTime}ms`);
    console.log(`  Last event: +${lastEventTime}ms`);
    console.log(`  Total duration: ${lastEventTime - firstEventTime}ms`);
    console.log(`  Events per second: ${((eventCount / (lastEventTime - firstEventTime)) * 1000).toFixed(2)}`);
    
    // Check if events were batched (all at end) or real-time
    const firstHalf = eventTimestamps.slice(0, Math.floor(eventTimestamps.length / 2));
    const secondHalf = eventTimestamps.slice(Math.floor(eventTimestamps.length / 2));
    
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e.elapsed, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e.elapsed, 0) / secondHalf.length;
      const timeDiff = secondHalfAvg - firstHalfAvg;
      
      console.log(`  First half avg time: +${firstHalfAvg.toFixed(0)}ms`);
      console.log(`  Second half avg time: +${secondHalfAvg.toFixed(0)}ms`);
      console.log(`  Time difference: ${timeDiff.toFixed(0)}ms`);
      
      if (timeDiff > 5000) {
        console.log(`  ⚠️  WARNING: Events appear to be batched (most events at the end)`);
      } else {
        console.log(`  ✅ Events appear to be real-time (distributed throughout execution)`);
      }
    }
    
    console.log(`${"-".repeat(60)}\n`);

  } catch (error) {
    console.error(`\n❌ Error in ${testName}:`, error.message);
    console.error(error.stack);
  }
}

async function main() {
  console.log("🧪 LangGraph Stream Mode Comparison Test");
  console.log(`Testing against: ${SUPERVISOR_URL}`);
  console.log(`Agent ID: ${SUPERVISOR_AGENT_ID}\n`);

  // Test 1: Current mode (updates)
  await testStreamMode("updates", "Current: 'updates' mode");

  // Wait a bit between tests
  console.log("\n⏳ Waiting 3 seconds before next test...\n");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 2: Events mode
  await testStreamMode("events", "New: 'events' mode");

  // Wait a bit between tests
  console.log("\n⏳ Waiting 3 seconds before next test...\n");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 3: Combined mode
  await testStreamMode(["updates", "events"], "Combined: ['updates', 'events'] mode");

  console.log("\n✅ All tests completed!\n");
}

main().catch(console.error);

