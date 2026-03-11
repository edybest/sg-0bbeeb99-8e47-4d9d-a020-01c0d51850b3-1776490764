import type { NextApiRequest, NextApiResponse } from "next";
import { createWorker } from "tesseract.js";
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
  };
  confidence: number;
};

function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 80;
  
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

function extractScoresFromText(text: string): ScoreData[] {
  const lines = text.split("\n").filter(line => line.trim().length > 0);
  const scores: ScoreData[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const nameMatch = line.match(/^([A-Za-z\s]+)/);
    if (!nameMatch) continue;
    
    const name = nameMatch[1].trim();
    if (name.length < 2) continue;
    
    const numbers = line.match(/\d+/g);
    if (!numbers || numbers.length === 0) continue;
    
    const scoreNums = numbers.map(n => parseInt(n)).filter(n => n >= 0 && n <= 300);
    
    const scoreData: ScoreData = {
      name,
      scores: {},
      confidence: 75,
    };
    
    if (scoreNums.length >= 1) scoreData.scores.game1 = scoreNums[0];
    if (scoreNums.length >= 2) scoreData.scores.game2 = scoreNums[1];
    if (scoreNums.length >= 3) scoreData.scores.game3 = scoreNums[2];
    if (scoreNums.length >= 4) scoreData.scores.game4 = scoreNums[3];
    if (scoreNums.length >= 5) scoreData.scores.game5 = scoreNums[4];
    
    if (Object.keys(scoreData.scores).length > 0) {
      scores.push(scoreData);
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
    
    const worker = await createWorker("eng");
    
    const { data: { text, confidence } } = await worker.recognize(imagePath);
    
    await worker.terminate();
    
    fs.unlinkSync(imagePath);
    
    const extractedScores = extractScoresFromText(text);
    
    return res.status(200).json({
      success: true,
      text,
      confidence,
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