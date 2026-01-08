'use client';

import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package } from 'lucide-react';

interface CourierInfoFormProps {
  courierService: string;
  customCourierService: string;
  trackingNumber: string;
  shippedDate: string;
  estimatedArrival: string;
  fieldErrors: Record<string, string>;
  onCourierServiceChange: (value: string) => void;
  onCustomCourierServiceChange: (value: string) => void;
  onTrackingNumberChange: (value: string) => void;
  onShippedDateChange: (value: string) => void;
  onEstimatedArrivalChange: (value: string) => void;
  onFieldBlur?: (field: string, value: string) => void;
}

export default function CourierInfoForm({
  courierService,
  customCourierService,
  trackingNumber,
  shippedDate,
  estimatedArrival,
  fieldErrors,
  onCourierServiceChange,
  onCustomCourierServiceChange,
  onTrackingNumberChange,
  onShippedDateChange,
  onEstimatedArrivalChange,
  onFieldBlur,
}: CourierInfoFormProps) {
  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-lg">
      <h3 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
        <Package className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        Detail Pengiriman Kurir
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="courierService" className="font-semibold text-gray-900 dark:text-slate-100">
            Jasa Kurir <span className="text-red-600 dark:text-red-400 font-bold">*</span>
          </Label>
          <Select value={courierService} onValueChange={onCourierServiceChange}>
            <SelectTrigger
              id="courierService"
              className={`h-12 border-2 ${
                fieldErrors.courierService
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-slate-600'
              } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}
            >
              <SelectValue placeholder="Pilih jasa kurir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="JNE">JNE</SelectItem>
              <SelectItem value="TIKI">TIKI</SelectItem>
              <SelectItem value="POS_INDONESIA">Pos Indonesia</SelectItem>
              <SelectItem value="JNT">JNT</SelectItem>
              <SelectItem value="SICEPAT">SiCepat</SelectItem>
              <SelectItem value="ANTERAJA">AnterAja</SelectItem>
              <SelectItem value="OTHER">Lainnya</SelectItem>
            </SelectContent>
          </Select>
          {fieldErrors.courierService && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.courierService}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="trackingNumber" className="font-semibold text-gray-900 dark:text-slate-100">
            Nomor Resi / AWB <span className="text-red-600 dark:text-red-400 font-bold">*</span>
          </Label>
          <Input
            id="trackingNumber"
            placeholder="JNE123456789"
            value={trackingNumber}
            onChange={(e) => onTrackingNumberChange(e.target.value)}
            onBlur={(e) => onFieldBlur?.('trackingNumber', e.target.value)}
            required
            className={`h-12 font-mono border-2 ${
              fieldErrors.trackingNumber
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-slate-600'
            } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}
            aria-invalid={fieldErrors.trackingNumber ? 'true' : 'false'}
          />
          {fieldErrors.trackingNumber && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.trackingNumber}
            </p>
          )}
        </div>
      </div>

      {courierService === 'OTHER' && (
        <div className="space-y-2">
          <Label htmlFor="customCourierService" className="font-semibold text-gray-900 dark:text-slate-100">
            Nama Jasa Kurir <span className="text-red-600 dark:text-red-400 font-bold">*</span>
          </Label>
          <Input
            id="customCourierService"
            placeholder="Masukkan nama jasa kurir"
            value={customCourierService}
            onChange={(e) => onCustomCourierServiceChange(e.target.value)}
            onBlur={(e) => onFieldBlur?.('customCourierService', e.target.value)}
            className={`h-12 border-2 ${
              fieldErrors.courierService && courierService === 'OTHER'
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-slate-600'
            } bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100`}
            aria-invalid={fieldErrors.courierService && courierService === 'OTHER' ? 'true' : 'false'}
          />
          {fieldErrors.courierService && courierService === 'OTHER' && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.courierService}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="shippedDate" className="font-semibold text-gray-900 dark:text-slate-100">
            Tanggal Pengiriman <span className="text-red-600 dark:text-red-400 font-bold">*</span>
          </Label>
          <Input
            id="shippedDate"
            type="date"
            value={shippedDate}
            onChange={(e) => onShippedDateChange(e.target.value)}
            className="h-12 border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimatedArrival" className="font-semibold text-gray-900 dark:text-slate-100">
            Estimasi Sampai
          </Label>
          <Input
            id="estimatedArrival"
            type="date"
            value={estimatedArrival}
            onChange={(e) => onEstimatedArrivalChange(e.target.value)}
            min={shippedDate}
            className="h-12 border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
          />
        </div>
      </div>
    </div>
  );
}

