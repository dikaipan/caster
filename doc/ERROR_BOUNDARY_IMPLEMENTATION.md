# 🛡️ Error Boundary Implementation Guide

**Status**: ✅ Implemented  
**Date**: 13 Desember 2025

---

## 📋 Overview

React Error Boundaries telah diimplementasikan untuk menangkap runtime errors dengan graceful error handling, mencegah seluruh aplikasi crash ketika terjadi error di komponen tertentu.

---

## 🎯 Features

### 1. **Root Error Boundary**
- ✅ Wraps entire application di `layout.tsx`
- ✅ Menangkap semua unhandled errors
- ✅ User-friendly error UI dengan retry functionality

### 2. **Page-Specific Error Boundary**
- ✅ `PageErrorBoundary` untuk halaman spesifik
- ✅ Lebih kontekstual dengan fallback yang sesuai
- ✅ Refresh dan navigation options

---

## 📁 Files Created

### 1. `ErrorBoundary.tsx`
Main error boundary component dengan fitur:
- Full-page error UI dengan card design
- "Coba Lagi" button untuk reset state
- "Kembali ke Dashboard" button
- Error details in development mode
- Optional `onError` callback untuk logging

### 2. `PageErrorBoundary.tsx`
Page-specific error boundary dengan:
- Compact error UI
- Page refresh functionality
- Navigation back to dashboard

---

## 🚀 Usage

### Root Layout (Already Integrated)

```tsx
// frontend/src/app/layout.tsx
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### Page-Specific Usage

```tsx
import { PageErrorBoundary } from "@/components/error-boundary/PageErrorBoundary";

export default function MyPage() {
  return (
    <PageErrorBoundary>
      {/* Your page content */}
    </PageErrorBoundary>
  );
}
```

### Custom Error Boundary

```tsx
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";

function MyComponent() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Custom error logging
        console.error('Custom error:', error, errorInfo);
        // Send to error tracking service
      }}
      fallback={
        <div>Custom error UI</div>
      }
    >
      {/* Component that might error */}
    </ErrorBoundary>
  );
}
```

---

## 🔧 Customization

### Error Logging

Untuk production, integrate dengan error tracking service:

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Example: Sentry integration
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }}
>
  {children}
</ErrorBoundary>
```

### Custom Fallback UI

```tsx
<ErrorBoundary
  fallback={
    <div className="custom-error-ui">
      <h1>Oops! Something went wrong</h1>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  }
>
  {children}
</ErrorBoundary>
```

---

## 📊 Error Boundary Behavior

### What Error Boundaries Catch:
- ✅ Component render errors
- ✅ Lifecycle method errors
- ✅ Constructor errors

### What Error Boundaries DON'T Catch:
- ❌ Event handlers (use try-catch instead)
- ❌ Async code (use try-catch instead)
- ❌ Server-side rendering errors
- ❌ Errors in error boundary itself

---

## 🎨 UI Features

### Development Mode
- Shows detailed error stack trace
- Expandable error details section
- Full error information for debugging

### Production Mode
- User-friendly error message
- Clean error UI tanpa technical details
- Action buttons (Retry, Go to Dashboard)

---

## 🔒 Best Practices

### 1. Use Error Boundaries Strategically
- Wrap major page sections
- Don't wrap every small component (overhead)
- Use for critical user flows

### 2. Combine with Try-Catch
```tsx
// For async operations
const handleSubmit = async () => {
  try {
    await api.post('/endpoint', data);
  } catch (error) {
    // Handle error gracefully
    toast({ title: 'Error', description: error.message });
  }
};
```

### 3. Error Logging
- Always log errors for debugging
- Use error tracking service in production
- Include context information

---

## 📝 Example Integration Points

### Recommended Placement:
1. ✅ Root layout (Already done)
2. ✅ Major page sections
3. ✅ Third-party component wrappers
4. ✅ Chart/visualization components
5. ✅ Form submission handlers (with try-catch)

---

## 🚦 Testing Error Boundaries

### Test Error Scenario:
```tsx
// Component to test error boundary
function TestErrorComponent() {
  const [shouldError, setShouldError] = useState(false);
  
  if (shouldError) {
    throw new Error('Test error for error boundary');
  }
  
  return (
    <button onClick={() => setShouldError(true)}>
      Trigger Error
    </button>
  );
}
```

---

## 📚 References

- [React Error Boundaries Documentation](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Boundary Best Practices](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

---

**Last Updated**: 13 Desember 2025

