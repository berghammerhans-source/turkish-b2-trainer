Deno.serve(async (req: Request) => {
    const ALLOWED_ORIGIN = "http://localhost:3000";
    const CORS_HEADERS = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };
  
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
  
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: Object.assign({ "Content-Type": "application/json" }, CORS_HEADERS) });
    }
  
    let body: { pdfUrl?: string; filename?: string; pdfId?: string };
    try {
      body = await req.json();
    } catch (err) {
      console.error('Invalid JSON body:', err);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: Object.assign({ "Content-Type": "application/json" }, CORS_HEADERS) });
    }
  
    const { pdfUrl, filename, pdfId } = body;
    if (!pdfUrl) {
      return new Response(JSON.stringify({ error: "pdfUrl is required" }), { status: 400, headers: Object.assign({ "Content-Type": "application/json" }, CORS_HEADERS) });
    }
  
    try {
      console.log(`Starting PDF processing for: ${filename || 'unknown'}`);
      
      // Download PDF
      console.log('Downloading PDF from storage...');
      const pdfResp = await fetch(pdfUrl);
      if (!pdfResp.ok) {
        console.error(`Failed to download PDF: ${pdfResp.status} ${pdfResp.statusText}`);
        return new Response(JSON.stringify({ error: `Failed to download PDF: ${pdfResp.status}` }), { status: 502, headers: Object.assign({ "Content-Type": "application/json" }, CORS_HEADERS) });
      }
      
      const arrayBuffer = await pdfResp.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const sizeMB = (uint8.length / 1024 / 1024).toFixed(2);
      console.log(`PDF downloaded: ${sizeMB} MB`);
  
      // Convert to base64
      console.log('Converting to base64...');
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        const slice = uint8.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(slice));
      }
      const base64 = btoa(binary);
      console.log('Base64 conversion complete');
  
      const analysisText = `Analysiere dieses türkische B2-Lehrbuch und extrahiere Grammatikpunkte und Vokabellisten. Gib für jeden Grammatikpunkt eine deutsche Erklärung und Beispielssätze auf Türkisch. Gib für jedes Vokabelwort die deutsche Übersetzung und ein Beispielsatz auf Türkisch. Output muss reines JSON sein mit der Struktur:\n{\n  "chapters": [ { "title": "...", "grammar": [ { "point": "...", "german_explanation": "...", "examples": ["..."] } ], "vocabulary": [ { "word": "...", "translation_german": "...", "example": "..." } ] } ]\n}`;
  
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) {
        console.error('Anthropic API key missing from environment');
        return new Response(JSON.stringify({ error: "Anthropic API key not configured" }), { status: 500, headers: Object.assign({ "Content-Type": "application/json" }, CORS_HEADERS) });
      }
  
      // Prepare Messages API body with larger max_tokens for comprehensive extraction
      const messagesBody = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384, // Increased from 4096 to handle more flashcards
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64
                }
              },
              {
                type: "text",
                text: analysisText
              }
            ]
          }
        ]
      };
  
      console.log(`Calling Anthropic API for ${sizeMB}MB PDF...`);
      console.log(`Model: ${messagesBody.model}, Max tokens: ${messagesBody.max_tokens}`);
  
      let anthropicResp;
      const startTime = Date.now();
      
      try {
        anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify(messagesBody),
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Anthropic API responded in ${duration}s`);
        
      } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`Anthropic fetch failed after ${duration}s`);
        console.error('Error message:', error?.message);
        return new Response(JSON.stringify({ error: "Anthropic fetch failed", details: error?.message }), { status: 502, headers: Object.assign({ "Content-Type": "application/json" }, CORS_HEADERS) });
      }
  
      if (!anthropicResp.ok) {
        const text = await anthropicResp.text();
        console.error('Anthropic API error:', anthropicResp.status, text);
        return new Response(JSON.stringify({ error: "Anthropic API error", details: text }), { status: 502, headers: Object.assign({ "Content-Type": "application/json" }, CORS_HEADERS) });
      }
  
      console.log('Parsing Anthropic response...');
      const result = await anthropicResp.json();
      
      // Extract content from Messages API response
      const completion = result?.content?.[0]?.text || result?.completion || JSON.stringify(result);
      console.log(`Response length: ${completion.length} characters`);
  
      let jsonOut: any = null;
      try {
        const match = completion.match(/\{[\s\S]*\}/);
        const jsonText = match ? match[0] : completion;
        jsonOut = JSON.parse(jsonText);
        
        const chapterCount = jsonOut?.chapters?.length || 0;
        const totalGrammar = jsonOut?.chapters?.reduce((sum: number, ch: any) => sum + (ch?.grammar?.length || 0), 0) || 0;
        const totalVocab = jsonOut?.chapters?.reduce((sum: number, ch: any) => sum + (ch?.vocabulary?.length || 0), 0) || 0;
        
        console.log(`✅ Extracted: ${chapterCount} chapters, ${totalGrammar} grammar points, ${totalVocab} vocabulary items`);
        
      } catch (err) {
        console.error('Failed to parse JSON from Anthropic response:', err);
        console.error('Raw response preview:', completion.substring(0, 500));
        return new Response(JSON.stringify({ error: "Failed to parse JSON from Anthropic response", raw: completion }), { status: 502, headers: Object.assign({ "Content-Type": "application/json" }, CORS_HEADERS) });
      }
  
      // Return chapters array directly (not wrapped in data) so frontend can parse it correctly
      return new Response(JSON.stringify(jsonOut), { status: 200, headers: Object.assign({ "Content-Type": "application/json" }, CORS_HEADERS) });
      
    } catch (err) {
      console.error('Internal error:', err?.message, err);
      return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), { status: 500, headers: Object.assign({ "Content-Type": "application/json" }, CORS_HEADERS) });
    }
  });