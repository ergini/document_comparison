import { NextRequest, NextResponse } from "next/server";
import { extractFileData } from "@/lib/extract";
import { compareFiles } from "@/lib/compare";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileA = formData.get("fileA") as File;
    const fileB = formData.get("fileB") as File;

    if (!fileA || !fileB) {
      return NextResponse.json(
        { error: "Both files are required" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (
      !allowedTypes.includes(fileA.type) ||
      !allowedTypes.includes(fileB.type)
    ) {
      return NextResponse.json(
        { error: "Only PDF and Excel files (.pdf, .xlsx, .xls) are supported" },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (fileA.size > maxSize || fileB.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 500 }
      );
    }

    const extractionResult = await extractFileData(fileA, fileB);
    const comparison = compareFiles(
      extractionResult.contract_a_data,
      extractionResult.contract_b_data
    );

    const response = {
      contract_a_data: extractionResult.contract_a_data,
      contract_b_data: extractionResult.contract_b_data,
      comparison,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error processing files:", error);

    const isOverloadedError =
      error instanceof Error &&
      (error.message.includes("model is overloaded") ||
        error.message.includes("overloaded") ||
        error.name === "AI_RetryError");

    const isQuotaError =
      error instanceof Error &&
      (error.message.includes("quota") || error.message.includes("429"));

    const isApiKeyError =
      error instanceof Error && error.message.includes("API key");

    const isExtractionError =
      error instanceof Error && error.message.includes("Failed to extract");

    if (isOverloadedError) {
      return NextResponse.json(
        {
          error:
            "The AI model is currently overloaded. Please try again in a few moments.",
          retryable: true,
          errorType: "model_overloaded",
        },
        { status: 422 }
      );
    }

    if (isQuotaError) {
      return NextResponse.json(
        {
          error: "API quota exceeded. Please try again later.",
          retryable: true,
          errorType: "quota_exceeded",
        },
        { status: 429 }
      );
    }

    if (isApiKeyError) {
      return NextResponse.json(
        {
          error: "AI service configuration error. Please check API key setup.",
          retryable: false,
          errorType: "api_key_error",
        },
        { status: 500 }
      );
    }

    if (isExtractionError) {
      return NextResponse.json(
        {
          error: `Document extraction failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          retryable: false,
          errorType: "extraction_failed",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error while processing files",
        retryable: false,
        errorType: "generic",
      },
      { status: 500 }
    );
  }
}
