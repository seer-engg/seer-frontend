/**
 * Detailed test script for 'events' stream mode
 * Specifically looks for tool calls, thinking steps, and node execution events
 */

import { Client } from "@langchain/langgraph-sdk";

const SUPERVISOR_URL = "http://localhost:8000";
const SUPERVISOR_AGENT_ID = "supervisor";

async function testEventsMode() {
  console.log("🔍 Detailed Events Mode Test\n");
  console.log(`Testing: ${SUPERVISOR_URL}`);
  console.log(`Agent: ${SUPERVISOR_AGENT_ID}\n`);

  const client = new Client({ apiUrl: SUPERVISOR_URL });
  
  const thread = await client.threads.create();
  const threadId = thread.thread_id;
  console.log(`Thread ID: ${threadId}\n`);

  const startTime = Date.now();
  let thinkingEvents = [];
  let toolEvents = [];
  let nodeEvents = [];

  try {
    const stream = client.runs.stream(threadId, SUPERVISOR_AGENT_ID, {
      input: {
        messages: [{ role: "user", content: "What can you do?" }],
        todos: [],
        tool_call_counts: { _total: 0 },
      },
      streamMode: "events",
    });

    console.log("📡 Starting event stream...\n");

    for await (const chunk of stream) {
      const elapsed = Date.now() - startTime;
      const event = chunk.event || "unknown";
      const data = chunk.data || {};

      // Log all events
      console.log(`[+${elapsed}ms] ${event}`);

      // Track thinking-related events
      if (event.includes("think") || 
          (data.name && data.name.includes("think")) ||
          (data.tool && data.tool.includes("think"))) {
        thinkingEvents.push({ elapsed, event, data });
        console.log(`  🧠 THINKING EVENT DETECTED`);
      }

      // Track tool-related events
      if (event.includes("tool") || 
          (data.name && typeof data.name === "string" && !data.name.includes("think") && data.name.length > 0) ||
          (data.tool)) {
        toolEvents.push({ elapsed, event, data });
        console.log(`  🔧 TOOL EVENT DETECTED: ${data.name || data.tool || "unknown"}`);
      }

      // Track node execution events
      if (event.includes("node") || event.includes("start") || event.includes("end")) {
        nodeEvents.push({ elapsed, event, data });
        console.log(`  📦 NODE EVENT: ${data.node || data.name || "unknown"}`);
      }

      // Log data structure for interesting events
      if (event === "data" || event === "updates" || event === "values") {
        console.log(`  Data structure:`, JSON.stringify(data).substring(0, 300));
      }

      // Check for messages with tool calls
      if (data.messages && Array.isArray(data.messages)) {
        const toolCallMessages = data.messages.filter(m => 
          m.tool_calls || m.type === "tool" || m.name === "think"
        );
        if (toolCallMessages.length > 0) {
          console.log(`  📨 Found ${toolCallMessages.length} tool-related messages in data`);
          toolCallMessages.forEach((msg, idx) => {
            console.log(`    Message ${idx + 1}:`, {
              type: msg.type,
              name: msg.name,
              tool_calls: msg.tool_calls?.length || 0,
              content: typeof msg.content === "string" ? msg.content.substring(0, 100) : typeof msg.content,
            });
          });
        }
      }

      // Check nested node updates
      if (typeof data === "object" && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          if (key !== "messages" && typeof value === "object" && value !== null) {
            if (value.messages && Array.isArray(value.messages)) {
              const nestedToolCalls = value.messages.filter(m => 
                m.tool_calls || m.type === "tool" || m.name === "think"
              );
              if (nestedToolCalls.length > 0) {
                console.log(`  🔍 Node '${key}' contains ${nestedToolCalls.length} tool-related messages`);
              }
            }
          }
        }
      }

      console.log("");
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total thinking events: ${thinkingEvents.length}`);
    console.log(`Total tool events: ${toolEvents.length}`);
    console.log(`Total node events: ${nodeEvents.length}`);
    
    if (thinkingEvents.length > 0) {
      console.log("\n🧠 Thinking Events Timeline:");
      thinkingEvents.forEach((e, idx) => {
        console.log(`  ${idx + 1}. [+${e.elapsed}ms] ${e.event}`);
      });
    }

    if (toolEvents.length > 0) {
      console.log("\n🔧 Tool Events Timeline:");
      toolEvents.forEach((e, idx) => {
        console.log(`  ${idx + 1}. [+${e.elapsed}ms] ${e.event} - ${e.data.name || e.data.tool || "unknown"}`);
      });
    }

    if (nodeEvents.length > 0) {
      console.log("\n📦 Node Events Timeline:");
      nodeEvents.forEach((e, idx) => {
        console.log(`  ${idx + 1}. [+${e.elapsed}ms] ${e.event} - ${e.data.node || e.data.name || "unknown"}`);
      });
    }

    // Analysis
    console.log("\n📊 Analysis:");
    if (thinkingEvents.length === 0 && toolEvents.length === 0) {
      console.log("  ⚠️  No thinking or tool events detected in stream!");
      console.log("  This suggests events mode may not be emitting tool execution events.");
    } else {
      const firstEvent = Math.min(
        thinkingEvents[0]?.elapsed || Infinity,
        toolEvents[0]?.elapsed || Infinity,
        nodeEvents[0]?.elapsed || Infinity
      );
      const lastEvent = Math.max(
        thinkingEvents[thinkingEvents.length - 1]?.elapsed || 0,
        toolEvents[toolEvents.length - 1]?.elapsed || 0,
        nodeEvents[nodeEvents.length - 1]?.elapsed || 0
      );
      
      if (firstEvent < 1000) {
        console.log(`  ✅ Events start early (+${firstEvent}ms) - real-time streaming`);
      } else {
        console.log(`  ⚠️  Events start late (+${firstEvent}ms) - possible batching`);
      }
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
  }
}

testEventsMode().catch(console.error);

