import type { NextApiRequest, NextApiResponse } from "next";
import { createWorker, PSM } from "tesseract.js";
import formidable from "formidable";
import fs from "fs";
import sharp from "sharp";

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

async function preprocessImage(imagePath: string): Promise<Buffer> {
  try {
    console.log("📸 Preprocessing image...");
    const processedImage = await sharp(imagePath)
      .resize(2500, 2500, { 
        fit: "inside", 
        withoutEnlargement: false 
      })
      .greyscale()
      .normalize()
      .sharpen({ sigma: 1.5 })
      .threshold(128)
      .toBuffer();
    
    console.log("✅ Image preprocessed successfully");
    return processedImage;
  } catch (error) {
    console.error("⚠️ Image preprocessing error:", error);
    return fs.readFileSync(imagePath);
  }
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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
  
  // If we have digits, parse them
  if (cleaned.length === 0) {
    console.log(`    → No digits found after cleaning`);
    return undefined;
  }
  
  // Handle extra digits (common OCR error: 190 → 1990, 163 → 1632)
  // If 4+ digits and looks like doubled number, try to extract
  if (cleaned.length >= 4) {
    // Try first 3 digits
    const first3 = parseInt(cleaned.substring(0, 3));
    if (first3 >= 0 && first3 <= 300) {
      console.log(`    → Extracted first 3 digits: ${first3} (from "${cleaned}")`);
      return first3;
    }
    
    // Try last 3 digits
    const last3 = parseInt(cleaned.substring(cleaned.length - 3));
    if (last3 >= 0 && last3 <= 300) {
      console.log(`    → Extracted last 3 digits: ${last3} (from "${cleaned}")`);
      return last3;
    }
  }
  
  const num = parseInt(cleaned);
  
  // Validate bowling score range (0-300)
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
  console.log("\n=== TABLE EXTRACTION START ===");
  console.log("Raw text length:", text.length);
  console.log("Raw text preview (first 500 chars):\n", text.substring(0, 500));
  
  const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  console.log("\n📋 Total lines after cleanup:", lines.length);
  console.log("First 10 lines:");
  lines.slice(0, 10).forEach((line, idx) => {
    console.log(`  [${idx}]: "${line}"`);
  });
  
  const scores: ScoreData[] = [];
  
  // Strategy 1: Try table structure with headers
  console.log("\n🔍 STRATEGY 1: Looking for table headers...");
  let headerLine = -1;
  let nameCol = -1;
  let g1Col = -1, g2Col = -1, g3Col = -1, g4Col = -1, g5Col = -1, g6Col = -1;
  let hcpCol = -1;
  
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    const normalized = normalizeText(line);
    
    console.log(`\nChecking line ${i} for header:`, line);
    console.log(`  Normalized: "${normalized}"`);
    
    // Very flexible header detection - accept if has EITHER name OR multiple game columns
    const hasName = lowerLine.includes("name") || lowerLine.includes("player");
    const hasGame = lowerLine.match(/g\s*[1-6]|game\s*[1-6]/i);
    const hasMultipleNumbers = (line.match(/\d+/g) || []).length >= 3; // At least 3 number-like patterns
    
    console.log(`  Has name: ${hasName}, Has game: ${!!hasGame}, Has multiple numbers: ${hasMultipleNumbers}`);
    
    // Accept header if: (has name AND has game) OR (has name AND multiple number columns)
    if ((hasName && hasGame) || (hasName && hasMultipleNumbers)) {
      console.log("✅ HEADER ROW FOUND at line", i);
      headerLine = i;
      
      // Split by multiple possible separators
      const parts = line.split(/[\s|,]+/).filter(p => p.length > 0);
      console.log("  Header parts:", parts);
      
      parts.forEach((part, idx) => {
        const lowerPart = part.toLowerCase();
        
        if (lowerPart.includes("name") || lowerPart.includes("player")) {
          nameCol = idx;
          console.log(`  → Name column at position ${idx}`);
        }
        
        // Game 1
        if (lowerPart === "g1" || lowerPart.includes("game1") || 
            (lowerPart.includes("g") && lowerPart.includes("1"))) {
          g1Col = idx;
          console.log(`  → G1 column at position ${idx}`);
        }
        // Game 2
        if (lowerPart === "g2" || lowerPart.includes("game2") || 
            (lowerPart.includes("g") && lowerPart.includes("2"))) {
          g2Col = idx;
          console.log(`  → G2 column at position ${idx}`);
        }
        // Game 3
        if (lowerPart === "g3" || lowerPart.includes("game3") || 
            (lowerPart.includes("g") && lowerPart.includes("3"))) {
          g3Col = idx;
          console.log(`  → G3 column at position ${idx}`);
        }
        // Game 4
        if (lowerPart === "g4" || lowerPart.includes("game4") || 
            (lowerPart.includes("g") && lowerPart.includes("4"))) {
          g4Col = idx;
          console.log(`  → G4 column at position ${idx}`);
        }
        // Game 5
        if (lowerPart === "g5" || lowerPart.includes("game5") || 
            (lowerPart.includes("g") && lowerPart.includes("5"))) {
          g5Col = idx;
          console.log(`  → G5 column at position ${idx}`);
        }
        // Game 6
        if (lowerPart === "g6" || lowerPart.includes("game6") || 
            (lowerPart.includes("g") && lowerPart.includes("6"))) {
          g6Col = idx;
          console.log(`  → G6 column at position ${idx}`);
        }
        // Handicap
        if (lowerPart === "hcp" || lowerPart.includes("handicap") || lowerPart === "hdcp") {
          hcpCol = idx;
          console.log(`  → HCP column at position ${idx}`);
        }
      });
      
      break;
    }
  }
  
  // If header found, try column-based extraction
  if (headerLine !== -1 && nameCol !== -1) {
    console.log("\n📊 EXTRACTING DATA using column positions...");
    console.log(`Column mapping: name=${nameCol}, g1=${g1Col}, g2=${g2Col}, g3=${g3Col}, g4=${g4Col}, g5=${g5Col}, g6=${g6Col}, hcp=${hcpCol}`);
    
    for (let i = headerLine + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip separator lines
      if (line.length < 3 || /^[\-_=|]+$/.test(line)) {
        console.log(`  Skipping separator at line ${i}`);
        continue;
      }
      
      const parts = line.split(/[\s|,]+/).filter(p => p.length > 0);
      console.log(`\nLine ${i}: "${line}"`);
      console.log(`  Parts (${parts.length}):`, parts);
      
      // Relaxed: Accept row if it has at least name column + 2 score columns
      if (parts.length < Math.max(nameCol + 1, 3)) {
        console.log("  ⚠️ Too few parts, skipping");
        continue;
      }
      
      const scoreData: ScoreData = {
        name: "",
        scores: {},
        confidence: 70,
      };
      
      // Extract name
      if (nameCol < parts.length) {
        scoreData.name = parts[nameCol];
        // Skip if name is just a number (likely row number)
        if (/^\d+$/.test(scoreData.name)) {
          if (nameCol + 1 < parts.length && !/^\d+$/.test(parts[nameCol + 1])) {
            scoreData.name = parts[nameCol + 1];
            console.log(`  → Name (adjusted): "${scoreData.name}"`);
          } else {
            console.log("  ⚠️ Name is just number, skipping row");
            continue;
          }
        } else {
          console.log(`  → Name: "${scoreData.name}"`);
        }
      }
      
      if (!scoreData.name || /^\d+$/.test(scoreData.name)) {
        console.log("  ⚠️ Invalid name, skipping");
        continue;
      }
      
      // Extract scores with intelligent OCR error correction
      const extractScore = (colIdx: number, gameName: string) => {
        // Defensive: Check if column exists in parts array
        if (colIdx < 0) {
          console.log(`  → ${gameName}: column not found in header`);
          return undefined;
        }
        
        if (colIdx >= parts.length) {
          console.log(`  → ${gameName}: column ${colIdx} out of range (have ${parts.length} parts)`);
          return undefined;
        }
        
        const rawValue = parts[colIdx];
        console.log(`  → ${gameName}: raw="${rawValue}"`);
        
        const cleanedScore = cleanOCRNumber(rawValue);
        if (cleanedScore !== undefined) {
          console.log(`  → ${gameName}: ${cleanedScore} ✅`);
          return cleanedScore;
        } else {
          console.log(`  → ${gameName}: "${rawValue}" (invalid after cleaning)`);
        }
        return undefined;
      };
      
      scoreData.scores.game1 = extractScore(g1Col, "G1");
      scoreData.scores.game2 = extractScore(g2Col, "G2");
      scoreData.scores.game3 = extractScore(g3Col, "G3");
      scoreData.scores.game4 = extractScore(g4Col, "G4");
      scoreData.scores.game5 = extractScore(g5Col, "G5");
      scoreData.scores.game6 = extractScore(g6Col, "G6");
      
      // Extract handicap with error correction
      if (hcpCol >= 0 && hcpCol < parts.length) {
        const cleanedHcp = cleanOCRNumber(parts[hcpCol]);
        if (cleanedHcp !== undefined) {
          scoreData.handicap = cleanedHcp;
          console.log(`  → HCP: ${cleanedHcp}`);
        }
      }
      
      if (Object.keys(scoreData.scores).length > 0) {
        console.log(`✅ Extracted player: ${scoreData.name} with ${Object.keys(scoreData.scores).length} scores`);
        scores.push(scoreData);
      } else {
        console.log(`⚠️ No scores found for: ${scoreData.name}`);
      }
    }
  } else {
    console.log("\n⚠️ No clear table header found, trying alternative strategies...");
  }
  
  // Strategy 2: Try label-based extraction
  if (scores.length === 0) {
    console.log("\n🔍 STRATEGY 2: Looking for label-based format (Name:, G1:, etc.)...");
    const labelScores = extractLabelBasedScores(lines);
    if (labelScores.length > 0) {
      console.log(`✅ Found ${labelScores.length} players using label-based extraction`);
      scores.push(...labelScores);
    }
  }
  
  // Strategy 3: Pattern matching for any number sequences
  if (scores.length === 0) {
    console.log("\n🔍 STRATEGY 3: Looking for number patterns...");
    const patternScores = extractByPattern(lines);
    if (patternScores.length > 0) {
      console.log(`✅ Found ${patternScores.length} potential score sequences`);
      scores.push(...patternScores);
    }
  }
  
  // Strategy 4: Brute force - extract ANY name + number sequences (NEW!)
  if (scores.length === 0) {
    console.log("\n🔍 STRATEGY 4: Brute force extraction (ultra-aggressive)...");
    const bruteForceScores = extractByBruteForce(lines);
    if (bruteForceScores.length > 0) {
      console.log(`✅ Found ${bruteForceScores.length} entries using brute force`);
      scores.push(...bruteForceScores);
    }
  }
  
  console.log("\n=== TABLE EXTRACTION END ===");
  console.log(`Final result: ${scores.length} players detected`);
  scores.forEach((s, idx) => {
    console.log(`  [${idx}] ${s.name}: ${Object.keys(s.scores).length} scores, confidence: ${s.confidence}%`);
  });
  
  return scores;
}

