import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

export interface BankData {
  bankCode: string;
  bankName: string;
  branchCode?: string;
  address?: string;
  city?: string;
  province?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

export interface CassetteData {
  serialNumber: string;
  cassetteTypeCode?: string; // Optional: will be auto-detected from serial number if not provided
  customerBankCode: string;
  status?: 'OK' | 'BAD' | 'IN_TRANSIT_TO_RC' | 'IN_REPAIR' | 'READY_FOR_PICKUP' | 'IN_TRANSIT_TO_PENGELOLA' | 'SCRAPPED';
  usageType?: string;
  notes?: string;
}

export interface MachineCassetteVendorData {
  machine_serial_number?: string;
  cassette_serial_number?: string;
  bank_code?: string;
  pengelola_code?: string;
}

export interface MachineCassetteData {
  machineSerialNumber: string;
  mainCassettes: string[];
  backupCassettes: string[];
}

export interface MachineCassetteImportResult {
  success: boolean;
  machines?: {
    total: number;
    successful: number;
    failed: number;
    results: Array<{ success: boolean; machineSN?: string; error?: string }>;
  };
  cassettes?: {
    total: number;
    successful: number;
    failed: number;
    results: Array<{ success: boolean; cassetteSN?: string; error?: string }>;
  };
}

export interface ImportData {
  banks?: BankData[];
  cassettes?: CassetteData[];
}

export interface ImportResult {
  success: boolean;
  banks?: {
    total: number;
    successful: number;
    failed: number;
    results: Array<{ success: boolean; bankCode?: string; bankName?: string; error?: string }>;
  };
  cassettes?: {
    total: number;
    successful: number;
    failed: number;
    results: Array<{ success: boolean; serialNumber?: string; error?: string }>;
  };
  machines?: {
    total: number;
    successful: number;
    failed: number;
    results: Array<{ success: boolean; serialNumber?: string; error?: string }>;
  };
}

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Extract cassette type code from serial number
   * Examples:
   * - 76UWRB2SB899406 → RB (contains "RB")
   * - 76UWAB2SW754109 → AB (contains "AB")
   * - 76UWURJB2SW754109 → URJB (contains "URJB")
   */
  private extractCassetteTypeFromSN(serialNumber: string): string | undefined {
    const upperSN = serialNumber.toUpperCase();
    
    // Check for URJB first (longer pattern)
    if (upperSN.includes('URJB')) {
      return 'URJB';
    }
    
    // Then check for RB
    if (upperSN.includes('RB')) {
      return 'RB';
    }
    
    // Finally check for AB
    if (upperSN.includes('AB')) {
      return 'AB';
    }
    
    return undefined;
  }

  async bulkImport(importData: ImportData, userId: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
    };

    // Import banks
    if (importData.banks && importData.banks.length > 0) {
      const bankResults = await this.importBanks(importData.banks);
      result.banks = {
        total: importData.banks.length,
        successful: bankResults.filter(r => r.success).length,
        failed: bankResults.filter(r => !r.success).length,
        results: bankResults,
      };
    }

    // Import cassettes
    if (importData.cassettes && importData.cassettes.length > 0) {
      const cassetteResults = await this.importCassettes(importData.cassettes);
      result.cassettes = {
        total: importData.cassettes.length,
        successful: cassetteResults.filter(r => r.success).length,
        failed: cassetteResults.filter(r => !r.success).length,
        results: cassetteResults,
      };
    }

    result.success = 
      (!result.banks || result.banks.failed === 0) &&
      (!result.cassettes || result.cassettes.failed === 0);

