import type { NextApiRequest, NextApiResponse } from "next";
import vision from "@google-cloud/vision";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

type ScoreData = {
  name: string;
  scores: {
    game1?: number;
    game2?: number;
    game3?: number;
    game4?: number;
    game5?: number;
    game6?: number;
  };
  handicap?: number;
  confidence: number;
};

// Initialize Google Vision client with API key
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: undefined, // We'll use API key instead
  apiKey: process.env.GOOGLE_VISION_API_KEY || "AIzaSyAb8RN6IhIEABaNnrgodRvetK9S6mbGnoxP1rlyxvl4CP42pfig",
});

function cleanOCRNumber(text: string): number | undefined {
  if (!text || text.trim().length === 0) return undefined;
  
  console.log(`  Cleaning OCR number: "${text}"`);
  
  // Common OCR character mistakes
  const cleaned = text
    .replace(/[oO]/g, "0")     // O → 0
    .replace(/[lI|]/g, "1")    // l,I,| → 1
    .replace(/[zZ]/g, "2")     // Z → 2
    .replace(/[S\$§]/g, "5")   // S,$,§ → 5
    .replace(/[G]/g, "6")      // G → 6
    .replace(/[B]/g, "8")      // B → 8
    .replace(/[g]/g, "9")      // g → 9
    .replace(/[Q]/g, "9")      // Q → 9
    .replace(/[D]/g, "0")      // D → 0
    .replace(/[\s\-_.,;:]/g, "") // Remove separators
    .replace(/[^0-9]/g, "");   // Keep only digits
  
  if (cleaned.length === 0) {
    console.log(`    → No digits found after cleaning`);
    return undefined;
  }
  
  // Handle extra digits (common OCR error: 190 → 1990, 163 → 1632)
  if (cleaned.length >= 4) {
    const first3 = parseInt(cleaned.substring(0, 3));
    if (first3 >= 0 && first3 <= 300) {
      console.log(`    → Extracted first 3 digits: ${first3} (from "${cleaned}")`);
      return first3;
    }
    
    const last3 = parseInt(cleaned.substring(cleaned.length - 3));
    if (last3 >= 0 && last3 <= 300) {
      console.log(`    → Extracted last 3 digits: ${last3} (from "${cleaned}")`);
      return last3;
    }
  }
  
  const num = parseInt(cleaned);
  
  if (isNaN(num)) {
    console.log(`    → NaN after parsing: "${cleaned}"`);
    return undefined;
  }
  
  if (num < 0 || num > 300) {
    console.log(`    → Out of range: ${num} (valid: 0-300)`);
    return undefined;
  }
  
  console.log(`    → Valid score: ${num} ✅`);
  return num;
}

