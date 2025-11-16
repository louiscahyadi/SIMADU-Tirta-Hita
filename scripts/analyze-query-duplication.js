#!/usr/bin/env node

/**
 * Script untuk menganalisis code duplication dalam query patterns
 * Mendeteksi pola-pola yang masih perlu direfactor
 */

const fs = require("fs");
const path = require("path");

// Patterns yang menandakan duplikasi
const DUPLICATION_PATTERNS = [
  {
    name: "Date Range Pattern",
    regex: /dateRange\s*\?\s*\{\s*createdAt:\s*dateRange\s*\}/g,
    description: "Pattern untuk filter tanggal yang bisa direfactor dengan buildDateRangeFilter",
  },
  {
    name: "Search OR Pattern",
    regex: /OR:\s*\[\s*\{[^}]*contains:[^}]*mode:\s*["']insensitive["'][^}]*\}/g,
    description: "Pattern pencarian OR yang bisa direfactor dengan buildSearchFilter",
  },
  {
    name: "Manual Date End Normalization",
    regex: /setHours\(23,\s*59,\s*59,\s*999\)/g,
    description: "Normalisasi tanggal akhir manual yang sudah ditangani di utility",
  },
  {
    name: "Complaint Status Filter",
    regex:
      /(processedAt:\s*null|serviceRequestId:\s*null|workOrderId:\s*null|repairReportId:\s*null)/g,
    description: "Filter status complaint yang bisa direfactor dengan buildComplaintStatusFilter",
  },
  {
    name: "buildOrderBy Old Pattern",
    regex: /buildOrderBy\(\[.*?\]\)/g,
    description: "Pattern buildOrderBy lama yang menerima array, sudah diupdate ke single string",
  },
];

function scanDirectory(dirPath, results = {}) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith(".") && item !== "node_modules") {
      scanDirectory(fullPath, results);
    } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      scanFile(fullPath, content, results);
    }
  }

  return results;
}

function scanFile(filePath, content, results) {
  if (!results[filePath]) {
    results[filePath] = {
      totalIssues: 0,
      patterns: {},
    };
  }

  for (const pattern of DUPLICATION_PATTERNS) {
    const matches = content.match(pattern.regex);
    if (matches && matches.length > 0) {
      results[filePath].patterns[pattern.name] = {
        count: matches.length,
        description: pattern.description,
        matches: matches.slice(0, 3), // Show first 3 matches
      };
      results[filePath].totalIssues += matches.length;
    }
  }
}

function generateReport(results) {
  console.log("🔍 ANALISIS CODE DUPLICATION - QUERY PATTERNS\n");
  console.log("=".repeat(60));

  const sortedFiles = Object.entries(results)
    .filter(([, data]) => data.totalIssues > 0)
    .sort(([, a], [, b]) => b.totalIssues - a.totalIssues);

  if (sortedFiles.length === 0) {
    console.log("✅ Tidak ditemukan pattern duplikasi yang perlu direfactor!");
    return;
  }

  console.log(`\n📊 RINGKASAN:`);
  console.log(`- Total files dengan masalah: ${sortedFiles.length}`);
  console.log(
    `- Total pattern duplikasi: ${sortedFiles.reduce((sum, [, data]) => sum + data.totalIssues, 0)}\n`,
  );

  console.log("📁 FILES YANG PERLU DIREFACTOR:\n");

  for (const [filePath, data] of sortedFiles) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`🟡 ${relativePath} (${data.totalIssues} issues)`);

    for (const [patternName, patternData] of Object.entries(data.patterns)) {
      console.log(`   • ${patternName}: ${patternData.count} occurrences`);
      console.log(`     ${patternData.description}`);

      if (patternData.matches.length > 0) {
        console.log(`     Preview: ${patternData.matches[0].substring(0, 80)}...`);
      }
      console.log();
    }
    console.log("-".repeat(50));
  }

  console.log("\n🛠️  REKOMENDASI REFACTORING:\n");

  const priorityFiles = sortedFiles.slice(0, 5);
  for (let i = 0; i < priorityFiles.length; i++) {
    const [filePath, data] = priorityFiles[i];
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`${i + 1}. ${relativePath}`);
    console.log(
      `   Priority: ${data.totalIssues > 10 ? "HIGH" : data.totalIssues > 5 ? "MEDIUM" : "LOW"}`,
    );
    console.log(`   Estimated time: ${Math.ceil(data.totalIssues / 3)} hours\n`);
  }

  console.log("💡 NEXT STEPS:");
  console.log("1. Refactor files dengan priority HIGH terlebih dahulu");
  console.log("2. Gunakan utility dari @/lib/queryBuilder");
  console.log("3. Test thoroughly setelah refactoring");
  console.log("4. Update dokumentasi jika perlu");
}

// Main execution
const srcPath = path.join(process.cwd(), "src");
if (!fs.existsSync(srcPath)) {
  console.error("❌ Directory src/ tidak ditemukan. Pastikan script dijalankan dari root project.");
  process.exit(1);
}

console.log("🔄 Scanning for code duplication patterns...\n");
const results = scanDirectory(srcPath);
generateReport(results);