    return result;
  }

  async importFromExcel(file: Express.Multer.File, userId: string): Promise<ImportResult> {
    try {
      // Validate file type by extension
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        throw new BadRequestException('Invalid file type. Please upload Excel file (.xlsx or .xls)');
      }

      // Validate MIME type (more secure than extension alone)
      const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/excel',
        'application/x-excel',
      ];
      
      if (file.mimetype && !validMimeTypes.includes(file.mimetype.toLowerCase())) {
        throw new BadRequestException(
          `Invalid file MIME type: ${file.mimetype}. Expected Excel file`
        );
      }

      // Parse Excel file
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      
      // Get sheet names
      const sheetNames = workbook.SheetNames;
      
      console.log(`📊 [ImportService] Excel file opened. Sheets found: ${sheetNames.join(', ')}`);
      
      // Check if it's Machine-Cassette-Pengelola format (untuk bulk import mesin, kaset, dan pengelola)
      if (sheetNames.includes('Machine-Cassette') || sheetNames.some(name => name.toLowerCase().includes('machine'))) {
        // Parse Machine-Cassette sheet untuk bulk import mesin, kaset, dan pengelola
        const machineCassetteSheetName = sheetNames.find(name => name.includes('Machine') || name.includes('machine')) || 'Machine-Cassette';
        const machineCassetteSheet = workbook.Sheets[machineCassetteSheetName];
        
        console.log(`📊 [ImportService] Found Machine-Cassette sheet: ${machineCassetteSheetName}`);
        
        try {
          const machineCassetteData = this.parseMachineCassetteSheet(machineCassetteSheet);
          
          console.log(`📊 [ImportService] Parsed ${machineCassetteData.length} records from Machine-Cassette sheet`);
          
          if (machineCassetteData.length === 0) {
            throw new BadRequestException(
              'No valid data found in Machine-Cassette sheet. ' +
              'Please ensure the sheet contains data rows with columns: ' +
              'machine_serial_number (optional), cassette_serial_number, bank_code, pengelola_code'
            );
          }
          
          // Convert to CSV format and use CSV import logic
          return this.importMachineCassetteFromExcelData(machineCassetteData, userId);
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException(
            `Error parsing Machine-Cassette sheet: ${error.message}. ` +
            'Please ensure the sheet has columns: cassette_serial_number, bank_code (machine_serial_number and pengelola_code are optional)'
          );
        }
      }
      
      // Parse Banks sheet
      let banks: BankData[] = [];
      if (sheetNames.includes('Banks')) {
        const banksSheet = workbook.Sheets['Banks'];
        banks = this.parseBanksSheet(banksSheet);
      }

      // Parse Cassettes sheet
      let cassettes: CassetteData[] = [];
      if (sheetNames.includes('Cassettes')) {
        const cassettesSheet = workbook.Sheets['Cassettes'];
        cassettes = this.parseCassettesSheet(cassettesSheet);
      }

      if (banks.length === 0 && cassettes.length === 0) {
        throw new BadRequestException(
          `Excel file must contain "Machine-Cassette", "Banks", and/or "Cassettes" sheets. ` +
          `Found sheets: ${sheetNames.join(', ')}. ` +
          `Please ensure your Excel file has one of these sheets with valid data.`
        );
      }

      // Import data
      const importData: ImportData = {
        banks: banks.length > 0 ? banks : undefined,
        cassettes: cassettes.length > 0 ? cassettes : undefined,
      };

      return this.bulkImport(importData, userId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error parsing Excel file: ${error.message}`);
    }
  }

  private parseBanksSheet(sheet: XLSX.WorkSheet): BankData[] {
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    if (jsonData.length < 2) {
      return [];
    }

    // First row is header
    const headers = (jsonData[0] as string[]).map(h => h.toString().trim().toLowerCase());
    
    // Find column indices
    const getColIndex = (name: string): number => {
      return headers.findIndex(h => h.includes(name.toLowerCase()));
    };

    const bankCodeIdx = getColIndex('bankcode') >= 0 ? getColIndex('bankcode') : getColIndex('bank_code');
    const bankNameIdx = getColIndex('bankname') >= 0 ? getColIndex('bankname') : getColIndex('bank_name');
    
    if (bankCodeIdx === -1 || bankNameIdx === -1) {
      throw new BadRequestException('Excel Banks sheet must have "BankCode" and "BankName" columns');
    }

    const banks: BankData[] = [];
    
    // Parse data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      
      // Skip empty rows
      if (!row[bankCodeIdx] || !row[bankNameIdx]) {
        continue;
      }

      const getValue = (idx: number): string | undefined => {
        const val = row[idx];
        return val ? val.toString().trim() : undefined;
      };

      const branchCodeIdx = getColIndex('branchcode') >= 0 ? getColIndex('branchcode') : getColIndex('branch_code');
      const cityIdx = getColIndex('city');
      const provinceIdx = getColIndex('province');
      const addressIdx = getColIndex('address');
      const contactPersonIdx = getColIndex('contactperson') >= 0 ? getColIndex('contactperson') : getColIndex('contact_person');
      const contactPhoneIdx = getColIndex('contactphone') >= 0 ? getColIndex('contactphone') : getColIndex('contact_phone');
      const contactEmailIdx = getColIndex('contactemail') >= 0 ? getColIndex('contactemail') : getColIndex('contact_email');
      const notesIdx = getColIndex('notes');

      banks.push({
        bankCode: getValue(bankCodeIdx) || '',
        bankName: getValue(bankNameIdx) || '',
        branchCode: getValue(branchCodeIdx),
        city: getValue(cityIdx),
        province: getValue(provinceIdx),
        address: getValue(addressIdx),
        contactPerson: getValue(contactPersonIdx),
        contactPhone: getValue(contactPhoneIdx),
        contactEmail: getValue(contactEmailIdx),
        notes: getValue(notesIdx),
      });
    }

    return banks;
  }

  private parseCassettesSheet(sheet: XLSX.WorkSheet): CassetteData[] {
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    if (jsonData.length < 2) {
      return [];
    }

    // First row is header
    const headers = (jsonData[0] as string[]).map(h => h.toString().trim().toLowerCase());
    
    // Find column indices
    const getColIndex = (name: string): number => {
      return headers.findIndex(h => h.includes(name.toLowerCase()));
    };

    const serialNumberIdx = getColIndex('serialnumber') >= 0 ? getColIndex('serialnumber') : getColIndex('serial_number');
    const typeCodeIdx = getColIndex('cassettetypecode') >= 0 ? getColIndex('cassettetypecode') : 
                       getColIndex('cassette_type_code') >= 0 ? getColIndex('cassette_type_code') :
                       getColIndex('typecode') >= 0 ? getColIndex('typecode') : getColIndex('type_code');
    const bankCodeIdx = getColIndex('customerbankcode') >= 0 ? getColIndex('customerbankcode') : 
                       getColIndex('customer_bank_code') >= 0 ? getColIndex('customer_bank_code') :
                       getColIndex('bankcode') >= 0 ? getColIndex('bankcode') : getColIndex('bank_code');
    
    // SerialNumber and BankCode are required, but TypeCode is optional (can be auto-detected from SN)
    if (serialNumberIdx === -1 || bankCodeIdx === -1) {
      throw new BadRequestException('Excel Cassettes sheet must have "SerialNumber" and "CustomerBankCode" columns. CassetteTypeCode is optional (will be auto-detected from serial number).');
    }

    const cassettes: CassetteData[] = [];
    
    // Parse data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      
      // Skip empty rows - only serialNumber and bankCode are required now
      if (!row[serialNumberIdx] || !row[bankCodeIdx]) {
        continue;
      }

      const getValue = (idx: number): string | undefined => {
        const val = row[idx];
        return val ? val.toString().trim() : undefined;
      };

      const getNumberValue = (idx: number): number | undefined => {
        const val = row[idx];
        if (val === undefined || val === null || val === '') return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
      };

      const statusIdx = getColIndex('status');
      const usageTypeIdx = getColIndex('usagetype') >= 0 ? getColIndex('usagetype') : getColIndex('usage_type');
      const notesIdx = getColIndex('notes');

      const normalizeStatus = (status?: string): CassetteData['status'] => {
        if (!status) return undefined;
        const normalized = status.toUpperCase().trim();
        // Map common variations
        if (normalized === 'OK' || normalized === 'GOOD' || normalized === 'INSTALLED' || normalized === 'SPARE_POOL' || normalized === 'SPARE') return 'OK';
        if (normalized === 'BROKEN' || normalized === 'BAD') return 'BAD';
        if (normalized === 'IN_TRANSIT_TO_RC' || normalized === 'IN_TRANSIT') return 'IN_TRANSIT_TO_RC';
        if (normalized === 'IN_REPAIR' || normalized === 'REPAIR' || normalized === 'UNDER_REPAIR') return 'IN_REPAIR';
        if (normalized === 'READY_FOR_PICKUP' || normalized === 'READY' || normalized === 'READY_PICKUP' || normalized === 'PICKUP') return 'READY_FOR_PICKUP';
        if (normalized === 'IN_TRANSIT_TO_PENGELOLA' || normalized === 'RETURNING') return 'IN_TRANSIT_TO_PENGELOLA';
        if (normalized === 'SCRAPPED') return 'SCRAPPED';
        return normalized as any;
      };

      const serialNumber = getValue(serialNumberIdx) || '';
      
      // Get type code from column if exists, otherwise leave empty for auto-detection
      let cassetteTypeCode = typeCodeIdx >= 0 ? getValue(typeCodeIdx) : undefined;
      
      // If no type code provided, try to auto-detect from serial number
      if (!cassetteTypeCode && serialNumber) {
        cassetteTypeCode = this.extractCassetteTypeFromSN(serialNumber) || '';
      }

      cassettes.push({
        serialNumber,
        cassetteTypeCode: cassetteTypeCode || '',
        customerBankCode: getValue(bankCodeIdx) || '',
        status: normalizeStatus(getValue(statusIdx)),
        usageType: usageTypeIdx >= 0 ? getValue(usageTypeIdx) : undefined,
        notes: getValue(notesIdx),
      });
    }

    return cassettes;
  }

  private parseMachineCassetteSheet(sheet: XLSX.WorkSheet): MachineCassetteVendorData[] {
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    console.log(`📊 [ImportService] Parsing sheet, total rows: ${jsonData.length}`);
    
    if (jsonData.length < 2) {
      console.warn(`⚠️ [ImportService] Sheet has less than 2 rows (header + data). Total rows: ${jsonData.length}`);
      return [];
    }

    // First row is header
    const headers = (jsonData[0] as string[]).map(h => h.toString().trim().toLowerCase());
    
    console.log(`📊 [ImportService] Headers found: ${headers.join(', ')}`);
    console.log(`📊 [ImportService] First row (header) raw:`, JSON.stringify(jsonData[0]));
    
    // Find column indices
    const getColIndex = (name: string): number => {
      return headers.findIndex(h => h.includes(name.toLowerCase()));
    };

    const machineSNIdx = getColIndex('machine_serial_number') >= 0 ? getColIndex('machine_serial_number') : 
                        getColIndex('machine') >= 0 ? getColIndex('machine') : -1;
    const cassetteSNIdx = getColIndex('cassette_serial_number') >= 0 ? getColIndex('cassette_serial_number') : 
                         getColIndex('cassette') >= 0 ? getColIndex('cassette') : -1;
    const bankCodeIdx = getColIndex('bank_code') >= 0 ? getColIndex('bank_code') : 
                       getColIndex('bank') >= 0 ? getColIndex('bank') : -1;
    const pengelolaCodeIdx = getColIndex('pengelola_code') >= 0 ? getColIndex('pengelola_code') : 
                            getColIndex('pengelola') >= 0 ? getColIndex('pengelola') : -1;
    
    console.log(`📊 [ImportService] Column indices - Machine: ${machineSNIdx}, Cassette: ${cassetteSNIdx}, Bank: ${bankCodeIdx}, Pengelola: ${pengelolaCodeIdx}`);
    
    if (cassetteSNIdx === -1 || bankCodeIdx === -1) {
      const missingCols: string[] = [];
      if (cassetteSNIdx === -1) missingCols.push('cassette_serial_number (or cassette)');
      if (bankCodeIdx === -1) missingCols.push('bank_code (or bank)');
      
      throw new BadRequestException(
        `Excel Machine-Cassette sheet is missing required columns: ${missingCols.join(', ')}. ` +
        `Found columns: ${headers.join(', ')}. ` +
        'Please ensure the sheet has columns: cassette_serial_number, bank_code (machine_serial_number and pengelola_code are optional)'
      );
    }

    const records: MachineCassetteVendorData[] = [];
    let skippedRows = 0;
    
    // Parse data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      
      // Log first few rows for debugging
      if (i <= 3) {
        console.log(`📊 [ImportService] Row ${i + 1} data:`, JSON.stringify(row));
      }
      
      // Skip empty rows - only cassette and bank are required, pengelola is optional
      const cassetteSN = row && row[cassetteSNIdx] !== undefined && row[cassetteSNIdx] !== null 
        ? row[cassetteSNIdx].toString().trim() 
        : '';
      const bankCode = row && row[bankCodeIdx] !== undefined && row[bankCodeIdx] !== null
        ? row[bankCodeIdx].toString().trim()
        : '';
      const pengelolaCode = pengelolaCodeIdx >= 0 && row && row[pengelolaCodeIdx] !== undefined && row[pengelolaCodeIdx] !== null
        ? row[pengelolaCodeIdx].toString().trim()
        : undefined;
      
      if (i <= 3) {
        console.log(`📊 [ImportService] Row ${i + 1} extracted - Cassette: "${cassetteSN}", Bank: "${bankCode}", Pengelola: "${pengelolaCode || '(optional, will skip assignment)'}"`);
      }
      
      // Only cassette and bank are required
      if (!cassetteSN || !bankCode) {
        skippedRows++;
        if (skippedRows <= 10) {
          console.log(`⚠️ [ImportService] Skipping row ${i + 1}: missing required fields - Cassette: "${cassetteSN}", Bank: "${bankCode}"`);
        }
        continue;
      }

      const getValue = (idx: number): string | undefined => {
        if (idx === -1) return undefined;
        if (!row || row[idx] === undefined || row[idx] === null) return undefined;
        const val = row[idx];
        return val ? val.toString().trim() : undefined;
      };

      records.push({
        machine_serial_number: getValue(machineSNIdx),
        cassette_serial_number: cassetteSN,
        bank_code: bankCode,
        pengelola_code: pengelolaCode || undefined, // Optional
      });
      
      if (records.length <= 3) {
        console.log(`✅ [ImportService] Added record ${records.length}:`, {
          machine: getValue(machineSNIdx),
          cassette: cassetteSN,
          bank: bankCode,
          pengelola: pengelolaCode,
        });
      }
    }

    console.log(`📊 [ImportService] Parsed ${records.length} valid records, skipped ${skippedRows} empty/invalid rows`);
    
    return records;
  }

  private async importMachineCassetteFromExcelData(
    records: MachineCassetteVendorData[],
    userId: string
  ): Promise<ImportResult> {
    // Reuse the CSV import logic by calling importFromCSV logic
    // Convert records to the same format as CSV import
    return this.processMachineCassetteRecords(records, userId);
  }

  private async processMachineCassetteRecords(
    records: MachineCassetteVendorData[],
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
    };

    // Process records (same logic as CSV import)
    const machineResults: Array<{ success: boolean; serialNumber?: string; error?: string }> = [];
    const cassetteResults: Array<{ success: boolean; serialNumber?: string; error?: string }> = [];
    
    // Track unique machines to avoid duplicate processing
    // Use Map to store machine serial number -> machine ID for cassette linking
    const processedMachines = new Map<string, string>();
    // Track cassette count per machine for usageType assignment (first 5 = MAIN, next 5 = BACKUP)
    const machineCassetteCounts = new Map<string, number>();
    // Track bank-pengelola pairs that have already been assigned to avoid duplicate assignments
    const processedAssignments = new Set<string>(); // Format: "bankId:pengelolaId"

    let processedCount = 0;
    const logInterval = 1000;

    for (const record of records) {
      processedCount++;
      
      if (processedCount % logInterval === 0) {
        console.log(`🔄 [ImportService] Processing record ${processedCount}/${records.length}...`);
      }

      const machineSN = record.machine_serial_number?.trim();
      const cassetteSN = record.cassette_serial_number?.trim();
      const bankCode = record.bank_code?.trim();
      const pengelolaCode = record.pengelola_code?.trim();

      // Only cassette and bank are required. Machine and Pengelola are optional
      if (!cassetteSN || !bankCode) {
        cassetteResults.push({
          success: false,
          serialNumber: cassetteSN || 'N/A',
          error: 'Missing required fields (cassette or bank)',
        });
        if (machineSN) {
          machineResults.push({
            success: false,
            serialNumber: machineSN,
            error: 'Missing required fields (cassette or bank)',
          });
        }
        continue;
      }

      try {
        // Get bank
        const bank = await this.prisma.customerBank.findUnique({
          where: { bankCode },
        });

        if (!bank) {
          throw new BadRequestException(`Bank ${bankCode} not found`);
        }

        // Get pengelola (optional - can be assigned manually later)
        let pengelola: { id: string } | null = null;
        if (pengelolaCode) {
          const foundPengelola = await this.prisma.pengelola.findUnique({
            where: { pengelolaCode },
          });

          if (!foundPengelola) {
            console.warn(`⚠️ [ImportService] Pengelola ${pengelolaCode} not found. Skipping pengelola assignment. You can assign manually later.`);
            // Don't throw error, just skip pengelola assignment
          } else {
            pengelola = foundPengelola;
          }
        }

        // Process machine if provided (same logic as CSV import)
        let machineId: string | null = null;
        if (machineSN && !processedMachines.has(machineSN)) {
          try {
            // Check if machine exists by serial number
            const existingMachine = await this.prisma.machine.findFirst({
              where: { serialNumberManufacturer: machineSN },
            });

            if (existingMachine) {
              machineId = existingMachine.id;
              // Update existing machine Pengelola assignment (only if pengelola provided)
              if (pengelola) {
                await this.prisma.machine.update({
                  where: { id: existingMachine.id },
                  data: { pengelolaId: pengelola.id },
                });
              }
              machineResults.push({
                success: true,
                serialNumber: machineSN,
              });
            } else {
              // Create new machine (minimal required fields)
              // Use more digits from serial number to avoid duplicate machineCode
              // Use last 8 characters instead of 6, and sanitize to ensure uniqueness
              const serialSuffix = machineSN.slice(-8).replace(/[^A-Z0-9]/g, '') || machineSN.slice(-6);
              const machineCode = `M-${bankCode}-${serialSuffix}`;
              
              // Try to create machine, if machineCode duplicate, use upsert instead
              try {
                const machineData: any = {
                  customerBankId: bank.id,
                  machineCode,
                  modelName: 'SR7500VS', // Default model
                  serialNumberManufacturer: machineSN,
                  physicalLocation: `Bank ${bank.bankName}`,
                  status: 'OPERATIONAL',
                };
                // pengelolaId is now optional - can be assigned manually later
                if (pengelola?.id) {
                  machineData.pengelolaId = pengelola.id;
                }
                const newMachine = await this.prisma.machine.create({
                  data: machineData as any, // Type assertion needed due to Prisma client type mismatch
                });
                machineId = newMachine.id;
                machineResults.push({
                  success: true,
                  serialNumber: machineSN,
                });
              } catch (createError: any) {
                // If machineCode duplicate, try to find existing machine with this code and use it
                if (createError.code === 'P2002' && createError.meta?.target?.includes('machine_code')) {
                  console.warn(`⚠️ [ImportService] Machine code ${machineCode} already exists, trying to find existing machine...`);
                  const existingMachineByCode = await this.prisma.machine.findUnique({
                    where: { machineCode },
                  });
                  
                  if (existingMachineByCode) {
                    machineId = existingMachineByCode.id;
                    // Update pengelola if provided
                    if (pengelola?.id) {
                      await this.prisma.machine.update({
                        where: { id: existingMachineByCode.id },
                        data: { pengelolaId: pengelola.id },
                      });
                    }
                    machineResults.push({
                      success: true,
                      serialNumber: machineSN,
                    });
                  } else {
                    // If not found, try upsert based on serial number (fallback)
                    throw createError;
                  }
                } else {
                  throw createError;
                }
              }
            }
            processedMachines.set(machineSN, machineId); // Store machine ID for cassette linking
          } catch (error: any) {
            machineResults.push({
              success: false,
              serialNumber: machineSN,
              error: error.message,
            });
            processedMachines.set(machineSN, ''); // Mark as processed even if failed to avoid retry
          }
        } else if (machineSN && processedMachines.has(machineSN)) {
          // Machine already processed, get its ID
          machineId = processedMachines.get(machineSN) as string | null;
        }

        // Process cassette
        // Auto-detect cassette type from serial number
        let cassetteTypeCode = this.extractCassetteTypeFromSN(cassetteSN);
        if (!cassetteTypeCode) {
          // Default to RB if cannot detect
          cassetteTypeCode = 'RB';
          console.warn(`⚠️ Could not detect cassette type from SN: ${cassetteSN}, defaulting to RB`);
        }

        const cassetteType = await this.prisma.cassetteType.findUnique({
          where: { typeCode: cassetteTypeCode as any },
        });

        if (!cassetteType) {
          throw new BadRequestException(`Cassette type ${cassetteTypeCode} not found`);
        }

        // Determine usageType based on position in Excel (first 5 = MAIN, next 5 = BACKUP)
        let usageType: 'MAIN' | 'BACKUP' | undefined = undefined;
        if (machineSN && machineId) {
          const currentCount = machineCassetteCounts.get(machineSN) || 0;
          usageType = currentCount < 5 ? 'MAIN' : 'BACKUP';
          machineCassetteCounts.set(machineSN, currentCount + 1);
        }

        const cassetteData: any = {
          serialNumber: cassetteSN,
          cassetteTypeId: cassetteType.id,
          customerBankId: bank.id,
          status: 'OK',
        };
        if (usageType) {
          cassetteData.usageType = usageType;
        }
        if (machineId) {
          cassetteData.machineId = machineId;
        }

        const updateData: any = {
          cassetteTypeId: cassetteType.id,
          customerBankId: bank.id,
          status: 'OK',
        };
        if (machineId) {
          updateData.machineId = machineId;
        }
        if (usageType) {
          updateData.usageType = usageType;
        }

        await this.prisma.cassette.upsert({
          where: { serialNumber: cassetteSN },
          update: updateData,
          create: cassetteData,
        });

        cassetteResults.push({ success: true, serialNumber: cassetteSN });

        // Create or update Pengelola-bank assignment (only if pengelola provided and not already processed)
        if (pengelola) {
          const assignmentKey = `${bank.id}:${pengelola.id}`;
          if (!processedAssignments.has(assignmentKey)) {
            try {
              await this.prisma.bankPengelolaAssignment.upsert({
                where: {
                  customerBankId_pengelolaId: {
                    customerBankId: bank.id,
                    pengelolaId: pengelola.id,
                  },
                },
                update: {
                  status: 'ACTIVE',
                },
                create: {
                  customerBankId: bank.id,
                  pengelolaId: pengelola.id,
                  status: 'ACTIVE',
                },
              });
              processedAssignments.add(assignmentKey); // Mark as processed
            } catch (error: any) {
              // Log but don't fail the import if assignment fails
              console.warn(`⚠️ Failed to create/update pengelola assignment: ${error.message}`);
            }
          }
          // If already processed, skip silently (assignment already exists)
        } else {
          console.log(`ℹ️ [ImportService] Pengelola not provided for bank ${bankCode}. Assignment can be done manually later.`);
        }
      } catch (error: any) {
        cassetteResults.push({
          success: false,
          serialNumber: cassetteSN,
          error: error.message,
        });
        // Don't mark machine as failed if only cassette failed
        // Machine might have been successfully created/updated earlier
        // Only mark machine as failed if it hasn't been processed yet
        if (machineSN && !processedMachines.has(machineSN)) {
          machineResults.push({
            success: false,
            serialNumber: machineSN,
            error: `Failed to process cassette: ${error.message}`,
          });
        }
      }
    }

    result.cassettes = {
      total: cassetteResults.length,
      successful: cassetteResults.filter(r => r.success).length,
      failed: cassetteResults.filter(r => !r.success).length,
      results: cassetteResults,
    };

    if (machineResults.length > 0) {
      result.machines = {
        total: machineResults.length,
        successful: machineResults.filter(r => r.success).length,
        failed: machineResults.filter(r => !r.success).length,
        results: machineResults,
      };
    }

    result.success = 
      (!result.cassettes || result.cassettes.failed === 0) &&
      (!result.machines || result.machines.failed === 0);

    return result;
  }

  private async importBanks(banks: BankData[]) {
    const results: Array<{ success: boolean; bankCode: string; bankName?: string; error?: any }> = [];

    for (const bankData of banks) {
      try {
        if (!bankData.bankCode || !bankData.bankName) {
          throw new BadRequestException('bankCode and bankName are required');
        }

        const bank = await this.prisma.customerBank.upsert({
          where: { bankCode: bankData.bankCode },
          update: {
            bankName: bankData.bankName,
            primaryContactName: bankData.contactPerson,
            primaryContactPhone: bankData.contactPhone,
            primaryContactEmail: bankData.contactEmail,
          },
          create: {
            bankCode: bankData.bankCode,
            bankName: bankData.bankName,
            primaryContactName: bankData.contactPerson,
            primaryContactPhone: bankData.contactPhone,
            primaryContactEmail: bankData.contactEmail,
            status: 'ACTIVE',
          },
        });

        results.push({ 
          success: true, 
          bankCode: bank.bankCode, 
          bankName: bank.bankName 
        });
      } catch (error) {
        results.push({ 
          success: false, 
          bankCode: bankData.bankCode, 
          error: error.message 
        });
      }
    }

    return results;
  }

  private async importCassettes(cassettes: CassetteData[]) {
    const results: Array<{ success: boolean; serialNumber: string; error?: any }> = [];
    
    console.log(`🔵 [ImportService] Starting cassette import. Total: ${cassettes.length}`);
    let processedCount = 0;
    const logInterval = 1000; // Log every 1000 records

    for (const cassetteData of cassettes) {
      processedCount++;
      
      // Log progress every N records
      if (processedCount % logInterval === 0) {
        console.log(`🔄 [ImportService] Processing cassette ${processedCount}/${cassettes.length}...`);
      }
      try {
        if (!cassetteData.serialNumber || !cassetteData.customerBankCode) {
          throw new BadRequestException('serialNumber and customerBankCode are required');
        }

        // Auto-detect cassette type from serial number if not provided
        let cassetteTypeCode = cassetteData.cassetteTypeCode;
        if (!cassetteTypeCode) {
          cassetteTypeCode = this.extractCassetteTypeFromSN(cassetteData.serialNumber);
          if (cassetteTypeCode) {
            console.log(`🔍 Auto-detected cassette type "${cassetteTypeCode}" from SN: ${cassetteData.serialNumber}`);
          } else {
            throw new BadRequestException(`Could not detect cassette type from SN: ${cassetteData.serialNumber}. Please provide cassetteTypeCode.`);
          }
        }

        // Get cassette type
        const cassetteType = await this.prisma.cassetteType.findUnique({
          where: { typeCode: cassetteTypeCode as any },
        });

        if (!cassetteType) {
          throw new BadRequestException(`Cassette type ${cassetteTypeCode} not found`);
        }

        // Get customer bank
        const bank = await this.prisma.customerBank.findUnique({
          where: { bankCode: cassetteData.customerBankCode },
        });

        if (!bank) {
          throw new BadRequestException(`Bank ${cassetteData.customerBankCode} not found`);
        }

        // Normalize usageType
        const normalizeUsageType = (usageType?: string): any => {
          if (!usageType) return undefined;
          const normalized = usageType.toUpperCase().trim();
          if (normalized === 'PRIMARY' || normalized === 'MAIN') return 'MAIN';
          if (normalized === 'SPARE' || normalized === 'BACKUP') return 'BACKUP';
          return normalized as any;
        };

        const cassette = await this.prisma.cassette.upsert({
          where: { serialNumber: cassetteData.serialNumber },
          update: {
            cassetteTypeId: cassetteType.id,
            customerBankId: bank.id,
            status: (cassetteData.status || 'OK') as any,
            usageType: normalizeUsageType(cassetteData.usageType),
            notes: cassetteData.notes,
          },
          create: {
            serialNumber: cassetteData.serialNumber,
            cassetteTypeId: cassetteType.id,
            customerBankId: bank.id,
            status: (cassetteData.status || 'OK') as any,
            usageType: normalizeUsageType(cassetteData.usageType),
            notes: cassetteData.notes,
          },
        });

        results.push({ 
          success: true, 
          serialNumber: cassette.serialNumber 
        });
      } catch (error) {
        results.push({ 
          success: false, 
          serialNumber: cassetteData.serialNumber, 
          error: error.message 
        });
      }
    }

    console.log(`✅ [ImportService] Cassette import completed. Processed: ${processedCount}/${cassettes.length}`);
    console.log(`📊 [ImportService] Successful: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);

    return results;
  }

  async importFromCSV(file: Express.Multer.File, userId: string): Promise<ImportResult> {
    try {
      // Validate file type by extension
      const validExtensions = ['.csv'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        throw new BadRequestException('Invalid file type. Please upload CSV file (.csv)');
      }

      // Validate MIME type (more secure than extension alone)
      const validMimeTypes = [
        'text/csv',
        'application/csv',
        'text/plain', // Some systems report CSV as text/plain
        'application/vnd.ms-excel', // Excel CSV variant
      ];
      
      if (file.mimetype && !validMimeTypes.includes(file.mimetype.toLowerCase())) {
        throw new BadRequestException(
          `Invalid file MIME type: ${file.mimetype}. Expected CSV file (text/csv or application/csv)`
        );
      }

      // Parse CSV file
      const csvContent = file.buffer.toString('utf-8');
      console.log(`🔵 [ImportService] CSV file size: ${file.size} bytes, content length: ${csvContent.length} characters`);
      
      // Count lines manually to verify
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
      console.log(`🔵 [ImportService] Total lines in CSV (excluding empty): ${lines.length}`);
      console.log(`🔵 [ImportService] First line (header): ${lines[0]?.substring(0, 100)}...`);
      console.log(`🔵 [ImportService] Last line: ${lines[lines.length - 1]?.substring(0, 100)}...`);
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Allow inconsistent column counts
        relax_quotes: true, // Allow quotes in unquoted fields
        skip_records_with_error: false, // Don't skip records with errors, throw instead
      }) as MachineCassetteVendorData[];

      console.log(`🔵 [ImportService] Parsed ${records.length} records from CSV file`);
      console.log(`🔵 [ImportService] Expected records (lines - 1 header): ${lines.length - 1}`);
      
      if (records.length !== lines.length - 1) {
        console.warn(`⚠️ [ImportService] WARNING: Parsed records (${records.length}) don't match expected lines (${lines.length - 1})`);
        console.warn(`⚠️ [ImportService] Difference: ${Math.abs(records.length - (lines.length - 1))} records`);
      }

      if (records.length === 0) {
        throw new BadRequestException('CSV file is empty or has no valid data');
      }

      // Validate required columns
      const firstRecord = records[0];
      const requiredColumns = ['machine_serial_number', 'cassette_serial_number', 'bank_code', 'pengelola_code'];
      const missingColumns = requiredColumns.filter(col => !(col in firstRecord));
      
      if (missingColumns.length > 0) {
        throw new BadRequestException(
          `CSV file is missing required columns: ${missingColumns.join(', ')}`
        );
      }

      console.log(`🔵 [ImportService] Starting CSV import. Total records: ${records.length}`);
      
      // Process records
      const machineResults: Array<{ success: boolean; serialNumber?: string; error?: string }> = [];
      const cassetteResults: Array<{ success: boolean; serialNumber?: string; error?: string }> = [];
      const vendorAssignmentResults: Array<{ success: boolean; pengelolaCode?: string; bankCode?: string; error?: string }> = [];
      
      // Track unique machines to avoid duplicate processing
      // Use Map to store machine serial number -> machine ID for cassette linking
      const processedMachines = new Map<string, string>();
      // Track cassette count per machine for usageType assignment (first 5 = MAIN, next 5 = BACKUP)
      const machineCassetteCounts = new Map<string, number>();
      // Track bank-pengelola pairs that have already been assigned to avoid duplicate assignments
      const processedAssignments = new Set<string>(); // Format: "bankId:pengelolaId"

      let processedCount = 0;
      const logInterval = 1000; // Log every 1000 records

      console.log(`🔵 [ImportService] Starting to process ${records.length} records...`);

      for (const record of records) {
        processedCount++;
        
        // Log progress every N records
        if (processedCount % logInterval === 0) {
          console.log(`🔄 [ImportService] Processing record ${processedCount}/${records.length}...`);
        }
        const machineSN = record.machine_serial_number?.trim();
        const cassetteSN = record.cassette_serial_number?.trim();
        const bankCode = record.bank_code?.trim();
        const pengelolaCode = record.pengelola_code?.trim();

        // Only cassette and bank are required. Machine and Pengelola are optional
        if (!cassetteSN || !bankCode) {
          console.warn(`⚠️ [ImportService] Record ${processedCount} has missing required fields - Cassette: ${cassetteSN || 'N/A'}, Bank: ${bankCode || 'N/A'}`);
          cassetteResults.push({
            success: false,
            serialNumber: cassetteSN || 'N/A',
            error: 'Missing required fields (cassette or bank)',
          });
          if (machineSN) {
            machineResults.push({
              success: false,
              serialNumber: machineSN,
              error: 'Missing required fields (cassette or bank)',
            });
          }
          continue; // Skip this record but continue processing
        }

        // If machine SN is missing, we'll still process the cassette (cassette can exist without machine)
        if (!machineSN) {
          console.log(`ℹ️ [ImportService] Record ${processedCount}: No machine SN, processing cassette only - Cassette: ${cassetteSN}`);
        }

        try {
          // Get or create bank
          const bank = await this.prisma.customerBank.findUnique({
            where: { bankCode },
          });

          if (!bank) {
            throw new BadRequestException(`Bank with code ${bankCode} not found. Please create the bank first.`);
          }

          // Get Pengelola (optional - can be assigned manually later)
          let Pengelola: { id: string } | null = null;
          if (pengelolaCode) {
            const foundPengelola = await this.prisma.pengelola.findUnique({
              where: { pengelolaCode },
            });

            if (!foundPengelola) {
              console.warn(`⚠️ [ImportService] Pengelola ${pengelolaCode} not found. Skipping pengelola assignment. You can assign manually later.`);
              // Don't throw error, just skip pengelola assignment
            } else {
              Pengelola = foundPengelola;
            }
          }

          // Auto-detect cassette type from serial number
          let cassetteTypeCode = this.extractCassetteTypeFromSN(cassetteSN);
          
          if (!cassetteTypeCode) {
            // Default to RB if cannot detect
            cassetteTypeCode = 'RB';
            console.warn(`⚠️ Could not detect cassette type from SN: ${cassetteSN}, defaulting to RB`);
          } else {
            // Log successful detection (only for first few records to avoid spam)
            if (processedCount <= 10) {
              console.log(`✅ Auto-detected cassette type "${cassetteTypeCode}" from SN: ${cassetteSN}`);
            }
          }

          const cassetteType = await this.prisma.cassetteType.findUnique({
            where: { typeCode: cassetteTypeCode as any },
          });

          if (!cassetteType) {
            throw new BadRequestException(`Cassette type ${cassetteTypeCode} not found`);
          }

          // Create or update machine (only if machine SN exists and only once per unique machine SN)
          let machineId: string | null = null;
          if (machineSN && !processedMachines.has(machineSN)) {
            try {
              // Check if machine exists by serial number
              const existingMachine = await this.prisma.machine.findFirst({
                where: { serialNumberManufacturer: machineSN },
              });

              if (existingMachine) {
                machineId = existingMachine.id;
                // Update existing machine Pengelola assignment (only if pengelola provided)
                if (Pengelola) {
                  await this.prisma.machine.update({
                    where: { id: existingMachine.id },
                    data: { pengelolaId: Pengelola.id },
                  });
                }
                machineResults.push({
                  success: true,
                  serialNumber: machineSN,
                });
              } else {
                // Create new machine (minimal required fields)
                // Note: Some fields are required but we'll use defaults
                const machineCode = `M-${bankCode}-${machineSN.slice(-6)}`;
                const machineData: any = {
                  customerBankId: bank.id,
                  machineCode,
                  modelName: 'SR7500VS', // Default model (options: SR7500 or SR7500VS)
                  serialNumberManufacturer: machineSN,
                  physicalLocation: `Bank ${bank.bankName}`,
                  status: 'OPERATIONAL',
                };
                // pengelolaId is now optional - can be assigned manually later
                if (Pengelola?.id) {
                  machineData.pengelolaId = Pengelola.id;
                }
                const newMachine = await this.prisma.machine.create({
                  data: machineData as any, // Type assertion needed due to Prisma client type mismatch
                });
                machineId = newMachine.id;
                machineResults.push({
                  success: true,
                  serialNumber: machineSN,
                });
              }
              processedMachines.set(machineSN, machineId); // Store machine ID for cassette linking
            } catch (error: any) {
              machineResults.push({
                success: false,
                serialNumber: machineSN,
                error: error.message,
              });
              processedMachines.set(machineSN, ''); // Mark as processed even if failed to avoid retry
            }
          } else if (machineSN && processedMachines.has(machineSN)) {
            // Machine already processed, get its ID
            machineId = processedMachines.get(machineSN) || null;
          }

          // Create or update cassette
          try {
            // Determine usageType based on position in Excel (first 5 = MAIN, next 5 = BACKUP)
            let usageType: 'MAIN' | 'BACKUP' | undefined = undefined;
            if (machineSN && machineId) {
              const currentCount = machineCassetteCounts.get(machineSN) || 0;
              usageType = currentCount < 5 ? 'MAIN' : 'BACKUP';
              machineCassetteCounts.set(machineSN, currentCount + 1);
            }

            const cassetteData: any = {
              serialNumber: cassetteSN,
              cassetteTypeId: cassetteType.id,
              customerBankId: bank.id,
              status: 'OK',
              ...(usageType && { usageType }),
            };
            
            // Link cassette to machine if machine exists
            if (machineId) {
              cassetteData.machineId = machineId;
            }

            const updateData: any = {
              cassetteTypeId: cassetteType.id,
              customerBankId: bank.id,
              status: 'OK',
            };
            if (machineId) {
              updateData.machineId = machineId;
            }
            if (usageType) {
              updateData.usageType = usageType;
            }

            await this.prisma.cassette.upsert({
              where: { serialNumber: cassetteSN },
              update: updateData,
              create: cassetteData,
            });
            cassetteResults.push({
              success: true,
              serialNumber: cassetteSN,
            });
          } catch (error: any) {
            cassetteResults.push({
              success: false,
              serialNumber: cassetteSN,
              error: error.message,
            });
          }

          // Create or update Pengelola-bank assignment (only if pengelola provided and not already processed)
          if (Pengelola) {
            const assignmentKey = `${bank.id}:${Pengelola.id}`;
            if (!processedAssignments.has(assignmentKey)) {
              try {
                await this.prisma.bankPengelolaAssignment.upsert({
                  where: {
                    customerBankId_pengelolaId: {
                      customerBankId: bank.id,
                      pengelolaId: Pengelola.id,
                    },
                  },
                  update: {
                    status: 'ACTIVE',
                  },
                  create: {
                    customerBankId: bank.id,
                    pengelolaId: Pengelola.id,
                    status: 'ACTIVE',
                  },
                });
                processedAssignments.add(assignmentKey); // Mark as processed
                vendorAssignmentResults.push({
                  success: true,
                  pengelolaCode,
                  bankCode,
                });
              } catch (error: any) {
                vendorAssignmentResults.push({
                  success: false,
                  pengelolaCode,
                  bankCode,
                  error: error.message,
                });
              }
            } else {
              // Already processed, skip silently (assignment already exists)
              vendorAssignmentResults.push({
                success: true,
                pengelolaCode,
                bankCode,
              });
            }
          } else {
            console.log(`ℹ️ [ImportService] Pengelola not provided for bank ${bankCode}. Assignment can be done manually later.`);
          }
        } catch (error: any) {
          console.error(`❌ [ImportService] Error processing record ${processedCount}:`, error.message);
          if (machineSN) {
            machineResults.push({
              success: false,
              serialNumber: machineSN,
              error: error.message,
            });
          }
          cassetteResults.push({
            success: false,
            serialNumber: cassetteSN,
            error: error.message,
          });
        }
      }

      console.log(`✅ [ImportService] CSV import completed. Processed: ${processedCount}/${records.length}`);
      console.log(`📊 [ImportService] Results Summary:`);
      console.log(`   - Total records processed: ${processedCount}`);
      console.log(`   - Unique machines processed: ${processedMachines.size}`);
      console.log(`   - Machine results: ${machineResults.filter(r => r.success).length} successful, ${machineResults.filter(r => !r.success).length} failed (total: ${machineResults.length})`);
      console.log(`   - Cassette results: ${cassetteResults.filter(r => r.success).length} successful, ${cassetteResults.filter(r => !r.success).length} failed (total: ${cassetteResults.length})`);
      
      if (processedCount !== records.length) {
        console.error(`❌ [ImportService] ERROR: Not all records were processed! Expected: ${records.length}, Processed: ${processedCount}`);
      }
      
      if (cassetteResults.length !== records.length) {
        console.error(`❌ [ImportService] ERROR: Not all cassettes were processed! Expected: ${records.length}, Processed: ${cassetteResults.length}`);
      }

      const result: ImportResult = {
        success: 
          machineResults.filter(r => !r.success).length === 0 &&
          cassetteResults.filter(r => !r.success).length === 0,
        banks: undefined,
        cassettes: {
          total: cassetteResults.length,
          successful: cassetteResults.filter(r => r.success).length,
          failed: cassetteResults.filter(r => !r.success).length,
          results: cassetteResults,
        },
      };

      // Add machine results if needed
      if (machineResults.length > 0) {
        (result as any).machines = {
          total: machineResults.length,
          successful: machineResults.filter(r => r.success).length,
          failed: machineResults.filter(r => !r.success).length,
          results: machineResults,
        };
      }

      // Add Pengelola assignment results if needed
      if (vendorAssignmentResults.length > 0) {
        (result as any).pengelolaAssignments = {
          total: vendorAssignmentResults.length,
          successful: vendorAssignmentResults.filter(r => r.success).length,
          failed: vendorAssignmentResults.filter(r => !r.success).length,
          results: vendorAssignmentResults,
        };
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error parsing CSV file: ${error.message}`);
    }
  }

  async importMachineCassettesFromCSV(
    file: Express.Multer.File,
    userId: string,
    bankCode: string,
    pengelolaCode?: string, // Optional - can be undefined if not provided (will be assigned manually later)
  ): Promise<MachineCassetteImportResult> {
    try {
      // Validate file type
      const validExtensions = ['.csv'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        throw new BadRequestException('Invalid file type. Please upload CSV file (.csv)');
      }

      // Parse CSV file
      let csvContent = file.buffer.toString('utf-8');
      
      // Remove BOM if present (common in Excel exports)
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      
      console.log('🔍 [ImportService] CSV content preview (first 500 chars):', csvContent.substring(0, 500));
      
      // Auto-detect delimiter (comma or semicolon)
      const firstLine = csvContent.split('\n')[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';
      console.log('🔍 [ImportService] Detected delimiter:', delimiter === ';' ? 'semicolon' : 'comma');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        relax_quotes: true,
        bom: true, // Handle BOM automatically
        delimiter: delimiter, // Auto-detected delimiter
      }) as any[];

      console.log('🔍 [ImportService] Parsed records count:', records.length);
      if (records.length > 0) {
        console.log('🔍 [ImportService] First record sample:', JSON.stringify(records[0], null, 2));
      }

      if (records.length === 0) {
        throw new BadRequestException('CSV file is empty or has no valid data. Please check the file format.');
      }

      // Get bank and Pengelola
      const bank = await this.prisma.customerBank.findUnique({
        where: { bankCode },
      });

      if (!bank) {
        throw new BadRequestException(`Bank with code ${bankCode} not found`);
      }

      // Get Pengelola (optional - can be assigned manually later)
      let Pengelola: { id: string } | null = null;
      if (pengelolaCode) {
        const foundPengelola = await this.prisma.pengelola.findUnique({
          where: { pengelolaCode },
        });

        if (!foundPengelola) {
          console.warn(`⚠️ [ImportService] Pengelola ${pengelolaCode} not found. Skipping pengelola assignment. You can assign manually later.`);
          // Don't throw error, just skip pengelola assignment
        } else {
          Pengelola = foundPengelola;
        }
      }

      // Parse records into machine-cassette structure
      // Format dari file user: SN Mesin, Attribute, SN Cassete
      // Tapi kita gabungkan semua kaset (tidak perlu bedakan utama/cadangan)
      // SN Mesin bisa kosong di baris berikutnya (menggunakan yang sebelumnya)
      const machines: MachineCassetteData[] = [];
      
      // Get all keys and filter out empty column names
      const allKeys = Object.keys(records[0] || {}).filter(key => {
        const trimmed = key.trim();
        return trimmed.length > 0 && trimmed !== 'undefined';
      });

      const normalizeKey = (key: string) =>
        key.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      
      // Log available columns for debugging
      console.log('🔍 [ImportService] Available CSV columns (filtered):', allKeys);
      console.log('🔍 [ImportService] All raw keys:', Object.keys(records[0] || {}));
      
      // Find columns: SN Mesin, Attribute (optional)
      const machineSNKey = allKeys.find(key => {
        const trimmed = key.trim();
        const lower = normalizeKey(trimmed);
        const originalLower = trimmed.toLowerCase();
        return (
          originalLower.includes('mesin') ||
          originalLower.includes('machine') ||
          lower.includes('mesin') ||
          lower.includes('machine') ||
          lower === 'sn_mesin' ||
          lower === 'machine_serial_number' ||
          lower === 'snmesin' ||
          lower === 'machinesn'
        );
      });

      const attributeKey = allKeys.find(key => {
        const trimmed = key.trim();
        const lower = normalizeKey(trimmed);
        const originalLower = trimmed.toLowerCase();
        return (
          originalLower.includes('attribute') ||
          lower.includes('attribute') ||
          originalLower === 'atribut' ||
          lower === 'atribut'
        );
      });

      // Find cassette columns - bisa "SN Cassete", "SN Kaset", "SN Kaset Cadangan", atau variasi lainnya
      const cassetteSNKeys = allKeys
        .filter(key => {
          const trimmed = key.trim();
          const lower = normalizeKey(trimmed);
          const originalLower = trimmed.toLowerCase();
          // Cari kolom yang mengandung "cassete", "cassette", atau "kaset"
          return (
            originalLower.includes('cassete') ||
            originalLower.includes('cassette') ||
            originalLower.includes('kaset') ||
            lower.includes('cassete') ||
            lower.includes('cassette') ||
            lower.includes('kaset') ||
            lower === 'sn_cassete' ||
            lower === 'sn_cassette' ||
            lower === 'sn_kaset' ||
            lower === 'cassette_serial_number' ||
            lower === 'sncassete' ||
            lower === 'sncassette' ||
            lower === 'snkaset'
          );
        })
        // Urutkan supaya kolom utama (SN Kaset) diproses sebelum kolom cadangan (SN Kaset Cadangan)
        .sort((a, b) => {
          const na = normalizeKey(a);
          const nb = normalizeKey(b);
          const aIsBackup = na.includes('cadangan');
          const bIsBackup = nb.includes('cadangan');
          if (aIsBackup === bIsBackup) return 0;
          return aIsBackup ? 1 : -1; // kolom tanpa "cadangan" dulu
        });

      console.log('🔍 [ImportService] Detected columns:', {
        machineSNKey,
        attributeKey,
        cassetteSNKeys,
      });

      if (!machineSNKey) {
        throw new BadRequestException(
          `CSV file must have a column for machine serial number (SN Mesin). ` +
          `Found columns: ${allKeys.join(', ')}`
        );
      }

      if (cassetteSNKeys.length === 0) {
        throw new BadRequestException(
          `CSV file must have at least one column for cassette serial number (SN Cassete/SN Kaset). ` +
          `Found columns: ${allKeys.join(', ')}`
        );
      }

      // Deteksi format: dengan atau tanpa Attribute
      const hasAttributeColumn = !!attributeKey;
      console.log('🔍 [ImportService] Format detected:', hasAttributeColumn ? 'With Attribute column' : 'Simple format (SN Mesin, SN Kaset)');

      // Group records by machine serial number
      // Format umum:
      //  - SN Mesin, Attribute (optional), SN Cassete/SN Kaset
      //  - atau SN Mesin, SN Kaset, SN Kaset Cadangan (2 kolom kaset per baris)
      // 1 mesin = 10 kaset (semua digabungkan, tidak perlu bedakan utama/cadangan di file)
      const machineGroups = new Map<string, string[]>(); // Array of all cassettes (gabungan)
      let processedRows = 0;
      let skippedRows = 0;
      let currentMachineSN = ''; // Track current machine SN (untuk baris dengan SN Mesin kosong)

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        // Get machine SN
        let machineSN = '';
        if (machineSNKey) {
          const machineValue = record[machineSNKey];
          if (machineValue !== undefined && machineValue !== null) {
            const trimmed = String(machineValue).trim();
            if (trimmed.length > 0) {
              machineSN = trimmed;
            }
          }
        }
        
        // Get cassette SN first (before checking Attribute)
        // Bisa ada lebih dari 1 kolom kaset per baris (mis. SN Kaset + SN Kaset Cadangan)
        const cassetteSNs: string[] = [];
        for (const key of cassetteSNKeys) {
          const cassetteValue = record[key];
          if (cassetteValue !== undefined && cassetteValue !== null) {
            const trimmed = String(cassetteValue).trim();
            if (trimmed.length > 0) {
              cassetteSNs.push(trimmed);
            }
          }
        }
        
        // Jika ada kolom Attribute, cek apakah ini baris header grup (Attribute = "Column1")
        // Format 1: SN Mesin, Attribute, SN Cassete
        //   - Baris dengan Attribute = "Column1" hanyalah penanda grup
        //   - Kolom ketiga biasanya berisi nomor urut (1, 2, ...) sehingga TIDAK boleh dianggap SN kaset
        if (hasAttributeColumn && attributeKey) {
          let attribute = '';
          if (record[attributeKey] !== undefined && record[attributeKey] !== null) {
            attribute = String(record[attributeKey]).trim();
          }

          const attributeLower = attribute.toLowerCase();
          if (attributeLower.includes('column1')) {
            // Header grup:
            // - Jika SN Mesin diisi, gunakan sebagai currentMachineSN untuk baris-baris berikutnya
            // - Jangan menambahkan kaset dari baris ini (abaikan nilai di kolom kaset)
            if (machineSN) {
              currentMachineSN = machineSN;
            }
            skippedRows++;
            continue;
          }
          // Jika Attribute bukan "Column1", baris ini mengandung data kaset biasa
        }
        
        // Jika SN Mesin kosong, gunakan SN Mesin dari baris sebelumnya
        if (!machineSN && currentMachineSN) {
          machineSN = currentMachineSN;
        } else if (machineSN) {
          currentMachineSN = machineSN; // Update current machine SN
        }
        
        // Skip jika tidak ada machine SN atau cassette SN
        if (!machineSN) {
          skippedRows++;
          continue; // Skip rows without machine SN
        }
        
        if (cassetteSNs.length === 0) {
          skippedRows++;
          continue; // Skip rows without cassette SN
        }

        // Initialize if not exists
        if (!machineGroups.has(machineSN)) {
          machineGroups.set(machineSN, []);
        }

        const cassettes = machineGroups.get(machineSN)!;

        // Tambahkan semua kaset dari baris ini (bisa 1 atau 2 SN kaset per baris)
        for (const cassetteSN of cassetteSNs) {
          // Cek duplikasi - jangan tambahkan jika SN Kaset sudah ada
          if (!cassettes.includes(cassetteSN)) {
            cassettes.push(cassetteSN);
            processedRows++;
          } else {
            // Duplikasi ditemukan, log warning
            console.warn(`⚠️ [ImportService] Duplicate cassette SN found: ${cassetteSN} for machine ${machineSN}`);
            skippedRows++;
          }
        }
        
        // Log progress setiap 1000 rows
        if (processedRows % 1000 === 0) {
          console.log(`🔄 [ImportService] Processed ${processedRows} cassettes, ${machineGroups.size} machines so far...`);
        }
      }

      // Log detailed statistics
      const totalCassettes = Array.from(machineGroups.values()).reduce((sum, cassettes) => sum + cassettes.length, 0);
      const machinesWithLessThan10 = Array.from(machineGroups.entries()).filter(([_, cassettes]) => cassettes.length < 10);
      const machinesWithMoreThan10 = Array.from(machineGroups.entries()).filter(([_, cassettes]) => cassettes.length > 10);
      
      console.log('🔍 [ImportService] Parsed data:', {
        totalRecords: records.length,
        processedRows,
        skippedRows,
        uniqueMachines: machineGroups.size,
        totalCassettes,
        expectedCassettes: machineGroups.size * 10,
        machinesWithLessThan10: machinesWithLessThan10.length,
        machinesWithMoreThan10: machinesWithMoreThan10.length,
      });
      
      // Log warning jika ada mesin dengan jumlah kaset tidak sesuai
      if (machinesWithLessThan10.length > 0) {
        console.warn('⚠️ [ImportService] Machines with less than 10 cassettes:', 
          machinesWithLessThan10.map(([sn, cassettes]) => `${sn}: ${cassettes.length}`).slice(0, 10)
        );
      }
      if (machinesWithMoreThan10.length > 0) {
        console.warn('⚠️ [ImportService] Machines with more than 10 cassettes:', 
          machinesWithMoreThan10.map(([sn, cassettes]) => `${sn}: ${cassettes.length}`).slice(0, 10)
        );
      }

      // Convert grouped data to machine-cassette structure
      // Semua kaset digabungkan (tidak perlu bedakan utama/cadangan)
      // Untuk kompatibilitas dengan struktur yang ada, kita bagi menjadi 5 utama + 5 cadangan
      // (5 pertama = utama, 5 berikutnya = cadangan)
      // Pastikan setiap mesin hanya punya maksimal 10 kaset
      for (const [machineSN, allCassettes] of machineGroups.entries()) {
        if (allCassettes.length > 0) {
          // Ambil hanya 10 kaset pertama (jika lebih dari 10, ambil 10 pertama)
          // Jika kurang dari 10, ambil semua yang ada
          const limitedCassettes = allCassettes.slice(0, 10);
          
          if (allCassettes.length > 10) {
            console.warn(`⚠️ [ImportService] Machine ${machineSN} has ${allCassettes.length} cassettes, taking first 10 only`);
          }
          
          if (allCassettes.length < 10) {
            console.warn(`⚠️ [ImportService] Machine ${machineSN} has only ${allCassettes.length} cassettes (expected 10)`);
          }
          
          // Bagi menjadi 5 utama + 5 cadangan
          const mainCassettes = limitedCassettes.slice(0, 5);
          const backupCassettes = limitedCassettes.slice(5, 10);
          
          machines.push({
            machineSerialNumber: machineSN,
            mainCassettes: mainCassettes,
            backupCassettes: backupCassettes,
          });
        }
      }

      if (machines.length === 0) {
        const errorDetails = {
          totalRecords: records.length,
          processedRows,
          skippedRows,
          uniqueMachines: machineGroups.size,
          availableColumns: allKeys,
          detectedColumns: {
            machineSNKey,
            attributeKey,
            cassetteSNKeys,
          },
        };
        console.error('❌ [ImportService] No valid machine-cassette data found:', errorDetails);
        throw new BadRequestException(
          `No valid machine-cassette data found in CSV. ` +
          `Total records: ${records.length}, Processed: ${processedRows}, Skipped: ${skippedRows}. ` +
          `Available columns: ${allKeys.join(', ')}. ` +
          `Please check column names match: SN Mesin, SN Kaset, SN Kaset Cadangan`
        );
      }

      // Import machines and cassettes
      const machineResults: Array<{ success: boolean; machineSN?: string; error?: string }> = [];
      const cassetteResults: Array<{ success: boolean; cassetteSN?: string; error?: string }> = [];

      for (const machineData of machines) {
        const { machineSerialNumber, mainCassettes, backupCassettes } = machineData;

        // Create or update machine
        try {
          const machineCode = `M-${bankCode}-${machineSerialNumber.slice(-6)}`;
          const existingMachine = await this.prisma.machine.findFirst({
            where: { serialNumberManufacturer: machineSerialNumber },
          });

          if (existingMachine) {
            await this.prisma.machine.update({
              where: { id: existingMachine.id },
              data: {
                customerBankId: bank.id,
                ...(Pengelola?.id && { pengelolaId: Pengelola.id }), // Only include if Pengelola exists
                machineCode,
                modelName: 'SR7500VS',
                physicalLocation: `Bank ${bank.bankName}`,
                status: 'OPERATIONAL',
              },
            });
          } else {
            const machineData: any = {
              customerBankId: bank.id,
              machineCode,
              modelName: 'SR7500VS',
              serialNumberManufacturer: machineSerialNumber,
              physicalLocation: `Bank ${bank.bankName}`,
              status: 'OPERATIONAL',
            };
            if (Pengelola?.id) {
              machineData.pengelolaId = Pengelola.id;
            }
            await this.prisma.machine.create({
              data: machineData,
            });
          }

          machineResults.push({ success: true, machineSN: machineSerialNumber });
        } catch (error: any) {
          machineResults.push({ success: false, machineSN: machineSerialNumber, error: error.message });
        }

        // Import main cassettes (Kaset Utama)
        // Pastikan setiap kaset utama terhubung dengan mesin yang benar
        for (const cassetteSN of mainCassettes) {
          try {
            const cassetteTypeCode = this.extractCassetteTypeFromSN(cassetteSN);
            if (!cassetteTypeCode) {
              throw new BadRequestException(`Could not detect cassette type from SN: ${cassetteSN}`);
            }

            const cassetteType = await this.prisma.cassetteType.findUnique({
              where: { typeCode: cassetteTypeCode as any },
            });

            if (!cassetteType) {
              throw new BadRequestException(`Cassette type ${cassetteTypeCode} not found`);
            }

            // Pastikan notes menunjukkan mesin yang benar untuk menghindari tertukar
            await this.prisma.cassette.upsert({
              where: { serialNumber: cassetteSN },
              update: {
                cassetteTypeId: cassetteType.id,
                customerBankId: bank.id,
                status: 'OK',
                notes: `Kaset Utama untuk Mesin ${machineSerialNumber} (SN: ${machineSerialNumber})`,
              },
              create: {
                serialNumber: cassetteSN,
                cassetteTypeId: cassetteType.id,
                customerBankId: bank.id,
                status: 'OK',
                notes: `Kaset Utama untuk Mesin ${machineSerialNumber} (SN: ${machineSerialNumber})`,
              },
            });

            cassetteResults.push({ success: true, cassetteSN });
          } catch (error: any) {
            cassetteResults.push({ 
              success: false, 
              cassetteSN, 
              error: `Kaset ${cassetteSN} untuk mesin ${machineSerialNumber}: ${error.message}` 
            });
          }
        }

        // Import backup cassettes (Kaset Cadangan)
        // Pastikan setiap kaset cadangan terhubung dengan mesin yang benar
        for (const cassetteSN of backupCassettes) {
          try {
            const cassetteTypeCode = this.extractCassetteTypeFromSN(cassetteSN);
            if (!cassetteTypeCode) {
              throw new BadRequestException(`Could not detect cassette type from SN: ${cassetteSN}`);
            }

            const cassetteType = await this.prisma.cassetteType.findUnique({
              where: { typeCode: cassetteTypeCode as any },
            });

            if (!cassetteType) {
              throw new BadRequestException(`Cassette type ${cassetteTypeCode} not found`);
            }

            // Pastikan notes menunjukkan mesin yang benar untuk menghindari tertukar
            await this.prisma.cassette.upsert({
              where: { serialNumber: cassetteSN },
              update: {
                cassetteTypeId: cassetteType.id,
                customerBankId: bank.id,
                status: 'OK',
                notes: `Kaset Cadangan untuk Mesin ${machineSerialNumber} (SN: ${machineSerialNumber})`,
              },
              create: {
                serialNumber: cassetteSN,
                cassetteTypeId: cassetteType.id,
                customerBankId: bank.id,
                status: 'OK',
                notes: `Kaset Cadangan untuk Mesin ${machineSerialNumber} (SN: ${machineSerialNumber})`,
              },
            });

            cassetteResults.push({ success: true, cassetteSN });
          } catch (error: any) {
            cassetteResults.push({ 
              success: false, 
              cassetteSN, 
              error: `Kaset ${cassetteSN} untuk mesin ${machineSerialNumber}: ${error.message}` 
            });
          }
        }
      }

      return {
        success: machineResults.filter(r => !r.success).length === 0 && 
                 cassetteResults.filter(r => !r.success).length === 0,
        machines: {
          total: machineResults.length,
          successful: machineResults.filter(r => r.success).length,
          failed: machineResults.filter(r => !r.success).length,
          results: machineResults,
        },
        cassettes: {
          total: cassetteResults.length,
          successful: cassetteResults.filter(r => r.success).length,
          failed: cassetteResults.filter(r => !r.success).length,
          results: cassetteResults,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error parsing CSV file: ${error.message}`);
    }
  }

  generateCSVTemplate(): string {
    // CSV header
    const header = 'machine_serial_number,cassette_serial_number,bank_code,pengelola_code';
    
    // Example data rows
    const examples = [
      'HTCH-SRM100-2023-0001,RB-BNI-0001,BNI,VND-TAG-001',
      'HTCH-SRM100-2023-0002,RB-BNI-0002,BNI,VND-TAG-001',
      'HTCH-SRM100-2023-0003,RB-BNI-0003,BNI,VND-ADV-001',
      'HTCH-SRM100-2023-0004,AB-BNI-0001,BNI,VND-TAG-001',
      'HTCH-SRM100-2023-0005,RB-BNI-0004,BNI,VND-ADV-001',
    ];

    return [header, ...examples].join('\n');
  }

  generateMachineCassetteCSVTemplate(): string {
    // CSV header untuk format sederhana sesuai contoh Excel:
    // Setiap baris berisi 1 mesin + 2 kaset (utama & cadangan)
    // 1 mesin = 5 baris (5 kaset utama + 5 kaset cadangan)
    const header = 'SN Mesin,SN Kaset,SN Kaset Cadangan';

    // Contoh data:
    // - Machine 1: 5 baris, setiap baris berisi sepasang kaset (utama + cadangan)
    // - Machine 2: 5 baris berikutnya dengan SN Mesin berbeda
    const examples = [
      // Machine 1 - 5 pasang kaset (total 10 kaset)
      '74UEA43N03-069520,76UWAB2SW754319,76UWAB2SW751779',
      '74UEA43N03-069520,76UWRB2SB894550,76UWRB2SB885798',
      '74UEA43N03-069520,76UWRB2SB894551,76UWRB2SB885799',
      '74UEA43N03-069520,76UWRB2SB894516,76UWRB2SB885817',
      '74UEA43N03-069520,76UWRB2SB894546,76UWRB2SB885807',
      // Machine 2 - 5 pasang kaset (total 10 kaset)
      '74UEA43N03-069533,76UWAB2SW754073,76UWAB2SW751808',
      '74UEA43N03-069533,76UWRB2SB893983,76UWRB2SB885763',
      '74UEA43N03-069533,76UWRB2SB893957,76UWRB2SB885693',
      '74UEA43N03-069533,76UWRB2SB893935,76UWRB2SB885757',
      '74UEA43N03-069533,76UWRB2SB893916,76UWRB2SB885758',
    ];

    return [header, ...examples].join('\n');
  }

  generateExcelTemplate(): Buffer {
    const workbook = XLSX.utils.book_new();

    // Machine-Cassette-Pengelola sheet (untuk bulk import mesin, kaset, dan pengelola assignments)
    // Note: pengelola_code is optional - can be assigned manually later via assignment menu
    const machineCassetteData = [
      // Header row
      ['machine_serial_number', 'cassette_serial_number', 'bank_code', 'pengelola_code'],
      // Example rows (pengelola_code is optional - leave empty to assign manually later)
      ['HTCH-SRM100-2023-0001', 'RB-BNI-0001', 'BNI', 'VND-TAG-001'],
      ['HTCH-SRM100-2023-0002', 'RB-BNI-0002', 'BNI', 'VND-TAG-001'],
      ['HTCH-SRM100-2023-0003', 'RB-BNI-0003', 'BNI', ''], // Empty pengelola_code - can assign manually
      ['HTCH-SRM100-2023-0004', 'AB-BNI-0001', 'BNI', 'VND-ADV-001'],
      ['HTCH-SRM100-2023-0005', 'RB-BNI-0004', 'BNI', ''], // Empty pengelola_code - can assign manually
    ];
    const machineCassetteSheet = XLSX.utils.aoa_to_sheet(machineCassetteData);
    XLSX.utils.book_append_sheet(workbook, machineCassetteSheet, 'Machine-Cassette');

    // Banks sheet (optional - untuk import banks)
    const banksData = [
      // Header row - hanya field yang ada di schema
      ['BankCode', 'BankName', 'ContactPerson', 'ContactPhone', 'ContactEmail'],
      // Example rows
      ['BNI001', 'PT Bank Negara Indonesia', 'John Doe', '021-12345678', 'contact@bni.co.id'],
      ['BNI002', 'PT Bank Negara Indonesia', 'Jane Smith', '031-87654321', 'sby@bni.co.id'],
    ];
    const banksSheet = XLSX.utils.aoa_to_sheet(banksData);
    XLSX.utils.book_append_sheet(workbook, banksSheet, 'Banks');

    // Cassettes sheet (optional - untuk import cassettes saja)
    const cassettesData = [
      // Header row
      ['SerialNumber', 'CassetteTypeCode', 'CustomerBankCode', 'Status', 'UsageType', 'Notes'],
      // Example rows
      ['RB-BNI-0001', 'RB', 'BNI001', 'OK', 'MAIN', 'Main cassette'],
      ['RB-BNI-0002', 'RB', 'BNI001', 'OK', 'BACKUP', 'Backup cassette'],
      ['AB-BNI-0001', 'AB', 'BNI001', 'OK', 'MAIN', 'AB cassette'],
      ['RB-BNI-0003', 'RB', 'BNI002', 'OK', 'MAIN', 'Surabaya cassette'],
    ];
    const cassettesSheet = XLSX.utils.aoa_to_sheet(cassettesData);
    XLSX.utils.book_append_sheet(workbook, cassettesSheet, 'Cassettes');

    // Generate buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

