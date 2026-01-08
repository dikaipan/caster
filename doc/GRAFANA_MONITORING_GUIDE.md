# 📊 Panduan Implementasi Grafana untuk Monitoring

Dokumen ini menjelaskan cara mengintegrasikan **Grafana** dan **Prometheus** untuk monitoring aplikasi HCS Cassette Management System.

---

## 🎯 Apa itu Grafana?

**Grafana** adalah platform open-source untuk visualisasi dan monitoring data. Biasanya dipasangkan dengan **Prometheus** (time-series database) untuk:

- **Monitoring infrastruktur**: CPU, RAM, disk usage, network
- **Monitoring aplikasi**: Response time, error rate, request count
- **Monitoring database**: Query performance, connection pool, slow queries
- **Monitoring bisnis**: Jumlah SO, repair tickets, kaset per status
- **Alerting**: Notifikasi otomatis saat ada masalah (misalnya error rate tinggi, response time lambat)

---

## 🏗️ Arsitektur Monitoring

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   NestJS    │────────▶│  Prometheus │────────▶│   Grafana   │
│   Backend   │ Metrics │  (Collector) │ Query   │ (Dashboard) │
└─────────────┘         └──────────────┘         └─────────────┘
     │                          │
     │                          │
     └──────────────────────────┘
        Expose /metrics endpoint
