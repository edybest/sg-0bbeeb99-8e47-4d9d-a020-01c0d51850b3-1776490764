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
    const processedImage = await sharp(imagePath)
      .resize(3000, 3000, { 
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

function extractTableScores(text: string): ScoreData[] {
  const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  const scores: ScoreData[] = [];
  
  console.log("Analyzing table structure...");
  
  let headerLine = -1;
  let nameCol = -1;
  let g1Col = -1;
  let g2Col = -1;
  let g3Col = -1;
  let g4Col = -1;
  let g5Col = -1;
  let g6Col = -1;
  let hcpCol = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes("name") || lowerLine.includes("player")) {
      console.log("Header row found at line", i, ":", line);
      headerLine = i;
      
      const parts = line.split(/\s+/);
      
      parts.forEach((part, idx) => {
        const lowerPart = part.toLowerCase();
        
        if (lowerPart.includes("name") || lowerPart.includes("player")) {
          nameCol = idx;
          console.log("Name column at position", idx);
        }
        if (lowerPart === "g1" || lowerPart === "game1" || (lowerPart.includes("game") && lowerPart.includes("1"))) {
          g1Col = idx;
          console.log("G1 column at position", idx);
        }
        if (lowerPart === "g2" || lowerPart === "game2" || (lowerPart.includes("game") && lowerPart.includes("2"))) {
          g2Col = idx;
          console.log("G2 column at position", idx);
        }
        if (lowerPart === "g3" || lowerPart === "game3" || (lowerPart.includes("game") && lowerPart.includes("3"))) {
          g3Col = idx;
          console.log("G3 column at position", idx);
        }
        if (lowerPart === "g4" || lowerPart === "game4" || (lowerPart.includes("game") && lowerPart.includes("4"))) {
          g4Col = idx;
          console.log("G4 column at position", idx);
        }
        if (lowerPart === "g5" || lowerPart === "game5" || (lowerPart.includes("game") && lowerPart.includes("5"))) {
          g5Col = idx;
          console.log("G5 column at position", idx);
        }
        if (lowerPart === "g6" || lowerPart === "game6" || (lowerPart.includes("game") && lowerPart.includes("6"))) {
          g6Col = idx;
          console.log("G6 column at position", idx);
        }
        if (lowerPart === "hcp" || lowerPart.includes("handicap")) {
          hcpCol = idx;
          console.log("HCP column at position", idx);
        }
      });
      
      break;
    }
  }
  
  if (headerLine === -1 || nameCol === -1) {
    console.log("No table header found, trying alternative parsing...");
    return extractAlternativeFormat(text);
  }
  
  console.log("Processing data rows...");
  for (let i = headerLine + 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.length < 3 || /^[\-_=]+$/.test(line)) {
      continue;
    }
    
    const parts = line.split(/\s+/);
    
    if (parts.length < 2) {
      continue;
    }
    
    const scoreData: ScoreData = {
      name: "",
      scores: {},
      confidence: 70,
    };
    
    if (nameCol >= 0 && nameCol < parts.length) {
      scoreData.name = parts[nameCol];
      
      if (scoreData.name.match(/^\d+$/)) {
        if (nameCol + 1 < parts.length) {
          scoreData.name = parts[nameCol + 1];
        }
      }
    }
    
    if (!scoreData.name || scoreData.name.match(/^\d+$/)) {
      continue;
    }
    
    if (g1Col >= 0 && g1Col < parts.length) {
      const val = parseInt(parts[g1Col]);
      if (!isNaN(val) && val >= 0 && val <= 300) {
        scoreData.scores.game1 = val;
      }
    }
    
    if (g2Col >= 0 && g2Col < parts.length) {
      const val = parseInt(parts[g2Col]);
      if (!isNaN(val) && val >= 0 && val <= 300) {
        scoreData.scores.game2 = val;
      }
    }
    
    if (g3Col >= 0 && g3Col < parts.length) {
      const val = parseInt(parts[g3Col]);
      if (!isNaN(val) && val >= 0 && val <= 300) {
        scoreData.scores.game3 = val;
      }
    }
    
    if (g4Col >= 0 && g4Col < parts.length) {
      const val = parseInt(parts[g4Col]);
      if (!isNaN(val) && val >= 0 && val <= 300) {
        scoreData.scores.game4 = val;
      }
    }
    
    if (g5Col >= 0 && g5Col < parts.length) {
      const val = parseInt(parts[g5Col]);
      if (!isNaN(val) && val >= 0 && val <= 300) {
        scoreData.scores.game5 = val;
      }
    }
    
    if (g6Col >= 0 && g6Col < parts.length) {
      const val = parseInt(parts[g6Col]);
      if (!isNaN(val) && val >= 0 && val <= 300) {
        scoreData.scores.game6 = val;
      }
    }
    
    if (hcpCol >= 0 && hcpCol < parts.length) {
      const val = parseInt(parts[hcpCol]);
      if (!isNaN(val)) {
        scoreData.handicap = val;
      }
    }
    
    if (Object.keys(scoreData.scores).length > 0) {
      console.log("Extracted player:", scoreData.name, "with", Object.keys(scoreData.scores).length, "scores");
      scores.push(scoreData);
    }
  }
  
  return scores;
}

