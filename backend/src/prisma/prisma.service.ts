import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to connect to database');
      this.logger.error(`Error: ${error.message}`);
      
      // Provide helpful error messages based on error code
      // Check both error.code and error.errorCode (Prisma uses different properties)
      const errorCode = error.code || error.errorCode;
      const errorMessage = error.message || '';
      
      // Show troubleshooting guide for connection errors
      if (errorCode === 'P1001' || 
          errorMessage.includes("Can't reach database server") ||
          errorMessage.includes('localhost:3306') ||
          errorMessage.includes('ECONNREFUSED')) {
        this.logger.error('');
        this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.logger.error('🔧 DATABASE CONNECTION TROUBLESHOOTING');
        this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.logger.error('');
        this.logger.error('MySQL server is not running or not accessible.');
        this.logger.error('');
        this.logger.error('Quick Fix Options:');
        this.logger.error('');
        this.logger.error('1. If using Docker:');
        this.logger.error('   docker compose up -d mysql');
        this.logger.error('');
        this.logger.error('2. If MySQL is installed locally:');
        this.logger.error('   Start-Service MySQL80');
        this.logger.error('   (Run PowerShell as Administrator if needed)');
        this.logger.error('');
        this.logger.error('3. If using XAMPP:');
        this.logger.error('   Start MySQL from XAMPP Control Panel');
        this.logger.error('');
        this.logger.error('4. Install MySQL:');
        this.logger.error('   - Download: https://dev.mysql.com/downloads/installer/');
        this.logger.error('   - Or use XAMPP: https://www.apachefriends.org/');
        this.logger.error('');
        this.logger.error('5. After MySQL is running, create database:');
        this.logger.error('   mysql -u root -p -e "CREATE DATABASE caster;"');
        this.logger.error('');
        this.logger.error('6. Then run migrations:');
        this.logger.error('   npx prisma migrate dev');
        this.logger.error('   npx prisma generate');
        this.logger.error('');
        this.logger.error('For detailed help, see:');
        this.logger.error('   - backend/QUICK_START_DATABASE.md');
        this.logger.error('   - backend/DATABASE_CONNECTION_TROUBLESHOOTING.md');
        this.logger.error('');
        this.logger.error('Or run diagnostic script:');
        this.logger.error('   powershell -ExecutionPolicy Bypass -File scripts/check-database-connection.ps1');
        this.logger.error('');
        this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
      
      // Re-throw the error so the application doesn't start
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production!');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => key[0] !== '_' && key !== 'constructor',
    );

    return Promise.all(
      models.map((modelKey) => {
        return this[modelKey as string].deleteMany();
      }),
    );
  }
}