function extractLabelBasedScores(lines: string[]): ScoreData[] {
  const scores: ScoreData[] = [];
  let currentPlayer: Partial<ScoreData> | null = null;
  
  console.log("Scanning for label-based format...");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Look for name labels
    if (lowerLine.includes("name") || lowerLine.includes("player")) {
      if (currentPlayer && currentPlayer.name) {
        scores.push(currentPlayer as ScoreData);
      }
      
      const nameMatch = line.match(/(?:name|player)[:\s]+([a-zA-Z\s]+)/i);
      if (nameMatch && nameMatch[1]) {
        currentPlayer = {
          name: nameMatch[1].trim(),
          scores: {},
          confidence: 75,
        };
        console.log(`  Found player: ${currentPlayer.name}`);
      }
    }
    
    // Look for game scores
    if (currentPlayer) {
      const extractGameScore = (pattern: RegExp, gameNum: number) => {
        const match = lowerLine.match(pattern);
        if (match) {
          const cleanedScore = cleanOCRNumber(match[1]);
          if (cleanedScore !== undefined) {
            currentPlayer!.scores = currentPlayer!.scores || {};
            (currentPlayer!.scores as any)[`game${gameNum}`] = cleanedScore;
            console.log(`    G${gameNum}: ${cleanedScore}`);
            return true;
          }
        }
        return false;
      };
      
      extractGameScore(/(?:g\s*1|game\s*1)[:\s]+(\d+)/i, 1);
      extractGameScore(/(?:g\s*2|game\s*2)[:\s]+(\d+)/i, 2);
      extractGameScore(/(?:g\s*3|game\s*3)[:\s]+(\d+)/i, 3);
      extractGameScore(/(?:g\s*4|game\s*4)[:\s]+(\d+)/i, 4);
      extractGameScore(/(?:g\s*5|game\s*5)[:\s]+(\d+)/i, 5);
      extractGameScore(/(?:g\s*6|game\s*6)[:\s]+(\d+)/i, 6);
      
      const hcpMatch = lowerLine.match(/(?:hcp|handicap)[:\s]+(.+)/i);
      if (hcpMatch) {
        const cleanedHcp = cleanOCRNumber(hcpMatch[1]);
        if (cleanedHcp !== undefined) {
          currentPlayer.handicap = cleanedHcp;
          console.log(`    HCP: ${cleanedHcp}`);
        }
      }
    }
  }
  
  if (currentPlayer && currentPlayer.name) {
    scores.push(currentPlayer as ScoreData);
  }
  
  return scores.filter(s => Object.keys(s.scores || {}).length > 0);
}

