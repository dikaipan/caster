'use client';

import { Truck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CourierInfoForm from '../CourierInfoForm';
import ShippingAddressForm from '../ShippingAddressForm';

interface ShippingInfoStepProps {
  deliveryMethod: string;
  courierService: string;
  customCourierService: string;
  trackingNumber: string;
  shippedDate: string;
  estimatedArrival: string;
  useOfficeAddress: boolean;
  senderAddress: string;
  senderCity: string;
  senderProvince: string;
  senderPostalCode: string;
  senderContactName: string;
  senderContactPhone: string;
  pengelolaInfo: any;
  selectedCassettes: any[];
  fieldErrors: Record<string, string>;
  error: string;
  canSubmit: boolean;
  submitting: boolean;
  onDeliveryMethodChange: (value: string) => void;
  onCourierServiceChange: (value: string) => void;
  onCustomCourierServiceChange: (value: string) => void;
  onTrackingNumberChange: (value: string) => void;
  onShippedDateChange: (value: string) => void;
  onEstimatedArrivalChange: (value: string) => void;
  onUseOfficeAddressChange: (checked: boolean) => void;
  onAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onContactNameChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onFieldBlur: (field: string, value: string) => void;
  onBack: () => void;
  onSubmit: (e?: React.FormEvent) => void;
  finalCourierService: string;
}

export default function ShippingInfoStep({
  deliveryMethod,
  courierService,
  customCourierService,
  trackingNumber,
  shippedDate,
  estimatedArrival,
  useOfficeAddress,
  senderAddress,
  senderCity,
  senderProvince,
  senderPostalCode,
  senderContactName,
  senderContactPhone,
  pengelolaInfo,
  selectedCassettes,
  fieldErrors,
  error,
  canSubmit,
  submitting,
  onDeliveryMethodChange,
  onCourierServiceChange,
  onCustomCourierServiceChange,
  onTrackingNumberChange,
  onShippedDateChange,
  onEstimatedArrivalChange,
  onUseOfficeAddressChange,
  onAddressChange,
  onCityChange,
  onProvinceChange,
  onPostalCodeChange,
  onContactNameChange,
  onContactPhoneChange,
  onFieldBlur,
  onBack,
  onSubmit,
  finalCourierService,
}: ShippingInfoStepProps) {
  const hasSelectedCassettes = selectedCassettes.length > 0;

  return (
    <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle>Informasi Pengiriman</CardTitle>
            <CardDescription>Lengkapi informasi pengiriman kaset ke Repair Center</CardDescription>
          </div>
          <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 px-3 py-1 rounded-full font-semibold">
            WAJIB
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="deliveryMethod" className="text-base font-semibold text-gray-900 dark:text-slate-100">
            Metode Pengiriman <span className="text-red-600 dark:text-red-400 font-bold">*</span>
          </Label>
          <Select value={deliveryMethod} onValueChange={onDeliveryMethodChange} required>
            <SelectTrigger
              id="deliveryMethod"
              className="h-12 text-base border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100"
            >
              <SelectValue placeholder="Pilih metode pengiriman" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SELF_DELIVERY">🚗 Antar Mandiri</SelectItem>
              <SelectItem value="COURIER">📦 Melalui Kurir</SelectItem>
            </SelectContent>
          </Select>
          {!deliveryMethod && (
            <p className="text-xs text-red-700 dark:text-red-400 font-semibold flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              Wajib pilih metode pengiriman untuk melanjutkan
            </p>
          )}
        </div>

        {deliveryMethod === 'COURIER' && (
          <CourierInfoForm
            courierService={courierService}
            customCourierService={customCourierService}
            trackingNumber={trackingNumber}
            shippedDate={shippedDate}
            estimatedArrival={estimatedArrival}
            fieldErrors={fieldErrors}
            onCourierServiceChange={onCourierServiceChange}
            onCustomCourierServiceChange={onCustomCourierServiceChange}
            onTrackingNumberChange={onTrackingNumberChange}
            onShippedDateChange={onShippedDateChange}
            onEstimatedArrivalChange={onEstimatedArrivalChange}
            onFieldBlur={onFieldBlur}
          />
        )}

        {deliveryMethod && (
          <ShippingAddressForm
            useOfficeAddress={useOfficeAddress}
            senderAddress={senderAddress}
            senderCity={senderCity}
            senderProvince={senderProvince}
            senderPostalCode={senderPostalCode}
            senderContactName={senderContactName}
            senderContactPhone={senderContactPhone}
            fieldErrors={fieldErrors}
            onUseOfficeAddressChange={onUseOfficeAddressChange}
            onAddressChange={onAddressChange}
            onCityChange={onCityChange}
            onProvinceChange={onProvinceChange}
            onPostalCodeChange={onPostalCodeChange}
            onContactNameChange={onContactNameChange}
            onContactPhoneChange={onContactPhoneChange}
            onFieldBlur={onFieldBlur}
            showOfficeAddressCheckbox={!!pengelolaInfo?.address}
          />
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-300 font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Validation Summary */}
        {!canSubmit && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-900 dark:text-yellow-300">
                <p className="font-semibold mb-1">Lengkapi informasi berikut:</p>
                <ul className="list-disc list-inside space-y-1">
                  {!hasSelectedCassettes && <li>Pilih minimal 1 kaset</li>}
                  {!deliveryMethod && <li>Pilih metode pengiriman</li>}
                  {deliveryMethod === 'COURIER' && !finalCourierService && <li>Pilih atau masukkan jasa kurir</li>}
                  {deliveryMethod === 'COURIER' && courierService === 'OTHER' && !customCourierService.trim() && (
                    <li>Masukkan nama jasa kurir (jika pilih Lainnya)</li>
                  )}
                  {deliveryMethod === 'COURIER' && !trackingNumber.trim() && <li>Masukkan nomor resi</li>}
                  {deliveryMethod === 'COURIER' && !shippedDate && <li>Pilih tanggal pengiriman</li>}
                  {!useOfficeAddress && !senderAddress.trim() && <li>Masukkan alamat pengirim</li>}
                  {!useOfficeAddress && !senderCity.trim() && <li>Masukkan kota pengirim</li>}
                  {!useOfficeAddress && !senderContactName.trim() && <li>Masukkan nama kontak</li>}
                  {!useOfficeAddress && !senderContactPhone.trim() && <li>Masukkan nomor telepon kontak</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 flex justify-between gap-4">
          <Button type="button" variant="outline" size="lg" onClick={onBack} disabled={submitting} className="min-w-[150px]">
            Kembali
          </Button>
          <Button
            type="submit"
            size="lg"
            onClick={(e) => {
              e.preventDefault();
              onSubmit(e);
            }}
            disabled={submitting || !canSubmit}
            className="min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canSubmit ? 'Lengkapi semua field yang wajib diisi' : ''}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Membuat Tiket...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Buat {selectedCassettes.length > 1 ? `${selectedCassettes.length} ` : ''}Tiket
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

