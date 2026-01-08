/**
 * Script to convert BNI Excel file to the new Excel template format
 * 
 * This script reads the BNI Excel file (BNI_CASSETTE_COMPLETE.xlsx) which contains:
 * - 1600 machines
 * - 16000 cassettes (10 per machine: 5 main + 5 backup)
 * 
 * And converts it to the new template format:
 * - machine_serial_number
 * - cassette_serial_number
 * - bank_code
 * - pengelola_code
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

interface BNIExcelRecord {
  'SN Mesin'?: string;
  'SN Kaset'?: string;
  'SN Kaset Cadangan'?: string;
  'Tipe Kaset'?: string;
  'utama/cadangan'?: string;
  [key: string]: any;
}

interface TemplateRecord {
  machine_serial_number: string;
  cassette_serial_number: string;
  bank_code: string;
  pengelola_code: string;
}

function convertBNIExcelToTemplate(
  inputFile: string,
  outputFile: string,
  bankCode: string = 'BNI',
  pengelolaCode: string = 'PGL-TAG-001'
): void {
  console.log('🔄 Converting BNI Excel to template format...\n');
  console.log(`📄 Input file: ${inputFile}`);
  console.log(`📄 Output file: ${outputFile}`);
  console.log(`🏦 Bank Code: ${bankCode}`);
  console.log(`🚚 Pengelola Code: ${pengelolaCode}\n`);

  // Read Excel file
  if (!fs.existsSync(inputFile)) {
    throw new Error(`File not found: ${inputFile}`);
  }

  const workbook = XLSX.readFile(inputFile);
  
  // Find the sheet (usually contains "mesin" in name)
  const sheetName = workbook.SheetNames.find(name => 
    name.toLowerCase().includes('mesin') || 
    name.toLowerCase().includes('kaset')
  ) || workbook.SheetNames[0];
  
  console.log(`📊 Reading sheet: ${sheetName}`);
  
  const worksheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as BNIExcelRecord[];
  
  console.log(`📊 Total records in Excel: ${records.length}\n`);

  // Convert to template format
  const templateRecords: TemplateRecord[] = [];
  const processedMachines = new Set<string>();
  let machineCount = 0;
  let cassetteCount = 0;

  for (const record of records) {
    const machineSN = String(record['SN Mesin'] || '').trim();
    const mainCassetteSN = String(record['SN Kaset'] || '').trim();
    const backupCassetteSN = String(record['SN Kaset Cadangan'] || '').trim();
    const cassetteType = String(record['Tipe Kaset'] || '').trim();
    const usageType = String(record['utama/cadangan'] || '').trim().toLowerCase();

    // Skip if no machine SN
    if (!machineSN) {
      continue;
    }

    // Track unique machines
    if (!processedMachines.has(machineSN)) {
      processedMachines.add(machineSN);
      machineCount++;
    }

    // Add main cassette if exists
    if (mainCassetteSN) {
      templateRecords.push({
        machine_serial_number: machineSN,
        cassette_serial_number: mainCassetteSN,
        bank_code: bankCode,
        pengelola_code: pengelolaCode,
      });
      cassetteCount++;
    }

    // Add backup cassette if exists
    if (backupCassetteSN) {
      templateRecords.push({
        machine_serial_number: machineSN,
        cassette_serial_number: backupCassetteSN,
        bank_code: bankCode,
        pengelola_code: pengelolaCode,
      });
      cassetteCount++;
    }
  }

  console.log(`📊 Conversion Summary:`);
  console.log(`   • Unique machines: ${machineCount}`);
  console.log(`   • Total cassettes: ${cassetteCount}`);
  console.log(`   • Template records: ${templateRecords.length}\n`);

  // Create new workbook with Machine-Cassette sheet
  const newWorkbook = XLSX.utils.book_new();
  
  // Prepare data for Excel (header + records)
  const excelData = [
    ['machine_serial_number', 'cassette_serial_number', 'bank_code', 'pengelola_code'],
    ...templateRecords.map(r => [
      r.machine_serial_number,
      r.cassette_serial_number,
      r.bank_code,
      r.pengelola_code,
    ]),
  ];

  const newSheet = XLSX.utils.aoa_to_sheet(excelData);
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Machine-Cassette');

  // Write to file
  XLSX.writeFile(newWorkbook, outputFile);
  
  console.log(`✅ Conversion completed!`);
  console.log(`📄 Output file: ${outputFile}`);
  console.log(`📊 Total rows (including header): ${excelData.length}\n`);
}

// Main execution
const args = process.argv.slice(2);
const inputFile = args[0] || path.join(__dirname, '../data/BNI_CASSETTE_COMPLETE.xlsx');
const outputFile = args[1] || path.join(__dirname, '../data/BNI_TEMPLATE_FORMAT.xlsx');
const bankCode = args[2] || 'BNI';
const pengelolaCode = args[3] || 'VND-TAG-001'; // Default to VND-TAG-001 (from seed data)

try {
  convertBNIExcelToTemplate(inputFile, outputFile, bankCode, pengelolaCode);
  console.log('✅ Script completed successfully!\n');
} catch (error: any) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

