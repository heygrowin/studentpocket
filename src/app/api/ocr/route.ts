import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { image, mimeType } = await request.json();
    if (!image || !mimeType) {
      return NextResponse.json(
        { error: "Base64 image string and MIME type are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured on the server." },
        { status: 500 }
      );
    }

    // Call Gemini 1.5 Flash REST API with multimodal inputs (Text instructions + Image inlineData)
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
                  text: `Analyze this payment receipt or transaction screenshot (from apps like Google Pay, PhonePe, Paytm, banking notifications, or credit cards).
Extract the merchant or sender name as the title, the total transacted amount, the transaction date, and the category.
Return ONLY a valid JSON object matching this TypeScript interface, without markdown formatting, backticks, or explanatory text:
{
  "title": "string (cleaned name of merchant, sender, or store)",
  "amount": number (positive value),
  "type": "expense" | "income",
  "category": "string (strictly select one of: Food, Groceries, Rent, Hostel Fee, Canteen, Transport, Shopping, Books & Study, Entertainment, Utilities, Medical, Salary, Freelance, Parents Pocket Allow, Scholarship, Refund, Other)",
  "date": "string (format YYYY-MM-DD, default to today if not visible)"
}`
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API OCR request failure:", errText);
      return NextResponse.json(
        { error: "Failed to parse receipt image via Gemini API." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("No structured text returned from the multimodal model.");
    }

    const parsedData = JSON.parse(candidateText.trim());
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("OCR API Route Exception:", error);
    return NextResponse.json(
      { error: "Failed to process receipt image scan." },
      { status: 500 }
    );
  }
}
