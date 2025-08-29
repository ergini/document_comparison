# Document Comparison Tool

A Next.js application that extracts structured pricing data from hotel contract files and provides automated year-over-year price comparisons using AI-powered document analysis.

## Overview

This tool simplifies the process of comparing hotel contract pricing data by automatically extracting structured information from PDF and Excel files, then performing intelligent matching and price difference analysis. It's designed to handle heterogeneous contract formats and provide clear, actionable insights into pricing changes.

## Features

- **Multi-format Support**: Process PDF and Excel files (.xlsx, .xls)
- **AI-Powered Extraction**: Uses Google Gemini AI for intelligent document parsing
- **Smart Matching**: Automatically matches items across contracts based on hotel name, room type, and date periods
- **Price Analysis**: Calculates price differences and provides summary statistics
- **Structured Output**: Returns normalized JSON data for further processing

## Getting Started

### Prerequisites

- Node.js (version 20 or higher) - Download from [nodejs.org](https://nodejs.org)
- Google AI Studio API key

### Installation


1. **Install dependencies**
```bash
pnpm install
```

2. **Configure API key**
- Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to create a free API key
- Create a `.env.local` file in your project root
- Add your API key: `GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here`

3. **Start the development server**
```bash
pnpm dev
```

4. **Access the application**
Open your browser and navigate to `http://localhost:3200`

## Usage

### Web Interface

1. Upload your first contract file (Contract A)
2. Upload your second contract file (Contract B)
3. Click "Run Extraction" to process the files
4. Review the comparison results showing:
   - **Matches**: Items found in both contracts with price differences
   - **Only in A**: Items exclusive to the first contract
   - **Only in B**: Items exclusive to the second contract

### API Usage

You can also use the API directly for programmatic access:

```bash
curl -X POST http://localhost:3200/api/extract \
  -F "contractA=@/path/to/your/first_contract.pdf" \
  -F "contractB=@/path/to/your/second_contract.xlsx"
```

The API returns structured JSON with extracted data and comparison results.

## Data Schema

### Input Items
Each contract item is normalized to the following structure:
```json
{
  "hotel_name": "string",
  "room_type": "string", 
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD",
  "price": 0,
  "currency": "EUR"
}
```

### API Response
```json
{
  "contract_a_data": [...],
  "contract_b_data": [...],
  "comparison": {
    "matches": [
      {
        "hotel_name": "string",
        "room_type": "string",
        "period_start": "YYYY-MM-DD",
        "period_end": "YYYY-MM-DD",
        "price_a": 0,
        "price_b": 0,
        "currency": "EUR",
        "price_delta": 0
      }
    ],
    "only_in_a": [...],
    "only_in_b": [...],
    "summary": {
      "count_matches": 0,
      "median_delta": 0,
      "avg_delta": 0
    }
  }
}
```

## Technical Specifications

### Supported File Types
- PDF files
- Excel files (.xlsx, .xls)

### File Size Limits
- Maximum 10MB per file

### Technology Stack
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Google Gemini AI** - Document processing and extraction
- **Tailwind CSS** - Styling framework
- **shadcn/ui** - UI component library

## Limitations and Considerations

### Current Limitations
- File size limited to 10MB per file
- Requires structured pricing data for best results
- Subject to Google AI API usage limits

### Data Processing
- Files are processed locally and sent to Google's AI service for analysis
- Ensure compliance with your organization's data handling policies
- Review Google AI Studio's terms of service and privacy policies

## Error Handling

The application provides graceful error handling for:
- Invalid file types
- Corrupted files
- Model processing failures

## Development

This is a standalone application with no database dependencies or authentication requirements. All processing is performed in-memory for simplicity and privacy.

---

Built with Next.js, TypeScript, and Google Gemini AI