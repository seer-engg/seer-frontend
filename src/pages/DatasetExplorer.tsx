import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  tracesAPI,
  type DatasetSummary,
  type DatasetDetail,
  type DatasetExample,
  type ExperimentSummary,
} from "@/lib/langsmith-api";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import {
  Database,
  FlaskConical,
  ListFilter,
  RefreshCcw,
  Rows3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LIMIT_OPTIONS = ["10", "25", "50", "100"];

const formatRelativeTime = (value: string | null) => {
  if (!value) return "N/A";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
};

const JsonSnippet = ({ data }: { data: Record<string, unknown> | null | undefined }) => (
  <pre className="rounded-md bg-muted/50 text-xs p-3 max-h-52 overflow-auto whitespace-pre-wrap break-words">
    {data && Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : "No data"}
  </pre>
);

const DatasetCard = ({
  dataset,
  isActive,
  onSelect,
}: {
  dataset: DatasetSummary;
  isActive: boolean;
  onSelect: () => void;
}) => (
  <Card
    className={cn(
      "cursor-pointer transition-all hover:border-primary/50",
      isActive ? "border-primary ring-1 ring-primary/40" : ""
    )}
    onClick={onSelect}
  >
    <CardContent className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{dataset.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {dataset.description || "No description"}
          </p>
        </div>
        {dataset.data_type && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {dataset.data_type}
          </Badge>
        )}
      </div>
      <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
        <span>{dataset.example_count ?? 0} examples</span>
        {dataset.session_count !== null && <span>{dataset.session_count} runs</span>}
        {dataset.created_at && <span>Created {formatRelativeTime(dataset.created_at)}</span>}
      </div>
    </CardContent>
  </Card>
);

const ExampleCard = ({ example, index }: { example: DatasetExample; index: number }) => (
  <Card>
    <CardHeader className="pb-0">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-base font-semibold">Example #{index + 1}</CardTitle>
        {example.created_at && (
          <p className="text-xs text-muted-foreground">{formatRelativeTime(example.created_at)}</p>
        )}
      </div>
    </CardHeader>
    <CardContent className="space-y-3 pt-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
          Inputs
        </p>
        <JsonSnippet data={example.inputs} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
          Outputs
        </p>
        <JsonSnippet data={example.outputs} />
      </div>
      {example.metadata && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
            Metadata
          </p>
          <JsonSnippet data={example.metadata} />
        </div>
      )}
    </CardContent>
  </Card>
);

