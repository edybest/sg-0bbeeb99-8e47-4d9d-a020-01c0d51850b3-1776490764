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
  };
  handicap?: number;
  confidence: number;
};

async function preprocessImage(imagePath: string): Promise<Buffer> {
  try {
    const processedImage = await sharp(imagePath)
      .resize(2000, 2000, { 
        fit: "inside", 
        withoutEnlargement: false 
      })
      .greyscale()
      .normalize()
      .sharpen()
      .threshold(128)
      .toBuffer();
    
    return processedImage;
  } catch (error) {
    console.error("Image preprocessing error:", error);
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

function fuzzyMatch(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 85;
  
  const words1 = s1.split(" ");
  const words2 = s2.split(" ");
  let matchCount = 0;
  
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matchCount++;
        break;
      }
    }
  }
  
  if (matchCount > 0) {
    const maxWords = Math.max(words1.length, words2.length);
    const wordMatchScore = (matchCount / maxWords) * 100;
    if (wordMatchScore >= 50) return Math.round(wordMatchScore);
  }
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  const editDistance = levenshteinDistance(s1, s2);
  const similarity = ((longer.length - editDistance) / longer.length) * 100;
  
  return Math.round(similarity);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function extractStructuredScores(text: string): ScoreData[] {
  const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  const scores: ScoreData[] = [];
  
  let currentPlayer: Partial<ScoreData> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes("name") || lowerLine.includes("player")) {
      if (currentPlayer && currentPlayer.name) {
        scores.push(currentPlayer as ScoreData);
      }
      
      const nameMatch = line.match(/(?:name|player)[:\s]+([a-zA-Z\s]+)/i);
      if (nameMatch && nameMatch[1]) {
        currentPlayer = {
          name: nameMatch[1].trim(),
          scores: {},
          confidence: 80,
        };
      }
    }
    
    if (currentPlayer) {
      const g1Match = lowerLine.match(/g\s*1[:\s]+(\d+)/i) || lowerLine.match(/game\s*1[:\s]+(\d+)/i);
      if (g1Match) {
        const score = parseInt(g1Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game1 = score;
        }
      }
      
      const g2Match = lowerLine.match(/g\s*2[:\s]+(\d+)/i) || lowerLine.match(/game\s*2[:\s]+(\d+)/i);
      if (g2Match) {
        const score = parseInt(g2Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game2 = score;
        }
      }
      
      const g3Match = lowerLine.match(/g\s*3[:\s]+(\d+)/i) || lowerLine.match(/game\s*3[:\s]+(\d+)/i);
      if (g3Match) {
        const score = parseInt(g3Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game3 = score;
        }
      }
      
      const g4Match = lowerLine.match(/g\s*4[:\s]+(\d+)/i) || lowerLine.match(/game\s*4[:\s]+(\d+)/i);
      if (g4Match) {
        const score = parseInt(g4Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game4 = score;
        }
      }
      
      const g5Match = lowerLine.match(/g\s*5[:\s]+(\d+)/i) || lowerLine.match(/game\s*5[:\s]+(\d+)/i);
      if (g5Match) {
        const score = parseInt(g5Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game5 = score;
        }
      }
      
      const hcpMatch = lowerLine.match(/hcp[:\s]+(\d+)/i) || lowerLine.match(/handicap[:\s]+(\d+)/i);
      if (hcpMatch) {
        currentPlayer.handicap = parseInt(hcpMatch[1]);
      }
    }
  }
  
  if (currentPlayer && currentPlayer.name) {
    scores.push(currentPlayer as ScoreData);
  }
  
  return scores.filter(s => Object.keys(s.scores || {}).length > 0);
}

