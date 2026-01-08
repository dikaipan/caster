# API Endpoints Documentation
## Hitachi CRM Management System - Integration Guide

**Base URL**: `http://your-server:3000/api`  
**API Documentation (Swagger)**: `http://your-server:3000/api/docs` (Development only)

---

## 🔐 Authentication

### 1. Login
- **Endpoint**: `POST /api/auth/login`
- **Description**: Login untuk mendapatkan access token dan refresh token
- **Auth Required**: No
- **Rate Limit**: 5 attempts per minute
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string",
    "userType": "HITACHI" | "PENGELOLA"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "string",
    "refresh_token": "string",
    "user": {
      "id": "uuid",
      "username": "string",
      "userType": "HITACHI" | "PENGELOLA",
      "role": "string"
    }
  }
  ```

### 2. Get Profile
- **Endpoint**: `GET /api/auth/profile`
- **Description**: Get current user profile
- **Auth Required**: Yes (Bearer Token)

### 3. Refresh Token
- **Endpoint**: `POST /api/auth/refresh`
- **Description**: Refresh access token menggunakan refresh token
- **Auth Required**: No
- **Rate Limit**: 10 attempts per minute
- **Request Body**:
  ```json
  {
    "refresh_token": "string"
  }
  ```

### 4. Logout
- **Endpoint**: `POST /api/auth/logout`
- **Description**: Logout dan revoke refresh token
- **Auth Required**: Yes (Bearer Token)
- **Rate Limit**: 10 attempts per minute
- **Request Body**:
  ```json
  {
    "refresh_token": "string"
  }
  ```

---

## 🏦 Banks & Bank Customers

### Banks Management
- **GET** `/api/banks` - List semua banks
- **GET** `/api/banks/:id` - Detail bank
- **GET** `/api/banks/:id/statistics` - Get bank statistics
- **POST** `/api/banks` - Create bank (SUPER_ADMIN only)
- **PATCH** `/api/banks/:id` - Update bank (SUPER_ADMIN only)
- **DELETE** `/api/banks/:id` - Delete bank (SUPER_ADMIN only)
- **POST** `/api/banks/:id/pengelola/:pengelolaId` - Assign Pengelola to bank (SUPER_ADMIN only)

### Bank Customers Management
- **GET** `/api/bank-customers` - List semua bank customers (dengan pagination, search)
- **GET** `/api/bank-customers/:id` - Detail bank customer
- **GET** `/api/bank-customers/:id/statistics` - Get bank customer statistics
- **POST** `/api/bank-customers` - Create bank customer (SUPER_ADMIN only)
- **PATCH** `/api/bank-customers/:id` - Update bank customer (SUPER_ADMIN only)
- **DELETE** `/api/bank-customers/:id` - Delete bank customer (SUPER_ADMIN only)

---

## 🖥️ Machines (Mesin)

### CRUD Operations
- **GET** `/api/machines` - List semua machines (dengan pagination, search, filter, sort)
  - Query params: `page`, `limit`, `search`, `status`, `sortBy`, `sortOrder`
- **GET** `/api/machines/dashboard/stats` - Dashboard statistics untuk machines
- **GET** `/api/machines/:id` - Detail machine
- **POST** `/api/machines` - Create machine (SUPER_ADMIN only)
- **PATCH** `/api/machines/:id` - Update machine (Hitachi users only)
- **DELETE** `/api/machines/:id` - Delete machine (SUPER_ADMIN only)

### Machine WSID Management
- **PATCH** `/api/machines/:id/wsid` - Update WSID untuk machine (via UpdateMachineDto)

---

## 💿 Cassettes (Kaset)

### CRUD Operations
- **GET** `/api/cassettes` - List semua cassettes (dengan pagination, search, filter, sort)
  - Query params: `page`, `limit`, `keyword`, `serial_number`, `sn_mesin`, `sn_mesin_suffix`, `status`, `sortBy`, `sortOrder`
- **GET** `/api/cassettes/:id` - Detail cassette
- **GET** `/api/cassettes/search` - Search cassette by serial number
  - Query param: `serialNumber` (required)
- **GET** `/api/cassettes/search-by-machine-sn` - Search cassettes by machine serial number
  - Query param: `machineSN` (required)
- **GET** `/api/cassettes/by-machine/:machineId` - Get cassettes untuk specific machine
- **GET** `/api/cassettes/types` - List semua cassette types
- **GET** `/api/cassettes/statistics/:bankId` - Statistics untuk bank
- **POST** `/api/cassettes` - Create cassette (SUPER_ADMIN only)
- **PATCH** `/api/cassettes/:id` - Update cassette (SUPER_ADMIN only)
- **DELETE** `/api/cassettes/:id` - Delete cassette (SUPER_ADMIN only)

### Cassette Operations
- **GET** `/api/cassettes/:id/check-availability` - Check jika cassette available untuk new service order
- **POST** `/api/cassettes/check-availability-batch` - Batch check availability untuk multiple cassettes
  - Request Body: `{ "cassetteIds": ["uuid1", "uuid2", ...] }`
- **PATCH** `/api/cassettes/:id/mark-broken` - Mark cassette as broken (Pengelola only)
- **POST** `/api/cassettes/replace` - Replace cassette dengan new serial number (Hitachi users)

---

## 🎫 Problem Tickets (Service Orders)

### CRUD Operations
- **GET** `/api/tickets` - List semua tickets (dengan pagination, search, filter, sort)
  - Query params: `page`, `limit`, `search`, `status`, `priority`, `sortBy`, `sortOrder`
- **GET** `/api/tickets/:id` - Detail ticket
- **POST** `/api/tickets` - Create single-cassette ticket (Pengelola)
- **POST** `/api/tickets/multi-cassette` - Create multi-cassette ticket (Pengelola)
- **PATCH** `/api/tickets/:id` - Update ticket
- **DELETE** `/api/tickets/:id` - Soft delete ticket (RC_MANAGER, SUPER_ADMIN)

### Ticket Operations
- **POST** `/api/tickets/:id/close` - Close ticket (Hitachi users)
- **GET** `/api/tickets/pending-confirmation` - List tickets pending confirmation (Pengelola)

### Delivery & Return
- **POST** `/api/tickets/:id/delivery` - Create delivery form (Pengelola)
- **POST** `/api/tickets/:id/delivery/receive` - Receive delivery at RC (Hitachi users)
- **POST** `/api/tickets/:id/return` - Create return form (Hitachi users)
- **POST** `/api/tickets/:id/return/receive` - Receive return at Pengelola (Pengelola)

---

## 🔧 Repair Tickets

### CRUD Operations
- **GET** `/api/repairs` - List semua repair tickets (dengan pagination, search, filter, sort)
  - Query params: `page`, `limit`, `search`, `status`, `dateFilter`, `sortBy`, `sortOrder`
- **GET** `/api/repairs/:id` - Detail repair ticket
- **GET** `/api/repairs/by-ticket/:ticketId` - Get repair tickets by problem ticket ID
- **POST** `/api/repairs` - Create repair ticket (RC Staff)
- **POST** `/api/repairs/bulk-from-ticket/:ticketId` - Bulk create repair tickets dari problem ticket (RC Staff)
- **PATCH** `/api/repairs/:id` - Update repair ticket
- **DELETE** `/api/repairs/:id` - Soft delete repair ticket (RC_MANAGER, SUPER_ADMIN)

### Repair Operations
- **POST** `/api/repairs/:id/take` - Take/Assign repair ticket to current user (RC Staff)
- **POST** `/api/repairs/:id/complete` - Complete repair dan perform QC (RC Staff)
- **GET** `/api/repairs/statistics` - Repair statistics
- **GET** `/api/repairs/pending-return` - List cassettes pending return (RC Staff)
- **POST** `/api/repairs/sync-service-order-status` - Sync service order status based on repair completion
  - Query param: `ticketId` (optional)

---

## 🔄 Preventive Maintenance (PM)

### CRUD Operations
- **GET** `/api/preventive-maintenance` - List semua PM tasks (dengan pagination, search, filter, sort)
  - Query params: `page`, `limit`, `search`, `status`, `type`, `location`, `sortBy`, `sortOrder`
- **GET** `/api/preventive-maintenance/:id` - Detail PM task
- **POST** `/api/preventive-maintenance` - Create PM task (Hitachi) atau request PM (Pengelola)
- **PATCH** `/api/preventive-maintenance/:id` - Update PM task
- **DELETE** `/api/preventive-maintenance/:id` - Soft delete PM task (RC_MANAGER, SUPER_ADMIN)

### PM Operations
- **POST** `/api/preventive-maintenance/:id/take` - Take/Assign PM task to current user (Hitachi users)
- **POST** `/api/preventive-maintenance/:id/cancel` - Cancel PM task (Hitachi users)
- **POST** `/api/preventive-maintenance/:id/disable-auto-schedule` - Disable auto-scheduling for routine PM
- **PATCH** `/api/preventive-maintenance/:id/cassette/:cassetteId` - Update cassette detail in PM (checklist, findings, actions, parts, status, notes)
- **POST** `/api/preventive-maintenance/auto-schedule/trigger` - Manually trigger auto-scheduling for routine PM (Hitachi only, SUPER_ADMIN/RC_MANAGER)

### PM Cleanup (Admin Only)
- **POST** `/api/preventive-maintenance/cleanup/run` - Manual trigger cleanup untuk old soft-deleted PMs (SUPER_ADMIN)
- **POST** `/api/preventive-maintenance/cleanup/repair-tickets` - Manual trigger cleanup untuk old soft-deleted repair tickets (SUPER_ADMIN)
- **POST** `/api/preventive-maintenance/cleanup/problem-tickets` - Manual trigger cleanup untuk old soft-deleted problem tickets (SUPER_ADMIN)

---

## 🛡️ Warranty Management

### Warranty Configuration
- **GET** `/api/warranty/configs` - Get warranty configurations untuk bank
  - Query param: `bankId` (optional)
- **POST** `/api/warranty/configs` - Create warranty configuration (SUPER_ADMIN)
- **PATCH** `/api/warranty/configs/:id` - Update warranty configuration (SUPER_ADMIN)

### Warranty Status & Claims
- **GET** `/api/warranty/config/:customerBankId` - Get all warranty configurations for a customer bank (Hitachi only)
- **POST** `/api/warranty/config/:customerBankId` - Create or update warranty configuration (Hitachi, RC_MANAGER/SUPER_ADMIN)
- **PATCH** `/api/warranty/config/:customerBankId/:warrantyType` - Update warranty configuration (Hitachi, RC_MANAGER/SUPER_ADMIN)
- **GET** `/api/warranty/status/:cassetteId` - Check warranty status for a cassette (Hitachi only)
- **GET** `/api/warranty/statistics/:customerBankId` - Warranty statistics for a customer bank (Hitachi only)

---

## 👥 Users Management

### Hitachi Users (via Auth Controller)
- **GET** `/api/auth/hitachi-users` - List Hitachi users (SUPER_ADMIN, RC_MANAGER)
- **POST** `/api/auth/hitachi-users` - Create Hitachi user (SUPER_ADMIN)
- **PATCH** `/api/auth/hitachi-users/:id` - Update Hitachi user (SUPER_ADMIN)
- **DELETE** `/api/auth/hitachi-users/:id` - Delete Hitachi user (SUPER_ADMIN)

### Engineers
- **GET** `/api/users/engineers` - Get all engineer users (RC_STAFF and RC_MANAGER) (Hitachi only)

### Pengelola Users (via Pengelola Controller)
- **GET** `/api/pengelola/:id/users` - List users for a pengelola
- **POST** `/api/pengelola/:id/users` - Create pengelola user (SUPER_ADMIN, ADMIN)
- **PATCH** `/api/pengelola/:id/users/:userId` - Update pengelola user (SUPER_ADMIN, ADMIN)
- **DELETE** `/api/pengelola/:id/users/:userId` - Delete pengelola user (SUPER_ADMIN, ADMIN)

---

## 📊 Analytics & Statistics

- **GET** `/api/analytics/dashboard` - Dashboard statistics (role-based)
- **GET** `/api/analytics/repairs` - Repair analytics
- **GET** `/api/analytics/tickets` - Ticket analytics
- **GET** `/api/analytics/cassettes` - Cassette analytics

---

## 📦 Pengelola Management

- **GET** `/api/pengelola` - List semua pengelola
- **GET** `/api/pengelola/:id` - Detail pengelola
- **GET** `/api/pengelola/:id/users` - List users untuk pengelola
- **GET** `/api/pengelola/:id/machines` - Get all machines assigned to a pengelola
- **POST** `/api/pengelola` - Create pengelola (SUPER_ADMIN)
- **PATCH** `/api/pengelola/:id` - Update pengelola (SUPER_ADMIN)
- **DELETE** `/api/pengelola/:id` - Delete pengelola (SUPER_ADMIN)

---

## 📥 Import & Data Management

### Import Operations (SUPER_ADMIN only)
- **POST** `/api/import/bulk` - Bulk import banks and cassettes from JSON
  - Request Body: `{ banks: [...], cassettes: [...] }`
- **POST** `/api/import/excel` - Bulk import banks and cassettes from Excel (.xlsx, .xls)
  - Content-Type: `multipart/form-data`
  - File field: `file`
- **POST** `/api/import/csv` - Bulk import machines, cassettes, and Pengelola assignments from CSV
  - Content-Type: `multipart/form-data`
  - File field: `file`
  - Format: `machine_serial_number,cassette_serial_number,bank_code,pengelola_code`
- **GET** `/api/import/csv/template` - Download CSV import template
- **POST** `/api/import/csv/machine-cassettes` - Bulk import machines with 10 cassettes (5 main + 5 backup) from CSV
  - Content-Type: `multipart/form-data`
  - File field: `file`
  - Query params: `bank_code`, `pengelola_code`
  - Format: `SN Mesin, SN Kaset Utama 1-5, SN Kaset Cadangan 1-5`
- **GET** `/api/import/csv/machine-cassettes/template` - Download CSV template for machine-cassettes import

### Data Management (SUPER_ADMIN only)
- **GET** `/api/data-management/stats` - Database statistics
- **POST** `/api/data-management/query` - Execute SQL query (SELECT only)
  - Request Body: `{ query: "SELECT ..." }`
- **POST** `/api/data-management/maintenance` - Perform database maintenance
  - Request Body: `{ action: "VACUUM" | "ANALYZE" | "REINDEX" }`
- **GET** `/api/data-management/tables/:tableName` - Get table data with pagination
  - Query params: `page`, `limit`
- **GET** `/api/data-management/tables/:tableName/:id` - Get single record by ID
- **PATCH** `/api/data-management/tables/:tableName/:id` - Update record
  - Request Body: `{ data: {...} }`
- **DELETE** `/api/data-management/tables/:tableName/:id` - Delete record
- **POST** `/api/data-management/backup` - Create database backup
- **GET** `/api/data-management/backups` - List all backups
- **GET** `/api/data-management/backups/:filename` - Download backup file
- **POST** `/api/data-management/restore` - Restore database from backup
  - Content-Type: `multipart/form-data`
  - File field: `file`

---

## 🔍 Health & Version

- **GET** `/api/` - Health check endpoint
- **GET** `/api/version` - Get API version

---

## 🔑 Authentication & Authorization

### Authentication Method
Semua endpoints (kecuali `/api/auth/login`, `/api/auth/refresh`, `/api/`, `/api/version`) memerlukan:
- **Header**: `Authorization: Bearer <access_token>`
- Token didapat dari `/api/auth/login`

### User Types & Roles

#### Hitachi Users
- **SUPER_ADMIN**: Full access ke semua endpoints
- **RC_MANAGER**: Access ke repair center operations, bisa delete tickets/PM (dengan restrictions)
- **RC_STAFF**: Access ke repair center operations, tidak bisa delete

#### Pengelola Users
- **ADMIN**: Full access untuk pengelola mereka
- **SUPERVISOR**: Limited access
- **TECHNICIAN**: Read-only access

---

## 📝 Request/Response Format

### Standard Response Format

#### Success Response
```json
{
  "data": {...},
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

### Pagination
- Default: `page=1`, `limit=50`
- Max limit: 1000 (untuk beberapa endpoints)

### Sorting
- `sortBy`: Field name untuk sorting
- `sortOrder`: `asc` atau `desc` (default: `desc`)

---

## 🔒 Security Features

1. **JWT Authentication**: Access token (15 minutes) + Refresh token
2. **Role-Based Access Control**: Setiap endpoint memiliki role restrictions
3. **CORS**: Configured untuk allowed origins
4. **Rate Limiting**: 
   - Short: 30 requests/minute
   - Medium: 200 requests/10 minutes
   - Long: 1000 requests/hour
5. **Input Validation**: Semua input divalidasi menggunakan class-validator
6. **Soft Delete**: Data tidak dihapus permanen, hanya di-mark sebagai deleted

---

## 📚 API Documentation

Untuk dokumentasi lengkap dengan Swagger UI:
- Development: `http://localhost:3000/api/docs`
- Production: Disabled untuk security

---

## 🔗 Integration Examples

### Example: Get All Cassettes
```bash
curl -X GET "http://your-server:3000/api/cassettes?page=1&limit=50&status=OK" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example: Create Problem Ticket
```bash
curl -X POST "http://your-server:3000/api/tickets" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cassetteId": "uuid",
    "title": "Kaset Macet",
    "description": "Kaset tidak bisa menerima uang",
    "priority": "HIGH"
  }'
