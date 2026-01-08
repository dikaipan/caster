import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import * as path from 'path';

const prisma = new PrismaClient();

interface CSVRecord {
  [key: string]: string;
}

async function analyzeCSVFile(csvFilePath?: string) {
  try {
    console.log('🔍 Analyzing CSV file for cassette count issues...\n');

    // Determine CSV file path
    let csvFile = csvFilePath;
    if (!csvFile) {
      const possibleFiles = [
        path.join(__dirname, '../data/BNI_CASSETTE_COMPLETE.csv'),
        path.join(__dirname, '../data/BNI_CASSETTE_FIXED.csv'),
        path.join(__dirname, '../data/BNI_CASSETTE.csv'),
      ];

      for (const file of possibleFiles) {
        if (fs.existsSync(file)) {
          csvFile = file;
          break;
        }
      }
    }

    if (!csvFile || !fs.existsSync(csvFile)) {
      throw new Error(`CSV file not found. Please provide path to CSV file.`);
    }

    console.log(`📄 Reading CSV file: ${csvFile}\n`);

    // Read CSV file
    const csvContent = fs.readFileSync(csvFile, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CSVRecord[];

    console.log(`📊 Parsed ${records.length} records from CSV\n`);

    // Show first few records to understand structure
    console.log('📋 First 5 records (to understand structure):\n');
    records.slice(0, 5).forEach((record, i) => {
      console.log(`Record ${i + 1}:`);
      Object.keys(record).forEach(key => {
        console.log(`  ${key}: ${record[key]}`);
      });
      console.log('');
    });

    // Group records by machine SN
    // Note: In CSV files, SN Mesin might only be filled in the first row of each machine group
    const machineGroups = new Map<string, CSVRecord[]>();
    let currentMachineSN = '';

    for (const record of records) {
      // Check if this row has SN Mesin (try different possible column names)
      const machineSN = String(
        record['SN Mesin'] ||
        record['SN_Mesin'] ||
        record['SNMesin'] ||
        record['SN MESIN'] ||
        record['sn_mesin'] ||
        record['snMesin'] ||
        ''
      ).trim();

      if (machineSN) {
        // New machine found, update current
        currentMachineSN = machineSN;
      }

      // Skip if we don't have a current machine SN yet
      if (!currentMachineSN) continue;

      // Skip if this row doesn't have any cassette data
      const mainCassette = String(
        record['SN Kaset'] ||
        record['SN_Kaset'] ||
        record['SNKaset'] ||
        record['SN KASET'] ||
        record['sn_kaset'] ||
        record['snKaset'] ||
        ''
      ).trim();

      const backupCassette = String(
        record['SN Kaset Cadangan'] ||
        record['SN_Kaset_Cadangan'] ||
        record['SNKasetCadangan'] ||
        record['SN KASET CADANGAN'] ||
        record['sn_kaset_cadangan'] ||
        record['snKasetCadangan'] ||
        ''
      ).trim();

      if (!mainCassette && !backupCassette) continue;

      // Add SN Mesin to record if it's missing (for grouping)
      if (!record['SN Mesin'] && !record['SN_Mesin'] && !record['SNMesin']) {
        record['SN Mesin'] = currentMachineSN;
      }

      if (!machineGroups.has(currentMachineSN)) {
        machineGroups.set(currentMachineSN, []);
      }

      machineGroups.get(currentMachineSN)!.push(record);
    }

    console.log(`🖥️  Unique machines found: ${machineGroups.size}\n`);

    // Analyze each machine
    const analyses: Array<{
      machineSN: string;
      totalRows: number;
      mainCassettes: number;
      backupCassettes: number;
      totalCassettes: number;
      missingCount: number;
    }> = [];
    const machinesWithIssues: typeof analyses = [];

    for (const [machineSN, records] of Array.from(machineGroups.entries())) {
      let mainCassettes = 0;
      let backupCassettes = 0;

      for (const record of records) {
        const main = String(
          record['SN Kaset'] ||
          record['SN_Kaset'] ||
          record['SNKaset'] ||
          record['SN KASET'] ||
          record['sn_kaset'] ||
          ''
        ).trim();
        const backup = String(
          record['SN Kaset Cadangan'] ||
          record['SN_Kaset_Cadangan'] ||
          record['SNKasetCadangan'] ||
          record['SN KASET CADANGAN'] ||
          record['sn_kaset_cadangan'] ||
          ''
        ).trim();

        if (main) mainCassettes++;
        if (backup) backupCassettes++;
      }

      const totalCassettes = mainCassettes + backupCassettes;
      const missingCount = 10 - totalCassettes;

      const analysis = {
        machineSN,
        totalRows: records.length,
        mainCassettes,
        backupCassettes,
        totalCassettes,
        missingCount,
      };

      analyses.push(analysis);

      if (totalCassettes !== 10) {
        machinesWithIssues.push(analysis);
      }
    }

    // Summary
    console.log('📊 Summary:');
    console.log(`   - Total machines: ${analyses.length}`);
    console.log(`   - Machines with exactly 10 cassettes: ${analyses.filter(a => a.totalCassettes === 10).length}`);
    console.log(`   - Machines with issues: ${machinesWithIssues.length}\n`);

    // Detailed analysis for machines with issues
    if (machinesWithIssues.length > 0) {
      console.log('⚠️  Machines with incorrect cassette count:\n');
      machinesWithIssues.slice(0, 10).forEach(analysis => {
        const status = analysis.totalCassettes < 10 ? '⚠️  LESS' : '⚠️  MORE';
        console.log(`   ${status}: ${analysis.machineSN}`);
        console.log(`      - Total rows: ${analysis.totalRows}`);
        console.log(`      - MAIN cassettes: ${analysis.mainCassettes}`);
        console.log(`      - BACKUP cassettes: ${analysis.backupCassettes}`);
        console.log(`      - Total cassettes: ${analysis.totalCassettes} (expected 10)`);
        if (analysis.totalCassettes < 10) {
          console.log(`      - Missing: ${analysis.missingCount} cassettes`);
        } else {
          console.log(`      - Extra: ${analysis.totalCassettes - 10} cassettes`);
        }
        console.log('');
      });
      if (machinesWithIssues.length > 10) {
        console.log(`   ... and ${machinesWithIssues.length - 10} more\n`);
      }
    }

    // Statistics
    console.log('📈 Statistics:');
    const countDistribution = new Map<number, number>();
    analyses.forEach(a => {
      countDistribution.set(a.totalCassettes, (countDistribution.get(a.totalCassettes) || 0) + 1);
    });

    Array.from(countDistribution.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([count, machines]) => {
        const icon = count === 10 ? '✅' : '⚠️ ';
        console.log(`   ${icon} ${count} cassettes: ${machines} machines`);
      });

    // Calculate total cassettes
    const totalCassettes = analyses.reduce((sum, a) => sum + a.totalCassettes, 0);
    console.log(`\n📦 Total cassettes: ${totalCassettes.toLocaleString()}`);
    console.log(`📦 Expected (${analyses.length} × 10): ${(analyses.length * 10).toLocaleString()}`);
    console.log(`📦 Difference: ${((analyses.length * 10) - totalCassettes).toLocaleString()}`);

  } catch (error: any) {
    console.error('\n❌ Error during analysis:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const csvFilePath = args[0]; // Optional: path to CSV file

  try {
    await analyzeCSVFile(csvFilePath);
  } catch (error: any) {
    console.error('\n❌ Analysis failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