function extractTableScores(text: string): ScoreData[] {
  const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  const scores: ScoreData[] = [];
  
  let headerFound = false;
  let nameIndex = -1;
  let g1Index = -1;
  let g2Index = -1;
  let g3Index = -1;
  let g4Index = -1;
  let g5Index = -1;
  let hcpIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    const parts = line.split(/\s+/);
    
    if (!headerFound && (lowerLine.includes("name") || lowerLine.includes("player"))) {
      headerFound = true;
      
      parts.forEach((part, idx) => {
        const lowerPart = part.toLowerCase();
        if (lowerPart.includes("name") || lowerPart.includes("player")) nameIndex = idx;
        if (lowerPart.match(/^g\s*1/) || lowerPart.includes("game") && lowerPart.includes("1")) g1Index = idx;
        if (lowerPart.match(/^g\s*2/) || lowerPart.includes("game") && lowerPart.includes("2")) g2Index = idx;
        if (lowerPart.match(/^g\s*3/) || lowerPart.includes("game") && lowerPart.includes("3")) g3Index = idx;
        if (lowerPart.match(/^g\s*4/) || lowerPart.includes("game") && lowerPart.includes("4")) g4Index = idx;
        if (lowerPart.match(/^g\s*5/) || lowerPart.includes("game") && lowerPart.includes("5")) g5Index = idx;
        if (lowerPart === "hcp" || lowerPart.includes("handicap")) hcpIndex = idx;
      });
      
      continue;
    }
    
    if (headerFound && parts.length > 1) {
      const rowParts = line.split(/\s+/);
      
      if (rowParts.length > Math.max(nameIndex, g1Index, g2Index, g3Index, g4Index, g5Index, hcpIndex)) {
        const scoreData: ScoreData = {
          name: nameIndex >= 0 ? rowParts[nameIndex] : "",
          scores: {},
          confidence: 75,
        };
        
        if (g1Index >= 0) {
          const score = parseInt(rowParts[g1Index]);
          if (!isNaN(score) && score >= 0 && score <= 300) {
            scoreData.scores.game1 = score;
          }
        }
        
        if (g2Index >= 0) {
          const score = parseInt(rowParts[g2Index]);
          if (!isNaN(score) && score >= 0 && score <= 300) {
            scoreData.scores.game2 = score;
          }
        }
        
        if (g3Index >= 0) {
          const score = parseInt(rowParts[g3Index]);
          if (!isNaN(score) && score >= 0 && score <= 300) {
            scoreData.scores.game3 = score;
          }
        }
        
        if (g4Index >= 0) {
          const score = parseInt(rowParts[g4Index]);
          if (!isNaN(score) && score >= 0 && score <= 300) {
            scoreData.scores.game4 = score;
          }
        }
        
        if (g5Index >= 0) {
          const score = parseInt(rowParts[g5Index]);
          if (!isNaN(score) && score >= 0 && score <= 300) {
            scoreData.scores.game5 = score;
          }
        }
        
        if (hcpIndex >= 0) {
          const hcp = parseInt(rowParts[hcpIndex]);
          if (!isNaN(hcp)) {
            scoreData.handicap = hcp;
          }
        }
        
        if (scoreData.name && Object.keys(scoreData.scores).length > 0) {
          scores.push(scoreData);
        }
      }
    }
  }
  
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
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const imageFile = files.image?.[0];
    if (!imageFile) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const imagePath = imageFile.filepath;
    
    console.log("Preprocessing image...");
    const processedImageBuffer = await preprocessImage(imagePath);
    
    console.log("Initializing OCR worker...");
    const worker = await createWorker("eng");
    
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });
    
    console.log("Performing OCR recognition (Pass 1 - Auto mode)...");
    const { data: { text: text1, confidence: conf1 } } = await worker.recognize(processedImageBuffer);
    
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
    
    console.log("Performing OCR recognition (Pass 2 - Single block mode)...");
    const { data: { text: text2, confidence: conf2 } } = await worker.recognize(processedImageBuffer);
    
    await worker.terminate();
    
    fs.unlinkSync(imagePath);
    
    const bestText = conf1 >= conf2 ? text1 : text2;
    const bestConfidence = Math.max(conf1, conf2);
    
    console.log("OCR completed. Best confidence:", bestConfidence);
    console.log("Extracted text:", bestText);
    
    let extractedScores = extractStructuredScores(bestText);
    
    if (extractedScores.length === 0) {
      console.log("Structured format not found, trying table format...");
      extractedScores = extractTableScores(bestText);
    }
    
    console.log("Extracted scores:", extractedScores);
    
    return res.status(200).json({
      success: true,
      text: bestText,
      confidence: bestConfidence,
      scores: extractedScores,
    });
    
  } catch (error) {
    console.error("Error parsing image:", error);
    return res.status(500).json({ 
      error: "Failed to parse image", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}