```

### Example: Check Cassette Availability (Batch)
```bash
curl -X POST "http://your-server:3000/api/cassettes/check-availability-batch" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cassetteIds": ["uuid1", "uuid2", "uuid3"]
  }'
```

---

## 📋 Endpoint Summary by Category

### Core CRUD Operations
- **Machines**: `/api/machines` (GET, POST, PATCH, DELETE)
- **Cassettes**: `/api/cassettes` (GET, POST, PATCH, DELETE)
- **Tickets**: `/api/tickets` (GET, POST, PATCH, DELETE)
- **Repairs**: `/api/repairs` (GET, POST, PATCH, DELETE)
- **PM**: `/api/preventive-maintenance` (GET, POST, PATCH, DELETE)

### Configuration & Management
- **Banks**: `/api/banks`
- **Bank Customers**: `/api/bank-customers`
- **Pengelola**: `/api/pengelola`
- **Users**: `/api/users`
- **Warranty**: `/api/warranty`

### Operations & Workflows
- **Delivery**: `/api/tickets/:id/delivery`
- **Return**: `/api/tickets/:id/return`
- **Repair Completion**: `/api/repairs/:id/complete`
- **PM Operations**: `/api/preventive-maintenance/:id/start|complete|cancel`

### Analytics & Reports
- **Analytics**: `/api/analytics/*`
- **Statistics**: Various endpoints dengan `/statistics` suffix

---

## ⚠️ Important Notes

1. **Base URL**: Semua endpoints menggunakan prefix `/api`
2. **Authentication**: Hampir semua endpoints memerlukan Bearer token
3. **Soft Delete**: Delete operations adalah soft delete (data tidak dihapus permanen)
4. **Pagination**: Gunakan pagination untuk list endpoints untuk performa yang baik
5. **Rate Limiting**: Perhatikan rate limits, gunakan batch endpoints jika tersedia
6. **CORS**: Pastikan origin Anda di-whitelist di CORS configuration

---

## 🚀 Quick Start untuk Integrasi

1. **Login** untuk mendapatkan access token
2. **Gunakan access token** di header Authorization untuk semua requests
3. **Refresh token** jika access token expired
4. **Gunakan batch endpoints** untuk multiple operations (e.g., `check-availability-batch`)
5. **Implement pagination** untuk list endpoints
6. **Handle errors** dengan proper error handling

---

Untuk dokumentasi detail setiap endpoint, silakan akses Swagger UI di `/api/docs` (development mode).

