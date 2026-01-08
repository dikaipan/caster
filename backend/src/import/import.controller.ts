import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AllowUserTypes, UserType } from '../common/decorators/roles.decorator';
import { BulkImportDto } from './dto/bulk-import.dto';

@ApiTags('import')
@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@AllowUserTypes(UserType.HITACHI)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('bulk')
  @ApiOperation({ 
    summary: 'Bulk import banks and cassettes from JSON (Admin only)',
    description: 'Import multiple banks and cassettes from JSON data'
  })
  @ApiBody({
    description: 'JSON data containing banks and/or cassettes',
    schema: {
      type: 'object',
      properties: {
        banks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              bankCode: { type: 'string' },
              bankName: { type: 'string' },
              branchCode: { type: 'string' },
              city: { type: 'string' },
              province: { type: 'string' },
              address: { type: 'string' },
              contactPerson: { type: 'string' },
              contactPhone: { type: 'string' },
              contactEmail: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['bankCode', 'bankName'],
          },
        },
        cassettes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              serialNumber: { type: 'string' },
              cassetteTypeCode: { type: 'string' },
              customerBankCode: { type: 'string' },
              status: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['serialNumber', 'cassetteTypeCode', 'customerBankCode'],
          },
        },
      },
    },
  })
  async bulkImport(@Body() importData: BulkImportDto, @Request() req) {
    return this.importService.bulkImport(importData as any, req.user.id);
  }

  @Post('excel')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Bulk import banks and cassettes from Excel (Admin only)',
    description: 'Import multiple banks and cassettes from Excel file (.xlsx, .xls)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Excel file containing banks and/or cassettes',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx or .xls) with Banks and Cassettes sheets',
        },
      },
    },
  })
  async importExcel(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new Error('File is required');
    }
    return this.importService.importFromExcel(file, req.user.id);
  }

  @Post('csv')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
  }))
  @ApiOperation({ 
    summary: 'Bulk import machines, cassettes, and Pengelola assignments from CSV (Admin only)',
    description: 'Import machines, cassettes, and Pengelola assignments from CSV file. Format: machine_serial_number,cassette_serial_number,bank_code,pengelola_code'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file with columns: machine_serial_number, cassette_serial_number, bank_code, pengelola_code',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file with machine and cassette serial numbers, bank code, and Pengelola code',
        },
      },
    },
  })
  async importCSV(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new Error('File is required');
    }
    return this.importService.importFromCSV(file, req.user.id);
  }

  @Get('csv/template')
  @ApiOperation({ 
    summary: 'Download CSV import template (Admin only)',
    description: 'Download a template CSV file for bulk import with example data'
  })
  async downloadCSVTemplate(@Res() res: Response) {
    const template = this.importService.generateCSVTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk_import_template.csv"');
    return res.send(template);
  }

  @Post('csv/machine-cassettes')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
  }))
  @ApiOperation({ 
    summary: 'Bulk import machines and cassettes from CSV (Admin only)',
    description: 'Import machines with 10 cassettes (5 main + 5 backup) from CSV file. Format: SN Mesin, SN Kaset Utama 1-5, SN Kaset Cadangan 1-5. Requires bank_code as query parameter. pengelola_code is optional - if not provided, can be assigned manually later.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file with columns: SN Mesin, SN Kaset Utama 1-5, SN Kaset Cadangan 1-5',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file with machine serial number and 10 cassette serial numbers (5 main + 5 backup)',
        },
        bank_code: {
          type: 'string',
          description: 'Bank code (required query parameter)',
        },
        pengelola_code: {
          type: 'string',
          description: 'Pengelola code (optional query parameter - if not provided, can be assigned manually later)',
        },
      },
    },
  })
  async importMachineCassettesCSV(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Query('bank_code') bankCode?: string,
    @Query('pengelola_code') pengelolaCode?: string,
  ) {
    if (!file) {
      throw new Error('File is required');
    }
    
    // bank_code is required, pengelola_code is optional (can be assigned manually later)
    if (!bankCode) {
      throw new BadRequestException('bank_code is required as query parameter');
    }

    return this.importService.importMachineCassettesFromCSV(
      file,
      req.user.id,
      bankCode,
      pengelolaCode, // Optional - can be undefined if not provided
    );
  }

  @Get('csv/machine-cassettes/template')
  @ApiOperation({ 
    summary: 'Download CSV template for machine-cassettes import (Admin only)',
    description: 'Download a template CSV file for machine-cassettes import with example data (1 machine with 10 cassettes)'
  })
  async downloadMachineCassetteCSVTemplate(@Res() res: Response) {
    const template = this.importService.generateMachineCassetteCSVTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="machine_cassettes_import_template.csv"');
    return res.send(template);
  }

  @Get('excel/template')
  @ApiOperation({ 
    summary: 'Download Excel import template (Admin only)',
    description: 'Download a template Excel file for bulk import with example data for Banks and Cassettes sheets'
  })
  async downloadExcelTemplate(@Res() res: Response) {
    const template = this.importService.generateExcelTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk_import_template.xlsx"');
    return res.send(template);
  }
}

