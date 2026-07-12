import { NextResponse } from "next/server";
import { parseTransactionText } from "@/lib/utils/nlpParser";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Input text is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // Self-healing fallback: run local regex engine if API key is not present
    if (!apiKey) {
      const localResult = parseTransactionText(text);
      if (localResult) {
        return NextResponse.json(localResult);
      }
      return NextResponse.json(
        { error: "No API key configured and local parsing failed." },
        { status: 422 }
      );
    }

    // Connect to official Google Gemini REST API endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a financial transaction text parser. Analyze this raw input: "${text}".
Return ONLY a valid JSON object matching this TypeScript interface, without markdown formatting, backticks, or explanatory text:
{
  "title": "string (reflect exactly what the user typed or said in the input, preserving their descriptive sentence)",
  "amount": number (positive value),
  "type": "income" | "expense",
  "category": "string (strictly select one of: Food, Groceries, Rent, Hostel Fee, Canteen, Transport, Shopping, Books & Study, Entertainment, Utilities, Medical, Salary, Freelance, Parents Pocket Allow, Scholarship, Refund, Other)"
}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      // Fall back if Gemini REST endpoint fails (e.g. rate limit)
      const localResult = parseTransactionText(text);
      if (localResult) return NextResponse.json(localResult);
      return NextResponse.json(
        { error: "Gemini API error and local parser failed." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("Empty response returned from model.");
    }

    const parsedData = JSON.parse(candidateText.trim());
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Server API parser error:", error);
    
    // Final defensive fallback: try local regex one last time before returning error
    try {
      const { text } = await request.clone().json();
      const localResult = parseTransactionText(text);
      if (localResult) return NextResponse.json(localResult);
    } catch {}

    return NextResponse.json(
      { error: "Parser exception occurred during processing." },
      { status: 500 }
    );
  }
}
