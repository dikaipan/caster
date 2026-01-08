'use client';

import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ShippingAddressFormProps {
  useOfficeAddress: boolean;
  senderAddress: string;
  senderCity: string;
  senderProvince: string;
  senderPostalCode: string;
  senderContactName: string;
  senderContactPhone: string;
  fieldErrors: Record<string, string>;
  onUseOfficeAddressChange: (checked: boolean) => void;
  onAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onContactNameChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onFieldBlur?: (field: string, value: string) => void;
  showOfficeAddressCheckbox?: boolean;
}

export default function ShippingAddressForm({
  useOfficeAddress,
  senderAddress,
  senderCity,
  senderProvince,
  senderPostalCode,
  senderContactName,
  senderContactPhone,
  fieldErrors,
  onUseOfficeAddressChange,
  onAddressChange,
  onCityChange,
  onProvinceChange,
  onPostalCodeChange,
  onContactNameChange,
  onContactPhoneChange,
  onFieldBlur,
  showOfficeAddressCheckbox = true,
}: ShippingAddressFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100">Alamat Pengirim</h3>
        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 px-2 py-1 rounded font-medium">
          WAJIB DIISI
        </span>
      </div>

      {showOfficeAddressCheckbox && (
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="shipping-useOfficeAddress"
            checked={useOfficeAddress}
            onChange={(e) => onUseOfficeAddressChange(e.target.checked)}
            className="h-4 w-4 text-primary rounded border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-primary"
          />
          <Label htmlFor="shipping-useOfficeAddress" className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
            Gunakan alamat kantor
          </Label>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="senderAddress" className="font-semibold text-gray-900 dark:text-slate-100">
            Alamat Lengkap <span className="text-red-600 dark:text-red-400 font-bold">*</span>
          </Label>
          <Textarea
            id="senderAddress"
            placeholder="Jl. Sudirman No. 123"
            value={senderAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            onBlur={(e) => onFieldBlur?.('senderAddress', e.target.value)}
            required={!useOfficeAddress}
            rows={2}
            disabled={useOfficeAddress}
            className={`bg-white dark:bg-slate-700 border-2 ${
              fieldErrors.senderAddress
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-slate-600'
            } text-gray-900 dark:text-slate-100`}
            aria-invalid={fieldErrors.senderAddress ? 'true' : 'false'}
          />
          {fieldErrors.senderAddress && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {fieldErrors.senderAddress}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="senderCity" className="font-semibold text-gray-900 dark:text-slate-100">
              Kota <span className="text-red-600 dark:text-red-400 font-bold">*</span>
            </Label>
            <Input
              id="senderCity"
              placeholder="Jakarta"
              value={senderCity}
              onChange={(e) => onCityChange(e.target.value)}
              onBlur={(e) => onFieldBlur?.('senderCity', e.target.value)}
              required={!useOfficeAddress}
              disabled={useOfficeAddress}
              className={`bg-white dark:bg-slate-700 border-2 ${
                fieldErrors.senderCity
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-slate-600'
              } text-gray-900 dark:text-slate-100`}
              aria-invalid={fieldErrors.senderCity ? 'true' : 'false'}
            />
            {fieldErrors.senderCity && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {fieldErrors.senderCity}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderProvince" className="font-semibold text-gray-900 dark:text-slate-100">
              Provinsi
            </Label>
            <Input
              id="senderProvince"
              placeholder="DKI Jakarta"
              value={senderProvince}
              onChange={(e) => onProvinceChange(e.target.value)}
              disabled={useOfficeAddress}
              className="bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="senderContactName" className="font-semibold text-gray-900 dark:text-slate-100">
              Nama Kontak <span className="text-red-600 dark:text-red-400 font-bold">*</span>
            </Label>
            <Input
              id="senderContactName"
              placeholder="John Doe"
              value={senderContactName}
              onChange={(e) => onContactNameChange(e.target.value)}
              onBlur={(e) => onFieldBlur?.('senderContactName', e.target.value)}
              required={!useOfficeAddress}
              disabled={useOfficeAddress}
              className={`bg-white dark:bg-slate-700 border-2 ${
                fieldErrors.senderContactName
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-slate-600'
              } text-gray-900 dark:text-slate-100`}
              aria-invalid={fieldErrors.senderContactName ? 'true' : 'false'}
            />
            {fieldErrors.senderContactName && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {fieldErrors.senderContactName}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderContactPhone" className="font-semibold text-gray-900 dark:text-slate-100">
              No. Telepon <span className="text-red-600 dark:text-red-400 font-bold">*</span>
            </Label>
            <Input
              id="senderContactPhone"
              placeholder="081234567890"
              value={senderContactPhone}
              onChange={(e) => onContactPhoneChange(e.target.value)}
              onBlur={(e) => onFieldBlur?.('senderContactPhone', e.target.value)}
              required={!useOfficeAddress}
              disabled={useOfficeAddress}
              className={`bg-white dark:bg-slate-700 border-2 ${
                fieldErrors.senderContactPhone
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-slate-600'
              } text-gray-900 dark:text-slate-100`}
              aria-invalid={fieldErrors.senderContactPhone ? 'true' : 'false'}
            />
            {fieldErrors.senderContactPhone && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {fieldErrors.senderContactPhone}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

