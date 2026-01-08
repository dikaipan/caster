# 🚀 Panduan Menambahkan Fitur Baru - HCM System

**Date**: 18 Desember 2025  
**Version**: 1.0

---

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Langkah-Langkah Menambahkan Fitur](#langkah-langkah-menambahkan-fitur)
3. [Contoh: Menambahkan Fitur "Notifications"](#contoh-menambahkan-fitur-notifications)
4. [Best Practices](#best-practices)
5. [Checklist](#checklist)

---

## 🎯 Overview

Aplikasi HCM menggunakan **NestJS** (Backend) dan **Next.js** (Frontend) dengan arsitektur modular. Setiap fitur baru harus mengikuti pola yang sudah ada untuk konsistensi dan maintainability.

### Struktur Modul (NestJS)

Setiap fitur baru terdiri dari:
- **Module** (`*.module.ts`) - Dependency injection & module configuration
- **Controller** (`*.controller.ts`) - HTTP endpoints & routing
- **Service** (`*.service.ts`) - Business logic
- **DTO** (`dto/*.dto.ts`) - Data validation & transfer objects
- **Entity** (Prisma Schema) - Database model (jika perlu)

---

## 📝 Langkah-Langkah Menambahkan Fitur

### **Step 1: Planning & Design** 📐

1. **Tentukan Scope Fitur**
   - Apa yang ingin dicapai?
   - Endpoint apa yang dibutuhkan?
   - Database schema apa yang diperlukan?
   - Siapa yang bisa mengakses (RBAC)?

2. **Desain Database Schema** (jika perlu)
   - Tentukan tabel/model yang diperlukan
   - Tentukan relasi dengan model existing
   - Tentukan indexes untuk performa

3. **Desain API Endpoints**
   - RESTful endpoints (GET, POST, PUT, DELETE, PATCH)
   - Request/Response format
   - Authentication & Authorization requirements

---

### **Step 2: Database Schema** 🗄️

Jika fitur memerlukan tabel baru atau modifikasi schema:

**File**: `backend/prisma/schema.prisma`

```prisma
// Contoh: Menambahkan model Notifications
model Notification {
  id          String   @id @default(uuid()) @db.Char(36)
  userId      String   @map("user_id") @db.Char(36)
  title       String   @db.VarChar(255)
  message     String   @db.Text
  type        String   @db.VarChar(50) // INFO, WARNING, ERROR, SUCCESS
  isRead      Boolean  @default(false) @map("is_read")
  createdAt   DateTime @default(now()) @map("created_at")
  readAt      DateTime? @map("read_at")
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
  @@map("notifications")
}
```

**Langkah**:
1. Edit `backend/prisma/schema.prisma`
2. Generate migration: `npx prisma migrate dev --name add_notifications`
3. Generate Prisma client: `npx prisma generate`

---

### **Step 3: Backend - Create Module** 🔧

#### **3.1. Create Folder Structure**

```bash
backend/src/
└── notifications/              # Nama modul baru
    ├── notifications.module.ts
    ├── notifications.controller.ts
    ├── notifications.service.ts
    └── dto/
        ├── create-notification.dto.ts
        ├── update-notification.dto.ts
        └── index.ts
```

#### **3.2. Create Service** (`notifications.service.ts`)

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateNotificationDto, userId: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        title: createDto.title,
        message: createDto.message,
        type: createDto.type || 'INFO',
      },
    });
  }

  async findAll(userId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.findOne(id, userId);
    
    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId); // Verify ownership
    
    return this.prisma.notification.delete({
      where: { id },
    });
  }
}
```

#### **3.3. Create DTOs** (`dto/create-notification.dto.ts`)

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

export class CreateNotificationDto {
  @ApiProperty({ example: 'New Repair Ticket' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A new repair ticket has been assigned to you' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.INFO })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;
}
```

**File**: `dto/index.ts`
```typescript
export * from './create-notification.dto';
export * from './update-notification.dto';
```

#### **3.4. Create Controller** (`notifications.controller.ts`)

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, AllowUserTypes, UserType } from '../common/decorators/roles.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@AllowUserTypes(UserType.HITACHI, UserType.PENGELOLA) // Sesuaikan dengan kebutuhan
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @Roles('SUPER_ADMIN') // Hanya admin yang bisa create
  create(@Body() createDto: CreateNotificationDto, @Request() req) {
    return this.notificationsService.create(createDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 1000) : 50;
    return this.notificationsService.findAll(req.user.id, pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.notificationsService.findOne(id, req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  remove(@Param('id') id: string, @Request() req) {
    return this.notificationsService.delete(id, req.user.id);
  }
}
```

#### **3.5. Create Module** (`notifications.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // Export jika digunakan modul lain
})
export class NotificationsModule {}
```

#### **3.6. Register Module di AppModule**

**File**: `backend/src/app.module.ts`

```typescript
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // ... existing modules
    NotificationsModule, // ✅ Tambahkan di sini
  ],
  // ...
})
export class AppModule {}
```

---

### **Step 4: Frontend - Create Pages & Components** 🎨

#### **4.1. Create API Client** (jika perlu)

**File**: `frontend/src/lib/api.ts` (atau buat file baru)

```typescript
// Tambahkan ke existing api.ts atau buat notifications.ts
export const notificationsApi = {
  getAll: (page = 1, limit = 50) =>
    api.get('/notifications', { params: { page, limit } }),
  
  getById: (id: string) =>
    api.get(`/notifications/${id}`),
  
  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),
  
  delete: (id: string) =>
    api.delete(`/notifications/${id}`),
};
```

#### **4.2. Create Page** (`frontend/src/app/notifications/page.tsx`)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { notificationsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsApi.getAll();
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      fetchNotifications(); // Refresh
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      
      <div className="space-y-4">
        {notifications.map((notification) => (
          <Card key={notification.id}>
            <CardHeader>
              <CardTitle>{notification.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{notification.message}</p>
              {!notification.isRead && (
                <Button onClick={() => handleMarkAsRead(notification.id)}>
                  Mark as Read
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### **4.3. Add Navigation** (jika perlu)

**File**: `frontend/src/components/layout/Sidebar.tsx`

```typescript
// Tambahkan menu item
{
  name: 'Notifications',
  href: '/notifications',
  icon: BellIcon,
}
```

---

### **Step 5: Testing** ✅

#### **5.1. Test Backend API**

```bash
# Start backend
cd backend
npm run start:dev

