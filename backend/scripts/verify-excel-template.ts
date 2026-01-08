/**
 * Script to verify Excel template file format
 * 
 * This script reads the converted Excel file and verifies:
 * - Sheet names
 * - Column headers
 * - Data rows
 * - Data format
 */

import * as XLSX from 'xlsx';
import * as path from 'path';

const excelFile = process.argv[2] || path.join(__dirname, '../data/BNI_TEMPLATE_FORMAT.xlsx');

console.log('🔍 Verifying Excel template file...\n');
console.log(`📄 File: ${excelFile}\n`);

try {
  const workbook = XLSX.readFile(excelFile);
  const sheetNames = workbook.SheetNames;
  
  console.log(`📊 Sheets found: ${sheetNames.join(', ')}\n`);
  
  // Find Machine-Cassette sheet
  const machineCassetteSheetName = sheetNames.find(name => 
    name.includes('Machine') || name.includes('machine')
  ) || sheetNames[0];
  
  console.log(`📋 Using sheet: ${machineCassetteSheetName}\n`);
  
  const worksheet = workbook.Sheets[machineCassetteSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  console.log(`📊 Total rows: ${jsonData.length}\n`);
  
  if (jsonData.length < 2) {
    console.error('❌ Error: Sheet has less than 2 rows (header + data)');
    process.exit(1);
  }
  
  // First row is header
  const headers = (jsonData[0] as string[]).map(h => h.toString().trim());
  console.log(`📋 Headers (${headers.length} columns):`);
  headers.forEach((h, i) => {
    console.log(`   ${i + 1}. "${h}"`);
  });
  console.log();
  
  // Find column indices
  const getColIndex = (name: string): number => {
    return headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
  };
  
  const machineSNIdx = getColIndex('machine_serial_number') >= 0 ? getColIndex('machine_serial_number') : 
                      getColIndex('machine') >= 0 ? getColIndex('machine') : -1;
  const cassetteSNIdx = getColIndex('cassette_serial_number') >= 0 ? getColIndex('cassette_serial_number') : 
                       getColIndex('cassette') >= 0 ? getColIndex('cassette') : -1;
  const bankCodeIdx = getColIndex('bank_code') >= 0 ? getColIndex('bank_code') : 
                     getColIndex('bank') >= 0 ? getColIndex('bank') : -1;
  const pengelolaCodeIdx = getColIndex('pengelola_code') >= 0 ? getColIndex('pengelola_code') : 
                          getColIndex('pengelola') >= 0 ? getColIndex('pengelola') : -1;
  
  console.log(`🔍 Column indices:`);
  console.log(`   Machine: ${machineSNIdx >= 0 ? machineSNIdx + ' (' + headers[machineSNIdx] + ')' : 'NOT FOUND'}`);
  console.log(`   Cassette: ${cassetteSNIdx >= 0 ? cassetteSNIdx + ' (' + headers[cassetteSNIdx] + ')' : 'NOT FOUND'}`);
  console.log(`   Bank: ${bankCodeIdx >= 0 ? bankCodeIdx + ' (' + headers[bankCodeIdx] + ')' : 'NOT FOUND'}`);
  console.log(`   Pengelola: ${pengelolaCodeIdx >= 0 ? pengelolaCodeIdx + ' (' + headers[pengelolaCodeIdx] + ')' : 'NOT FOUND'}`);
  console.log();
  
  if (cassetteSNIdx === -1 || bankCodeIdx === -1 || pengelolaCodeIdx === -1) {
    console.error('❌ Error: Missing required columns!');
    if (cassetteSNIdx === -1) console.error('   - cassette_serial_number (or cassette)');
    if (bankCodeIdx === -1) console.error('   - bank_code (or bank)');
    if (pengelolaCodeIdx === -1) console.error('   - pengelola_code (or pengelola)');
    process.exit(1);
  }
  
  // Check data rows
  let validRows = 0;
  let invalidRows = 0;
  const invalidRowsList: Array<{ row: number; reason: string }> = [];
  
  console.log(`📊 Checking data rows (showing first 10):\n`);
  
  for (let i = 1; i < jsonData.length && i <= 10; i++) {
    const row = jsonData[i] as any[];
    const cassetteSN = row && row[cassetteSNIdx] !== undefined && row[cassetteSNIdx] !== null
      ? row[cassetteSNIdx].toString().trim()
      : '';
    const bankCode = row && row[bankCodeIdx] !== undefined && row[bankCodeIdx] !== null
      ? row[bankCodeIdx].toString().trim()
      : '';
    const pengelolaCode = row && row[pengelolaCodeIdx] !== undefined && row[pengelolaCodeIdx] !== null
      ? row[pengelolaCodeIdx].toString().trim()
      : '';
    
    const isValid = cassetteSN && bankCode && pengelolaCode;
    
    if (isValid) {
      validRows++;
      console.log(`✅ Row ${i + 1}: Valid - Cassette: "${cassetteSN}", Bank: "${bankCode}", Pengelola: "${pengelolaCode}"`);
    } else {
      invalidRows++;
      const missing: string[] = [];
      if (!cassetteSN) missing.push('cassette');
      if (!bankCode) missing.push('bank');
      if (!pengelolaCode) missing.push('pengelola');
      console.log(`❌ Row ${i + 1}: Invalid - Missing: ${missing.join(', ')}`);
      invalidRowsList.push({ row: i + 1, reason: `Missing: ${missing.join(', ')}` });
    }
  }
  
  // Count all rows
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    const cassetteSN = row && row[cassetteSNIdx] !== undefined && row[cassetteSNIdx] !== null
      ? row[cassetteSNIdx].toString().trim()
      : '';
    const bankCode = row && row[bankCodeIdx] !== undefined && row[bankCodeIdx] !== null
      ? row[bankCodeIdx].toString().trim()
      : '';
    const pengelolaCode = row && row[pengelolaCodeIdx] !== undefined && row[pengelolaCodeIdx] !== null
      ? row[pengelolaCodeIdx].toString().trim()
      : '';
    
    if (cassetteSN && bankCode && pengelolaCode) {
      validRows++;
    } else {
      invalidRows++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows (excluding header): ${jsonData.length - 1}`);
  console.log(`   Valid rows: ${validRows}`);
  console.log(`   Invalid rows: ${invalidRows}`);
  
  if (validRows === 0) {
    console.error(`\n❌ Error: No valid data rows found!`);
    console.error(`   All rows are missing required fields (cassette_serial_number, bank_code, pengelola_code)`);
    process.exit(1);
  }
  
  console.log(`\n✅ Excel file format is valid!`);
  console.log(`   Ready for import with ${validRows} valid records.`);
  
} catch (error: any) {
  console.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
}