function extractTableScores(text: string): ScoreData[] {
  console.log("\n=== GOOGLE VISION TABLE EXTRACTION START ===");
  console.log("Raw text length:", text.length);
  console.log("Raw text preview (first 500 chars):\n", text.substring(0, 500));
  
  const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  console.log("\n📋 Total lines after cleanup:", lines.length);
  console.log("First 15 lines:");
  lines.slice(0, 15).forEach((line, idx) => {
    console.log(`  [${idx}]: "${line}"`);
  });
  
  const scores: ScoreData[] = [];
  
  // Google Vision gives cleaner text, so we can be more aggressive
  console.log("\n🔍 STRATEGY: Smart bidirectional name detection...");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip very short lines or header-like lines
    if (line.length < 5) continue;
    if (/^(no|name|game|g1|g2|g3|g4|g5|g6|total|hcp|hdcp|player)/i.test(line.trim())) {
      console.log(`  Skipping header at line ${i}: "${line}"`);
      continue;
    }
    
    console.log(`\nProcessing line ${i}: "${line}"`);
    
    // Split into tokens
    const tokens = line.split(/\s+/).filter(t => t.length > 0);
    console.log(`  Tokens (${tokens.length}):`, tokens);
    
    if (tokens.length < 3) {
      console.log(`  ⚠️ Too few tokens, skipping`);
      continue;
    }
    
    // Find ALL potential names and numbers
    const nameTokens: { token: string; index: number; score: number }[] = [];
    const numberTokens: { token: string; index: number; cleaned?: number }[] = [];
    
    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j];
      
      // Check if it's a name (has letters, not all numbers)
      if (/[a-zA-Z]/.test(token) && !/^\d+$/.test(token) && token.length >= 2 && token.length <= 20) {
        // Score this name candidate
        let score = 0;
        score += token.length; // Longer names preferred
        score += (token.match(/[a-zA-Z]/g) || []).length; // More letters = better
        if (j > 0 && j < tokens.length - 1) score += 2; // Middle position bonus
        
        nameTokens.push({ token, index: j, score });
      }
      
      // Check if it's a potential number
      const cleaned = cleanOCRNumber(token);
      numberTokens.push({ token, index: j, cleaned });
    }
    
    console.log(`  → Found ${nameTokens.length} name candidates:`, nameTokens.map(n => `${n.token}(score:${n.score})`));
    console.log(`  → Found ${numberTokens.length} number tokens, ${numberTokens.filter(n => n.cleaned !== undefined).length} valid scores`);
    
    // Must have at least 1 name and 2 valid numbers
    const validNumbers = numberTokens.filter(n => n.cleaned !== undefined && n.cleaned >= 0 && n.cleaned <= 300);
    
    if (nameTokens.length === 0) {
      console.log(`  ⚠️ No name candidates found`);
      continue;
    }
    
    if (validNumbers.length < 2) {
      console.log(`  ⚠️ Not enough valid numbers (need >=2, got ${validNumbers.length})`);
      continue;
    }
    
    // Pick the best name candidate (highest score)
    nameTokens.sort((a, b) => b.score - a.score);
    const bestName = nameTokens[0];
    
    console.log(`  → Selected name: "${bestName.token}" at position ${bestName.index} (score: ${bestName.score})`);
    
    // Extract scores (all valid numbers, excluding the name position)
    const extractedScores: number[] = [];
    for (const numToken of validNumbers) {
      // Skip if this number token is at the same position as the name
      if (numToken.index === bestName.index) continue;
      
      extractedScores.push(numToken.cleaned!);
    }
    
    console.log(`  → Extracted ${extractedScores.length} scores:`, extractedScores);
    
    if (extractedScores.length >= 2) {
      const scoreData: ScoreData = {
        name: bestName.token,
        scores: {},
        confidence: 85, // Higher confidence for Google Vision
      };
      
      // Map numbers to game slots (up to 6 games)
      extractedScores.slice(0, 6).forEach((score, idx) => {
        (scoreData.scores as any)[`game${idx + 1}`] = score;
      });
      
      // If there's one more number and it's small (<=50), might be handicap
      if (extractedScores.length > 6 && extractedScores[extractedScores.length - 1] <= 50) {
        scoreData.handicap = extractedScores[extractedScores.length - 1];
        console.log(`  → Possible HCP: ${scoreData.handicap}`);
      }
      
      console.log(`  ✅ Extracted player: ${scoreData.name} with ${Object.keys(scoreData.scores).length} scores`);
      scores.push(scoreData);
    } else {
      console.log(`  ⚠️ Not enough valid numbers after filtering (need >=2, got ${extractedScores.length})`);
    }
  }
  
  console.log("\n=== GOOGLE VISION TABLE EXTRACTION END ===");
  console.log(`Final result: ${scores.length} players detected`);
  scores.forEach((s, idx) => {
    console.log(`  [${idx}] ${s.name}: ${Object.keys(s.scores).length} scores, confidence: ${s.confidence}%`);
  });
  
  return scores;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("\n🎯 ===== GOOGLE CLOUD VISION OCR START =====");
    
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const imageFile = files.image?.[0];
    if (!imageFile) {
      console.log("❌ No image file provided");
      return res.status(400).json({ error: "No image file provided" });
    }

    console.log("📁 Image file received:", imageFile.originalFilename);
    const imagePath = imageFile.filepath;
    
    // Read image as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    
    console.log("\n🤖 Calling Google Cloud Vision API...");
    
    // Call Google Vision API for text detection
    const [result] = await visionClient.textDetection({
      image: {
        content: base64Image,
      },
    });
    
    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      console.log("❌ No text detected in image");
      fs.unlinkSync(imagePath);
      return res.status(400).json({ error: "No text detected in image" });
    }
    
    // First annotation is the full text
    const fullText = detections[0]?.description || "";
    const confidence = 95; // Google Vision doesn't return confidence, but it's typically 90-99%
    
    console.log(`✅ Google Vision OCR complete. Confidence: ~${confidence}%`);
    console.log(`Text length: ${fullText.length} chars`);
    
    console.log("\n📄 FULL OCR TEXT OUTPUT:");
    console.log("=".repeat(80));
    console.log(fullText);
    console.log("=".repeat(80));
    
    // Clean up uploaded file
    fs.unlinkSync(imagePath);
    
    // Extract scores from the text
    const extractedScores = extractTableScores(fullText);
    
    console.log(`\n✅ Final extraction: ${extractedScores.length} players found`);
    console.log("🎯 ===== GOOGLE CLOUD VISION OCR END =====\n");
    
    return res.status(200).json({
      success: true,
      text: fullText,
      confidence: confidence,
      scores: extractedScores,
      debug: {
        provider: "Google Cloud Vision",
        detectedBlocks: detections.length - 1, // Exclude full text annotation
      }
    });
    
  } catch (error) {
    console.error("❌ Error parsing image:", error);
    return res.status(500).json({ 
      error: "Failed to parse image", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}