const ExperimentCard = ({ experiment }: { experiment: ExperimentSummary }) => (
  <Card>
    <CardContent className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{experiment.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {experiment.description || "No description"}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          Experiment
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
        {experiment.start_time && <span>Started {formatRelativeTime(experiment.start_time)}</span>}
        {experiment.end_time && <span>Ended {formatRelativeTime(experiment.end_time)}</span>}
      </div>
      {experiment.metadata && Object.keys(experiment.metadata).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(experiment.metadata).map(([key, value]) => (
            <Badge key={key} variant="outline" className="text-[11px]">
              {key}: {String(value)}
            </Badge>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export default function DatasetExplorer() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>();
  const [search, setSearch] = useState("");
  const [exampleLimit, setExampleLimit] = useState(25);
  const [experimentLimit, setExperimentLimit] = useState(10);

  const {
    data: datasets,
    isLoading: datasetsLoading,
    error: datasetsError,
  } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => tracesAPI.listDatasets({ limit: 200 }),
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!selectedDatasetId && datasets && datasets.length > 0) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets, selectedDatasetId]);

  const {
    data: datasetDetail,
    isLoading: detailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ["dataset-detail", selectedDatasetId, exampleLimit, experimentLimit],
    queryFn: () =>
      tracesAPI.getDatasetDetail(selectedDatasetId!, {
        exampleLimit,
        experimentLimit,
      }),
    enabled: Boolean(selectedDatasetId),
  });

  const filteredDatasets = useMemo(() => {
    if (!datasets) return [];
    if (!search.trim()) return datasets;
    return datasets.filter((dataset) =>
      dataset.name.toLowerCase().includes(search.trim().toLowerCase())
    );
  }, [datasets, search]);

  return (
    <div className="h-full overflow-hidden" data-tour="datasets-page">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={35} minSize={25} maxSize={45}>
          <div className="h-full overflow-y-auto p-4 space-y-4">
            <div>
              <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Datasets
              </h1>
              <p className="text-sm text-muted-foreground">
                Browse LangSmith datasets and view connected experiments.
              </p>
            </div>

            <div className="relative">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search datasets..."
                className="pl-9"
              />
              <ListFilter className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {datasetsLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            )}

            {datasetsError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load datasets. Please verify the backend is running and retry.
                </AlertDescription>
              </Alert>
            )}

            {!datasetsLoading && filteredDatasets.length === 0 && (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  No datasets match your search.
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {filteredDatasets.map((dataset) => (
                <DatasetCard
                  key={dataset.id}
                  dataset={dataset}
                  isActive={dataset.id === selectedDatasetId}
                  onSelect={() => setSelectedDatasetId(dataset.id)}
                />
              ))}
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={65} minSize={35}>
          <div className="h-full overflow-y-auto p-4">
            {!selectedDatasetId && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Card className="w-full max-w-lg">
                  <CardContent className="py-12 text-center space-y-2">
                    <p className="text-lg font-medium">Select a dataset</p>
                    <p className="text-sm">
                      Choose a dataset from the left panel to see its examples and experiments.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {detailError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  Failed to load dataset details.{" "}
                  <Button variant="outline" size="sm" className="ml-2" onClick={() => refetchDetail()}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {selectedDatasetId && !datasetDetail && detailLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full" />
                ))}
              </div>
            )}

            {datasetDetail && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6 pb-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{datasetDetail.name}</h2>
                      <p className="text-sm text-muted-foreground max-w-3xl">
                        {datasetDetail.description || "No description available."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => refetchDetail()}>
                        <RefreshCcw className="h-4 w-4 mr-1" />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">
                          Examples
                        </p>
                        <p className="text-2xl font-semibold">
                          {datasetDetail.example_count ?? datasetDetail.examples.length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">
                          Sessions
                        </p>
                        <p className="text-2xl font-semibold">
                          {datasetDetail.session_count ?? 0}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs uppercase text-muted-foreground mb-1 tracking-wide">
                          Last Run
                        </p>
                        <p className="text-2xl font-semibold text-foreground">
                          {datasetDetail.last_session_start_time
                            ? formatRelativeTime(datasetDetail.last_session_start_time)
                            : "N/A"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Rows3 className="h-4 w-4 text-primary" />
                        <h3 className="text-lg font-semibold">Examples</h3>
                        <Badge variant="secondary">{datasetDetail.examples.length}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={String(exampleLimit)}
                          onValueChange={(value) => setExampleLimit(Number(value))}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Example limit" />
                          </SelectTrigger>
                          <SelectContent>
                            {LIMIT_OPTIONS.map((value) => (
                              <SelectItem key={value} value={value}>
                                {value} rows
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {datasetDetail.examples.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          No examples found in this dataset.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {datasetDetail.examples.map((example, index) => (
                          <ExampleCard key={example.id} example={example} index={index} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-primary" />
                        <h3 className="text-lg font-semibold">Connected Experiments</h3>
                        <Badge variant="secondary">{datasetDetail.experiments.length}</Badge>
                      </div>
                      <Select
                        value={String(experimentLimit)}
                        onValueChange={(value) => setExperimentLimit(Number(value))}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Experiment limit" />
                        </SelectTrigger>
                        <SelectContent>
                          {LIMIT_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value} rows
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {datasetDetail.experiments.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          No experiments reference this dataset yet.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {datasetDetail.experiments.map((experiment) => (
                          <ExperimentCard key={experiment.id} experiment={experiment} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