# Test endpoints via Swagger
# Buka: http://localhost:3000/api
```

#### **5.2. Test Frontend**

```bash
# Start frontend
cd frontend
npm run dev

# Buka: http://localhost:3001/notifications
```

#### **5.3. Manual Testing Checklist**

- [ ] Create notification (POST)
- [ ] Get all notifications (GET)
- [ ] Get single notification (GET :id)
- [ ] Mark as read (PATCH :id/read)
- [ ] Delete notification (DELETE :id)
- [ ] Authorization (hanya user sendiri yang bisa akses)
- [ ] Pagination bekerja
- [ ] Error handling

---

### **Step 6: Documentation** 📚

1. **Update Swagger** - Otomatis via decorators
2. **Update README** - Jika perlu
3. **Create Feature Doc** - Jika fitur kompleks

---

## 🎯 Contoh: Menambahkan Fitur "Notifications"

### Quick Start

```bash
# 1. Database
cd backend
# Edit prisma/schema.prisma (tambah model Notification)
npx prisma migrate dev --name add_notifications
npx prisma generate

# 2. Backend
# Buat folder: backend/src/notifications/
# Buat file: module, controller, service, dto
# Register di app.module.ts

# 3. Frontend
# Buat: frontend/src/app/notifications/page.tsx
# Update: frontend/src/lib/api.ts
# Update: Sidebar navigation (jika perlu)

# 4. Test
npm run start:dev  # Backend
npm run dev        # Frontend
```

---

## ✅ Best Practices

### 1. **Naming Conventions**
- Module: `kebab-case` (e.g., `notifications`, `repair-tickets`)
- Files: `kebab-case.ts` (e.g., `notifications.service.ts`)
- Classes: `PascalCase` (e.g., `NotificationsService`)
- Variables: `camelCase` (e.g., `notificationId`)

### 2. **Security**
- ✅ Always use `@UseGuards(JwtAuthGuard, RolesGuard)`
- ✅ Validate user ownership (jika data user-specific)
- ✅ Use DTOs untuk validation
- ✅ Sanitize input

### 3. **Error Handling**
```typescript
try {
  // ...
} catch (error) {
  if (error instanceof NotFoundException) {
    throw error; // Re-throw known exceptions
  }
  this.logger.error('Unexpected error:', error);
  throw new InternalServerErrorException('Something went wrong');
}
```

### 4. **Logging**
```typescript
this.logger.log('Creating notification');
this.logger.debug('Notification data:', createDto);
this.logger.error('Failed to create notification:', error);
```

### 5. **Pagination**
- Always implement pagination untuk list endpoints
- Default: page=1, limit=50
- Max limit: 1000

### 6. **Database**
- ✅ Add indexes untuk foreign keys
- ✅ Add indexes untuk frequently queried fields
- ✅ Use transactions untuk multiple operations
- ✅ Soft delete jika perlu (deletedAt)

---

## 📋 Checklist Menambahkan Fitur

### Backend
- [ ] Database schema (Prisma)
- [ ] Migration created & applied
- [ ] Prisma client generated
- [ ] Service created dengan business logic
- [ ] DTOs created dengan validation
- [ ] Controller created dengan endpoints
- [ ] Module created & registered
- [ ] Authentication & Authorization
- [ ] Error handling
- [ ] Logging
- [ ] Swagger documentation

### Frontend
- [ ] API client functions
- [ ] Page/Component created
- [ ] Navigation updated (jika perlu)
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design

### Testing
- [ ] Backend API tested
- [ ] Frontend tested
- [ ] Authorization tested
- [ ] Error cases tested
- [ ] Edge cases tested

### Documentation
- [ ] Code documented
- [ ] Swagger updated
- [ ] README updated (jika perlu)

---

## 🔗 Resources

- **NestJS Docs**: https://docs.nestjs.com/
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Swagger/OpenAPI**: https://swagger.io/

---

## ❓ FAQ

### Q: Bagaimana jika fitur memerlukan modifikasi model existing?
**A**: 
1. Edit `schema.prisma`
2. Create migration: `npx prisma migrate dev --name modify_model_name`
3. Update service yang menggunakan model tersebut

### Q: Bagaimana jika fitur memerlukan scheduled job?
**A**: 
1. Create service dengan `@Cron()` decorator
2. Import `ScheduleModule` di module
3. Contoh: `backend/src/audit/audit-log-cleanup.service.ts`

### Q: Bagaimana jika fitur memerlukan queue/background jobs?
**A**: 
1. Install BullMQ atau Bull
2. Create queue service
3. Contoh: `backend/src/audit/audit-log-queue.service.ts`

### Q: Bagaimana jika fitur memerlukan file upload?
**A**: 
1. Use `@UseInterceptors(FileInterceptor('file'))`
2. Use `multer` untuk file handling
3. Contoh: `backend/src/import/import.controller.ts`

---

**Selamat mengembangkan fitur baru! 🚀**

