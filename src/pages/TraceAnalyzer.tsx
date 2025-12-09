import { useState } from "react";
import { TraceList } from "@/components/trace/TraceList";
import { TraceDetail } from "@/components/trace/TraceDetail";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function TraceAnalyzer() {
  const [selectedTraceId, setSelectedTraceId] = useState<string | undefined>();

  return (
    <div className="h-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
          <div className="h-full overflow-y-auto p-4">
            <div className="mb-4">
              <h1 className="text-2xl font-bold mb-2">Traces</h1>
              <p className="text-sm text-muted-foreground">
                View agent traces from supervisor-v1 and seer-v1 projects
              </p>
            </div>
            <TraceList
              onSelectTrace={setSelectedTraceId}
              selectedTraceId={selectedTraceId}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full overflow-y-auto p-4">
            {selectedTraceId ? (
              <>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold">Trace Details</h2>
          </div>
                <TraceDetail traceId={selectedTraceId} />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg mb-2">Select a trace to view details</p>
                  <p className="text-sm">
                    Choose a trace from the list on the left to see its nested runs and execution details.
                  </p>
                </div>
              </div>
            )}
      </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