```

### Alur Kerja:
1. **NestJS Backend** mengekspos endpoint `/metrics` yang mengeluarkan data metrics dalam format Prometheus.
2. **Prometheus** melakukan scraping (polling) ke endpoint `/metrics` setiap beberapa detik.
3. **Grafana** membaca data dari Prometheus dan menampilkannya dalam dashboard yang bisa dikustomisasi.

---

## 📦 Instalasi & Setup

### 1. Install Dependencies

```bash
cd backend
npm install --save prom-client
npm install --save-dev @types/prom-client
```

**`prom-client`** adalah library untuk mengekspos metrics dalam format Prometheus.

### 2. Setup Prometheus Module di NestJS

Buat file `backend/src/metrics/metrics.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
```

### 3. Buat Metrics Service

Buat file `backend/src/metrics/metrics.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: Registry;

  // HTTP Request Metrics
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestTotal: Counter<string>;
  public readonly httpRequestErrors: Counter<string>;

  // Database Metrics
  public readonly dbQueryDuration: Histogram<string>;
  public readonly dbQueryTotal: Counter<string>;
  public readonly dbConnections: Gauge<string>;

  // Business Metrics
  public readonly ticketsTotal: Gauge<string>;
  public readonly ticketsByStatus: Gauge<string>;
  public readonly cassettesByStatus: Gauge<string>;
  public readonly repairsInProgress: Gauge<string>;
  public readonly pendingReturns: Gauge<string>;

  // System Metrics
  public readonly activeUsers: Gauge<string>;
  public readonly apiResponseTime: Histogram<string>;

  constructor() {
    this.register = new Registry();

    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.register],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status'],
      registers: [this.register],
    });

    // Database Metrics
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    this.dbQueryTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table'],
      registers: [this.register],
    });

    this.dbConnections = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.register],
    });

    // Business Metrics
    this.ticketsTotal = new Gauge({
      name: 'tickets_total',
      help: 'Total number of tickets',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.ticketsByStatus = new Gauge({
      name: 'tickets_by_status',
      help: 'Number of tickets by status',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.cassettesByStatus = new Gauge({
      name: 'cassettes_by_status',
      help: 'Number of cassettes by status',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.repairsInProgress = new Gauge({
      name: 'repairs_in_progress',
      help: 'Number of repairs in progress',
      registers: [this.register],
    });

    this.pendingReturns = new Gauge({
      name: 'pending_returns_total',
      help: 'Total number of pending returns',
      registers: [this.register],
    });

    // System Metrics
    this.activeUsers = new Gauge({
      name: 'active_users_total',
      help: 'Number of active users',
      registers: [this.register],
    });

    this.apiResponseTime = new Histogram({
      name: 'api_response_time_seconds',
      help: 'API response time in seconds',
      labelNames: ['endpoint', 'method'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    // Register default metrics (CPU, memory, etc.)
    this.register.setDefaultLabels({
      app: 'hcm-backend',
      environment: process.env.NODE_ENV || 'development',
    });
  }

  getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getRegister(): Registry {
    return this.register;
  }
}
```

### 4. Buat Metrics Controller

Buat file `backend/src/metrics/metrics.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  async getMetrics() {
    const metrics = await this.metricsService.getMetrics();
    return metrics;
  }
}
```

### 5. Buat Interceptor untuk Auto-Tracking HTTP Requests

Buat file `backend/src/common/interceptors/metrics.interceptor.ts`:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, route } = request;
    const routePath = route?.path || request.url;

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startTime) / 1000;
        const status = response.statusCode;

        // Record metrics
        this.metricsService.httpRequestDuration
          .labels(method, routePath, status)
          .observe(duration);

        this.metricsService.httpRequestTotal
          .labels(method, routePath, status)
          .inc();

        // Track errors
        if (status >= 400) {
          this.metricsService.httpRequestErrors
            .labels(method, routePath, status)
            .inc();
        }
      }),
      catchError((error) => {
        const duration = (Date.now() - startTime) / 1000;
        const status = error.status || 500;

        this.metricsService.httpRequestDuration
          .labels(method, routePath, status)
          .observe(duration);

        this.metricsService.httpRequestTotal
          .labels(method, routePath, status)
          .inc();

        this.metricsService.httpRequestErrors
          .labels(method, routePath, status)
          .inc();

        throw error;
      }),
    );
  }
}
```

### 6. Register Metrics Module di AppModule

Update `backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';

@Module({
  imports: [
    // ... existing imports
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
      inject: [MetricsService],
    },
    // ... other providers
  ],
})
export class AppModule {}
```

---

## 🔧 Setup Prometheus

### 1. Install Prometheus

**Windows (dengan Chocolatey):**
```powershell
choco install prometheus
```

**Atau download manual:**
- Download dari https://prometheus.io/download/
- Extract ke folder (misalnya `C:\prometheus`)

### 2. Konfigurasi Prometheus

Buat file `prometheus.yml` di root project:

```yaml
global:
  scrape_interval: 15s  # Scrape metrics every 15 seconds
  evaluation_interval: 15s
  external_labels:
    monitor: 'hcm-monitor'

scrape_configs:
  - job_name: 'hcm-backend'
    static_configs:
      - targets: ['localhost:3001']  # Backend NestJS port
        labels:
          instance: 'hcm-backend-dev'
          environment: 'development'
```

### 3. Jalankan Prometheus

```bash
# Windows
prometheus.exe --config.file=prometheus.yml --web.listen-address=:9090

# Linux/Mac
./prometheus --config.file=prometheus.yml --web.listen-address=:9090
```

Prometheus akan berjalan di `http://localhost:9090`

---

## 📊 Setup Grafana

### 1. Install Grafana

**Windows (dengan Chocolatey):**
```powershell
choco install grafana
```

**Atau download manual:**
- Download dari https://grafana.com/grafana/download
- Install sebagai service Windows

### 2. Konfigurasi Grafana

1. Buka `http://localhost:3000` (default Grafana port)
2. Login dengan default credentials:
   - Username: `admin`
   - Password: `admin` (akan diminta ganti password)
3. **Add Data Source**:
   - Klik "Add data source"
   - Pilih "Prometheus"
   - URL: `http://localhost:9090`
   - Klik "Save & Test"

### 3. Import Dashboard

Buat dashboard baru atau import dari template. Contoh query untuk dashboard:

#### **HTTP Request Rate**
```promql
rate(http_requests_total[5m])
```

#### **HTTP Error Rate**
```promql
rate(http_request_errors_total[5m])
```

#### **Average Response Time**
```promql
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

#### **Tickets by Status**
```promql
tickets_by_status
```

#### **Cassettes by Status**
```promql
cassettes_by_status
```

#### **Database Query Duration (P95)**
```promql
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))
```

---

## 📈 Metrics yang Bisa Dimonitor

### 1. **Infrastruktur**
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

### 2. **Aplikasi (HTTP)**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Request count per endpoint

### 3. **Database**
- Query duration
- Query count
- Connection pool usage
- Slow queries

### 4. **Bisnis (Custom Metrics)**
- Total tickets per status
- Total cassettes per status
- Repairs in progress
- Pending returns
- Active users
- Warranty claims count

---

## 🚨 Setup Alerting

### 1. Buat Alert Rules di Prometheus

Buat file `alerts.yml`:

```yaml
groups:
  - name: hcm_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time detected"
          description: "P95 response time is {{ $value }} seconds"

      - alert: DatabaseSlowQueries
        expr: histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "P95 query time is {{ $value }} seconds"

      - alert: HighPendingReturns
        expr: pending_returns_total > 50
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "High number of pending returns"
          description: "There are {{ $value }} pending returns"
```

Update `prometheus.yml` untuk include alerts:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'alerts.yml'  # Add this

scrape_configs:
  - job_name: 'hcm-backend'
    static_configs:
      - targets: ['localhost:3001']
```

### 2. Setup Alerting di Grafana

1. Di Grafana, buka **Alerting** → **Alert rules**
2. Buat alert rule baru atau import dari Prometheus
3. Konfigurasi notifikasi (email, Slack, webhook, dll)

---

## 🔄 Update Business Metrics Secara Berkala

Buat service untuk update business metrics. Contoh di `backend/src/metrics/metrics-updater.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsUpdaterService {
  private readonly logger = new Logger(MetricsUpdaterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE) // Update every minute
  async updateBusinessMetrics() {
    try {
      // Update tickets by status
      const ticketsByStatus = await this.prisma.problemTicket.groupBy({
        by: ['status'],
        _count: true,
      });

      ticketsByStatus.forEach(({ status, _count }) => {
        this.metricsService.ticketsByStatus.set({ status }, _count);
      });

      // Update cassettes by status
      const cassettesByStatus = await this.prisma.cassette.groupBy({
        by: ['status'],
        _count: true,
      });

      cassettesByStatus.forEach(({ status, _count }) => {
        this.metricsService.cassettesByStatus.set({ status }, _count);
      });

      // Update repairs in progress
      const repairsInProgress = await this.prisma.repairTicket.count({
        where: {
          status: { in: ['RECEIVED', 'DIAGNOSING', 'ON_PROGRESS'] },
        },
      });

      this.metricsService.repairsInProgress.set(repairsInProgress);

      // Update pending returns
      const pendingReturns = await this.prisma.repairTicket.count({
        where: {
          status: 'COMPLETED',
          qcPassed: true,
          cassette: {
            returns: {
              none: {},
            },
          },
        },
      });

      this.metricsService.pendingReturns.set(pendingReturns);

      this.logger.debug('Business metrics updated successfully');
    } catch (error) {
      this.logger.error('Error updating business metrics', error.stack);
    }
  }
}
```

Register di `MetricsModule`:

```typescript
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsUpdaterService],
  exports: [MetricsService],
})
export class MetricsModule {}
```

---

## 📝 Testing

### 1. Test Metrics Endpoint

```bash
curl http://localhost:3001/metrics
```

Harus mengembalikan metrics dalam format Prometheus.

### 2. Test di Prometheus

Buka `http://localhost:9090` dan coba query:
```
http_requests_total
```

### 3. Test di Grafana

1. Buat dashboard baru
2. Add panel dengan query: `rate(http_requests_total[5m])`
3. Visualisasi harus menampilkan grafik

---

## 🎨 Contoh Dashboard Layout

### **Panel 1: Request Rate**
- Query: `rate(http_requests_total[5m])`
- Visualization: Time series graph
- Title: "HTTP Request Rate"

### **Panel 2: Error Rate**
- Query: `rate(http_request_errors_total[5m])`
- Visualization: Time series graph
- Title: "HTTP Error Rate"

### **Panel 3: Response Time (P95)**
- Query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- Visualization: Time series graph
- Title: "Response Time (P95)"

### **Panel 4: Tickets by Status**
- Query: `tickets_by_status`
- Visualization: Pie chart atau bar chart
- Title: "Tickets by Status"

### **Panel 5: Cassettes by Status**
- Query: `cassettes_by_status`
- Visualization: Pie chart atau bar chart
- Title: "Cassettes by Status"

### **Panel 6: Pending Returns**
- Query: `pending_returns_total`
- Visualization: Stat panel
- Title: "Pending Returns"

---

## 🔐 Security Considerations

1. **Protect `/metrics` endpoint**:
   - Jangan expose ke public
   - Gunakan authentication atau IP whitelist
   - Atau gunakan internal network saja

2. **Prometheus & Grafana**:
   - Jangan expose ke internet tanpa authentication
   - Gunakan reverse proxy (nginx) dengan basic auth
   - Atau gunakan VPN/internal network

---

## 📚 Referensi

- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/
- **prom-client**: https://github.com/siimon/prom-client
- **NestJS Interceptors**: https://docs.nestjs.com/interceptors

---

## ✅ Checklist Implementasi

- [ ] Install `prom-client` di backend
- [ ] Buat `MetricsModule`, `MetricsService`, `MetricsController`
- [ ] Buat `MetricsInterceptor` untuk auto-tracking HTTP requests
- [ ] Register interceptor di `AppModule`
- [ ] Test endpoint `/metrics`
- [ ] Install & setup Prometheus
- [ ] Install & setup Grafana
- [ ] Connect Grafana ke Prometheus data source
- [ ] Buat dashboard pertama
- [ ] Setup alerting rules
- [ ] Update business metrics secara berkala (cron job)
- [ ] Dokumentasikan dashboard untuk team

---

**Catatan**: Implementasi ini memberikan dasar monitoring yang solid. Bisa diperluas dengan metrics tambahan sesuai kebutuhan bisnis (misalnya warranty claims, PM completion rate, dll).