function extractByPattern(lines: string[]): ScoreData[] {
  console.log("Scanning for number patterns...");
  const scores: ScoreData[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip very short lines
    if (line.length < 10) continue;
    
    // Look for lines with a name (letters) followed by multiple numbers/text
    const match = line.match(/([a-zA-Z]{2,})\s+(.+)/i);
    if (match) {
      const name = match[1];
      const restOfLine = match[2];
      
      // Extract all potential numbers from the rest of the line
      const potentialNumbers = restOfLine.split(/\s+/);
      const cleanedNumbers: number[] = [];
      
      for (const token of potentialNumbers) {
        const cleaned = cleanOCRNumber(token);
        if (cleaned !== undefined) {
          cleanedNumbers.push(cleaned);
        }
      }
      
      if (cleanedNumbers.length >= 2) {
        console.log(`  Pattern match: ${name} with ${cleanedNumbers.length} scores:`, cleanedNumbers);
        
        const scoreData: ScoreData = {
          name: name,
          scores: {},
          confidence: 60,
        };
        
        cleanedNumbers.forEach((score, idx) => {
          if (idx < 6) {
            (scoreData.scores as any)[`game${idx + 1}`] = score;
          }
        });
        
        scores.push(scoreData);
      }
    }
  }
  
  return scores;
}

