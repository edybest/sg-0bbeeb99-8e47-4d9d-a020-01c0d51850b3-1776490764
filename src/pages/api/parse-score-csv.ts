import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import os from "os";
import Papa from "papaparse";

export const config = {
  api: {
    bodyParser: false,
  },
};

type CSVScoreData = {
  name: string;
  scores: {
    game1?: number;
    game2?: number;
    game3?: number;
    game4?: number;
    game5?: number;
  };
  handicap?: number;
  fivefive?: boolean;
  date?: string;
  confidence: number;
};

function parseBoolean(value: any): boolean {
  if (!value) return false;
  const str = String(value).toLowerCase().trim();
  return ['yes', 'y', '1', 'true', 'ya'].includes(str);
}

function normalizeColumnName(col: string): string {
  const normalized = col.toLowerCase().trim();
  
  // Name/Player columns
  if (normalized.match(/^(name|player|nama|pemain)$/)) return "name";
  
  // Game columns
  if (normalized.match(/^(g1|game1|game_1|game 1)$/)) return "game1";
  if (normalized.match(/^(g2|game2|game_2|game 2)$/)) return "game2";
  if (normalized.match(/^(g3|game3|game_3|game 3)$/)) return "game3";
  if (normalized.match(/^(g4|game4|game_4|game 4)$/)) return "game4";
  if (normalized.match(/^(g5|game5|game_5|game 5)$/)) return "game5";
  
  // Handicap columns
  if (normalized.match(/^(hcp|handicap|hdcp)$/)) return "handicap";

  // Extra columns
  if (normalized.match(/^(fivefive|five-five|55|five_five)$/)) return "fivefive";
  if (normalized.match(/^(date|tarikh)$/)) return "date";
  
  return col;
}

function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = parseInt(String(value).replace(/[^0-9-]/g, ""));
  return isNaN(num) ? undefined : num;
}

function fuzzyMatchMember(name: string, members: any[]): { member: any; confidence: number } | null {
  const searchName = name.toLowerCase().trim();
  
  let bestMatch = null;
  let bestScore = 0;

  for (const member of members) {
    const username = member.username.toLowerCase();
    const fullName = member.full_name.toLowerCase();
    
    // Exact match
    if (searchName === username || searchName === fullName) {
      return { member, confidence: 100 };
    }
    
    // Contains match
    if (username.includes(searchName) || searchName.includes(username)) {
      const score = 80;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = member;
      }
    }
    
    if (fullName.includes(searchName) || searchName.includes(fullName)) {
      const score = 75;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = member;
      }
    }
    
    // Word match
    const searchWords = searchName.split(/\s+/);
    const usernameWords = username.split(/\s+/);
    const fullNameWords = fullName.split(/\s+/);
    
    let matchCount = 0;
    for (const word of searchWords) {
      if (usernameWords.some(w => w === word) || fullNameWords.some(w => w === word)) {
        matchCount++;
      }
    }
    
    if (matchCount > 0) {
      const score = (matchCount / searchWords.length) * 70;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = member;
      }
    }
  }

  return bestMatch && bestScore >= 60 ? { member: bestMatch, confidence: bestScore } : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({
      uploadDir: os.tmpdir(),
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
    });

    const [fields, files] = await form.parse(req);
    const csvFile = Array.isArray(files.csv) ? files.csv[0] : files.csv;
    
    if (!csvFile) {
      return res.status(400).json({ error: "No CSV file uploaded" });
    }

    // Parse members JSON from form data
    const membersData = fields.members?.[0];
    if (!membersData) {
      return res.status(400).json({ error: "Members data not provided" });
    }
    
    const members = JSON.parse(membersData);

    // Read CSV file
    const csvContent = fs.readFileSync(csvFile.filepath, "utf-8");
    
    // Clean up uploaded file
    fs.unlinkSync(csvFile.filepath);

    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => normalizeColumnName(header),
    });

    if (parseResult.errors.length > 0) {
      console.error("CSV parsing errors:", parseResult.errors);
      return res.status(400).json({ 
        error: "Failed to parse CSV", 
        details: parseResult.errors[0].message 
      });
    }

    const rows = parseResult.data as any[];
    const parsedScores: CSVScoreData[] = [];

    console.log("CSV Headers detected:", parseResult.meta.fields);
    console.log(`Processing ${rows.length} rows...`);

    for (const row of rows) {
      const name = row.name || row.player || "";
      
      if (!name || name.trim().length === 0) {
        console.log("Skipping row - no name found");
        continue;
      }

      const scores = {
        game1: parseNumber(row.game1),
        game2: parseNumber(row.game2),
        game3: parseNumber(row.game3),
        game4: parseNumber(row.game4),
        game5: parseNumber(row.game5),
      };

      const handicap = parseNumber(row.handicap);
      const fivefive = parseBoolean(row.fivefive);
      
      let date = row.date ? String(row.date).trim() : undefined;
      if (date) {
        // convert yyyy/mm/dd to yyyy-mm-dd
        date = date.replace(/\//g, '-');
      }

      // Check if at least one score is present
      const hasScores = Object.values(scores).some(s => s !== undefined);
      
      if (!hasScores) {
        console.log(`Skipping ${name} - no valid scores found`);
        continue;
      }

      // Try to match member
      const match = fuzzyMatchMember(name, members);
      
      const scoreData: CSVScoreData = {
        name: name.trim(),
        scores,
        handicap,
        fivefive,
        date,
        confidence: match?.confidence || 0,
      };

      if (match) {
        (scoreData as any).matchedMember = match.member;
        (scoreData as any).matchConfidence = match.confidence;
      }

      parsedScores.push(scoreData);
      console.log(`Parsed: ${name} → ${match ? match.member.username : "NO MATCH"} (${match?.confidence.toFixed(0) || 0}%)`);
    }

    console.log(`Successfully parsed ${parsedScores.length} scores from CSV`);

    return res.status(200).json({
      success: true,
      scores: parsedScores,
      totalRows: rows.length,
      parsedRows: parsedScores.length,
    });

  } catch (error) {
    console.error("CSV parsing error:", error);
    return res.status(500).json({ 
      error: "Failed to parse CSV", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}