function extractAlternativeFormat(text: string): ScoreData[] {
  const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  const scores: ScoreData[] = [];
  
  console.log("Trying alternative format detection...");
  
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
          confidence: 75,
        };
      }
    }
    
    if (currentPlayer) {
      const g1Match = lowerLine.match(/(?:g\s*1|game\s*1)[:\s]+(\d+)/i);
      if (g1Match) {
        const score = parseInt(g1Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game1 = score;
        }
      }
      
      const g2Match = lowerLine.match(/(?:g\s*2|game\s*2)[:\s]+(\d+)/i);
      if (g2Match) {
        const score = parseInt(g2Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game2 = score;
        }
      }
      
      const g3Match = lowerLine.match(/(?:g\s*3|game\s*3)[:\s]+(\d+)/i);
      if (g3Match) {
        const score = parseInt(g3Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game3 = score;
        }
      }
      
      const g4Match = lowerLine.match(/(?:g\s*4|game\s*4)[:\s]+(\d+)/i);
      if (g4Match) {
        const score = parseInt(g4Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game4 = score;
        }
      }
      
      const g5Match = lowerLine.match(/(?:g\s*5|game\s*5)[:\s]+(\d+)/i);
      if (g5Match) {
        const score = parseInt(g5Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game5 = score;
        }
      }
      
      const g6Match = lowerLine.match(/(?:g\s*6|game\s*6)[:\s]+(\d+)/i);
      if (g6Match) {
        const score = parseInt(g6Match[1]);
        if (score >= 0 && score <= 300) {
          currentPlayer.scores = currentPlayer.scores || {};
          currentPlayer.scores.game6 = score;
        }
      }
      
      const hcpMatch = lowerLine.match(/(?:hcp|handicap)[:\s]+(\d+)/i);
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
    
    console.log("Preprocessing image for table detection...");
    const processedImageBuffer = await preprocessImage(imagePath);
    
    console.log("Initializing OCR worker...");
    const worker = await createWorker("eng");
    
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });
    
    console.log("Performing OCR recognition (Pass 1 - Auto mode)...");
    const { data: { text: text1, confidence: conf1 } } = await worker.recognize(processedImageBuffer);
    
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });
    
    console.log("Performing OCR recognition (Pass 2 - Sparse text mode for tables)...");
    const { data: { text: text2, confidence: conf2 } } = await worker.recognize(processedImageBuffer);
    
    await worker.terminate();
    
    fs.unlinkSync(imagePath);
    
    const bestText = conf1 >= conf2 ? text1 : text2;
    const bestConfidence = Math.max(conf1, conf2);
    
    console.log("OCR completed. Best confidence:", bestConfidence);
    console.log("Extracted text:", bestText);
    
    const extractedScores = extractTableScores(bestText);
    
    console.log("Final extracted scores:", extractedScores);
    
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