function extractByBruteForce(lines: string[]): ScoreData[] {
  console.log("\n🔨 BRUTE FORCE EXTRACTION (Ultra-Aggressive)...");
  const scores: ScoreData[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip very short lines or lines that look like headers
    if (line.length < 5) continue;
    if (/^(no|name|game|g1|g2|g3|total|hcp)/i.test(line.trim())) continue;
    
    console.log(`\nBrute force line ${i}: "${line}"`);
    
    // Try to extract: [optional row number] NAME [multiple numbers]
    // Very flexible regex that captures any word followed by numbers
    const tokens = line.split(/\s+/).filter(t => t.length > 0);
    console.log(`  Tokens (${tokens.length}):`, tokens);
    
    if (tokens.length < 3) {
      console.log(`  ⚠️ Too few tokens, skipping`);
      continue;
    }
    
    // Find the first token that looks like a name (not a number, not too long)
    let nameToken = "";
    let nameIndex = -1;
    
    for (let j = 0; j < Math.min(tokens.length, 3); j++) {
      const token = tokens[j];
      // Name should be mostly letters, not all numbers, reasonable length
      if (!/^\d+$/.test(token) && token.length >= 2 && token.length <= 20) {
        // Check if it has at least one letter
        if (/[a-zA-Z]/.test(token)) {
          nameToken = token;
          nameIndex = j;
          console.log(`  → Found name candidate at position ${j}: "${nameToken}"`);
          break;
        }
      }
    }
    
    if (!nameToken) {
      console.log(`  ⚠️ No name candidate found`);
      continue;
    }
    
    // Extract all numbers after the name
    const numberTokens = tokens.slice(nameIndex + 1);
    console.log(`  → Number tokens after name:`, numberTokens);
    
    const cleanedNumbers: number[] = [];
    for (const token of numberTokens) {
      const cleaned = cleanOCRNumber(token);
      if (cleaned !== undefined) {
        cleanedNumbers.push(cleaned);
      }
    }
    
    console.log(`  → Cleaned numbers:`, cleanedNumbers);
    
    // Need at least 2 numbers to consider it a score entry
    if (cleanedNumbers.length >= 2) {
      const scoreData: ScoreData = {
        name: nameToken,
        scores: {},
        confidence: 50, // Lower confidence for brute force
      };
      
      // Map numbers to game slots (up to 6 games)
      cleanedNumbers.slice(0, 6).forEach((score, idx) => {
        if (idx < 6) {
          (scoreData.scores as any)[`game${idx + 1}`] = score;
        }
      });
      
      // If there's one more number and it's small (<=50), might be handicap
      if (cleanedNumbers.length > 6 && cleanedNumbers[cleanedNumbers.length - 1] <= 50) {
        scoreData.handicap = cleanedNumbers[cleanedNumbers.length - 1];
        console.log(`  → Possible HCP: ${scoreData.handicap}`);
      }
      
      console.log(`  ✅ Brute force extracted: ${scoreData.name} with ${Object.keys(scoreData.scores).length} scores`);
      scores.push(scoreData);
    } else {
      console.log(`  ⚠️ Not enough valid numbers (need >=2, got ${cleanedNumbers.length})`);
    }
  }
  
  console.log(`\nBrute force result: ${scores.length} entries found`);
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
    console.log("\n🎯 ===== OCR PARSE REQUEST START =====");
    
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
    
    const processedImageBuffer = await preprocessImage(imagePath);
    
    console.log("\n🤖 Initializing OCR worker...");
    const worker = await createWorker("eng");
    
    // Pass 1: AUTO mode
    console.log("\n📖 OCR Pass 1: AUTO mode");
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });
    
    const { data: { text: text1, confidence: conf1 } } = await worker.recognize(processedImageBuffer);
    console.log(`✅ Pass 1 complete. Confidence: ${conf1.toFixed(2)}%`);
    console.log(`Text length: ${text1.length} chars`);
    
    // Pass 2: SPARSE_TEXT mode (best for tables)
    console.log("\n📖 OCR Pass 2: SPARSE_TEXT mode (table optimized)");
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });
    
    const { data: { text: text2, confidence: conf2 } } = await worker.recognize(processedImageBuffer);
    console.log(`✅ Pass 2 complete. Confidence: ${conf2.toFixed(2)}%`);
    console.log(`Text length: ${text2.length} chars`);
    
    // Pass 3: SINGLE_BLOCK mode
    console.log("\n📖 OCR Pass 3: SINGLE_BLOCK mode");
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
    
    const { data: { text: text3, confidence: conf3 } } = await worker.recognize(processedImageBuffer);
    console.log(`✅ Pass 3 complete. Confidence: ${conf3.toFixed(2)}%`);
    console.log(`Text length: ${text3.length} chars`);
    
    await worker.terminate();
    
    fs.unlinkSync(imagePath);
    
    // Choose best result
    const results = [
      { text: text1, confidence: conf1, mode: "AUTO" },
      { text: text2, confidence: conf2, mode: "SPARSE_TEXT" },
      { text: text3, confidence: conf3, mode: "SINGLE_BLOCK" }
    ];
    
    results.sort((a, b) => b.confidence - a.confidence);
    const bestResult = results[0];
    
    console.log(`\n🏆 Best result: ${bestResult.mode} mode with ${bestResult.confidence.toFixed(2)}% confidence`);
    console.log("\n📄 FULL OCR TEXT OUTPUT:");
    console.log("=".repeat(80));
    console.log(bestResult.text);
    console.log("=".repeat(80));
    
    const extractedScores = extractTableScores(bestResult.text);
    
    console.log(`\n✅ Final extraction: ${extractedScores.length} players found`);
    console.log("🎯 ===== OCR PARSE REQUEST END =====\n");
    
    return res.status(200).json({
      success: true,
      text: bestResult.text,
      confidence: bestResult.confidence,
      scores: extractedScores,
      debug: {
        allResults: results.map(r => ({ mode: r.mode, confidence: r.confidence, textLength: r.text.length })),
        selectedMode: bestResult.mode
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