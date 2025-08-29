"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ComparisonMatch } from "@/lib/compare";
import { ContractItem } from "@/lib/extract";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const fileSchema = z.object({
  fileA: z
    .custom<FileList>()
    .refine((files) => files && files.length > 0, "File A is required")
    .refine(
      (files) => files && files[0]?.size <= MAX_FILE_SIZE,
      "File size must be less than 10MB"
    )
    .refine(
      (files) => files && ACCEPTED_FILE_TYPES.includes(files[0]?.type),
      "Only PDF and Excel files (.pdf, .xlsx, .xls) are supported"
    ),
  fileB: z
    .custom<FileList>()
    .refine((files) => files && files.length > 0, "File B is required")
    .refine(
      (files) => files && files[0]?.size <= MAX_FILE_SIZE,
      "File size must be less than 10MB"
    )
    .refine(
      (files) => files && ACCEPTED_FILE_TYPES.includes(files[0]?.type),
      "Only PDF and Excel files (.pdf, .xlsx, .xls) are supported"
    ),
});

type FileFormData = z.infer<typeof fileSchema>;

interface ComparisonSummary {
  count_matches: number;
  median_delta: number;
  avg_delta: number;
}

interface ComparisonResult {
  contract_a_data: ContractItem[];
  contract_b_data: ContractItem[];
  comparison: {
    matches: ComparisonMatch[];
    only_in_a: ContractItem[];
    only_in_b: ContractItem[];
    summary: ComparisonSummary;
  };
}

interface ApiError {
  error: string;
  retryable?: boolean;
  errorType?: string;
}

interface ExtendedError extends Error {
  retryable?: boolean;
  errorType?: string;
  status?: number;
}

const extractFiles = async (formData: FormData): Promise<ComparisonResult> => {
  const response = await fetch("/api/extract", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      error: `HTTP error! status: ${response.status}`,
    }));

    const error = new Error(errorData.error) as ExtendedError;
    error.retryable = errorData.retryable;
    error.errorType = errorData.errorType;
    error.status = response.status;
    throw error;
  }

  return response.json();
};

export default function Home() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<FileFormData>({
    resolver: zodResolver(fileSchema),
  });

  const mutation = useMutation({
    mutationFn: extractFiles,
    retry: (failureCount, error: ExtendedError) => {
      if (error?.retryable && failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const fileAFiles = watch("fileA");
  const fileBFiles = watch("fileB");
  const fileA = fileAFiles?.[0];
  const fileB = fileBFiles?.[0];

  const onSubmit = async (data: FileFormData) => {
    const formData = new FormData();
    formData.append("fileA", data.fileA[0]);
    formData.append("fileB", data.fileB[0]);

    mutation.mutate(formData);
  };

  const handleRetry = () => {
    if (fileA && fileB) {
      const formData = new FormData();
      formData.append("fileA", fileA);
      formData.append("fileB", fileB);
      mutation.mutate(formData);
    }
  };

  const isRetryable =
    mutation.error && (mutation.error as ExtendedError)?.retryable;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Document Comparison
          </h1>
          <p className="text-muted-foreground">
            Upload two files to extract and compare pricing data
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>
              Select two files (PDF or XLSX) to compare pricing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="file-a">File A</Label>
                  <Input
                    id="file-a"
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    {...register("fileA")}
                  />
                  {fileA && (
                    <p className="text-sm text-muted-foreground truncate">
                      Selected: {fileA.name}
                    </p>
                  )}
                  {errors.fileA && (
                    <p className="text-sm text-destructive">
                      {errors.fileA.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-b">File B</Label>
                  <Input
                    id="file-b"
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    {...register("fileB")}
                  />
                  {fileB && (
                    <p className="text-sm text-muted-foreground truncate">
                      Selected: {fileB.name}
                    </p>
                  )}
                  {errors.fileB && (
                    <p className="text-sm text-destructive">
                      {errors.fileB.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full md:w-auto"
                >
                  {mutation.isPending ? "Processing..." : "Run Extraction"}
                </Button>
              </div>
            </form>

            {mutation.error && (
              <Alert variant="destructive">
                <AlertDescription className="space-y-3">
                  <div>{mutation.error.message}</div>
                  {isRetryable && (
                    <div className="flex justify-center">
                      <Button
                        onClick={handleRetry}
                        disabled={mutation.isPending}
                        variant="outline"
                        size="sm"
                      >
                        {mutation.isPending ? "Retrying..." : "Retry"}
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {mutation.isSuccess && mutation.data && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">
                      {mutation.data.comparison.matches.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Matches Found
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {mutation.data.comparison.only_in_a.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Only in File A
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {mutation.data.comparison.only_in_b.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Only in File B
                    </div>
                  </div>
                </div>

                {mutation.data.comparison.matches.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Price Comparison Matches</CardTitle>
                      <CardDescription>
                        Items found in both contracts with price differences
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hotel Name</TableHead>
                            <TableHead>Room Type</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>File A Price</TableHead>
                            <TableHead>File B Price</TableHead>
                            <TableHead>Price Delta</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mutation.data.comparison.matches.map(
                            (match: ComparisonMatch, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {match.hotel_name}
                                </TableCell>
                                <TableCell>{match.room_type}</TableCell>
                                <TableCell>
                                  {match.period_start} to {match.period_end}
                                </TableCell>
                                <TableCell>{match.price_a}€</TableCell>
                                <TableCell>{match.price_b}€</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      match.price_delta > 0
                                        ? "destructive"
                                        : match.price_delta < 0
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {match.price_delta > 0 ? "+" : ""}
                                    {match.price_delta}€
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {mutation.data.comparison.only_in_a.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Only in File A</CardTitle>
                      <CardDescription>
                        {mutation.data.comparison.only_in_a.length} items found
                        only in File A
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hotel Name</TableHead>
                            <TableHead>Room Type</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Currency</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mutation.data.comparison.only_in_a.map(
                            (item: ContractItem, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {item.hotel_name}
                                </TableCell>
                                <TableCell>{item.room_type}</TableCell>
                                <TableCell>
                                  {item.period_start} to {item.period_end}
                                </TableCell>
                                <TableCell>{item.price}€</TableCell>
                                <TableCell>{item.currency}</TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {mutation.data.comparison.only_in_b.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Only in File B</CardTitle>
                      <CardDescription>
                        {mutation.data.comparison.only_in_b.length} items found
                        only in File B
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hotel Name</TableHead>
                            <TableHead>Room Type</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Currency</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mutation.data.comparison.only_in_b.map(
                            (item: ContractItem, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {item.hotel_name}
                                </TableCell>
                                <TableCell>{item.room_type}</TableCell>
                                <TableCell>
                                  {item.period_start} to {item.period_end}
                                </TableCell>
                                <TableCell>{item.price}€</TableCell>
                                <TableCell>{item.currency}</TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
