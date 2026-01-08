'use client';

import { FileText, Database, ArrowRight, Copy, ChevronDown, ChevronRight, CheckCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

interface Cassette {
  id: string;
  serialNumber: string;
  cassetteType?: {
    typeCode?: string;
  };
  customerBank?: {
    bankName?: string;
  };
}

interface CassetteDetails {
  errorCode: string;
  wsid: string;
  affectedComponents: string;
  expanded: boolean;
}

interface TicketDetailsStepProps {
  selectedCassettes: Cassette[];
  title: string;
  description: string;
  priority: string;
  cassetteDetails: Record<string, CassetteDetails>;
  fieldErrors: Record<string, string>;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onCassetteDetailChange: (cassetteId: string, field: string, value: string) => void;
  onToggleCassetteExpanded: (cassetteId: string) => void;
  onApplyDetailsToAll: () => void;
  onFieldBlur: (field: string, value: string) => void;
  onBack: () => void;
  onProceedToStep3: () => void;
  canProceedToStep3: boolean;
}

export default function TicketDetailsStep({
  selectedCassettes,
  title,
  description,
  priority,
  cassetteDetails,
  fieldErrors,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  onCassetteDetailChange,
  onToggleCassetteExpanded,
  onApplyDetailsToAll,
  onFieldBlur,
  onBack,
  onProceedToStep3,
  canProceedToStep3,
}: TicketDetailsStepProps) {
  return (
    <Card className="border-2 border-teal-500 dark:border-teal-600 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle>Detail Masalah</CardTitle>
            <CardDescription>
              {selectedCassettes.length > 1
                ? `Isi detail umum dan spesifik untuk ${selectedCassettes.length} kaset`
                : 'Jelaskan masalah yang ditemukan pada kaset'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Common Fields Section */}
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">Detail Umum (Untuk Semua Kaset)</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                Judul Masalah <span className="text-red-600 dark:text-red-400 font-bold">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Contoh: Kaset macet di Slot 1"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onBlur={(e) => onFieldBlur('title', e.target.value)}
                required
                className={`text-lg h-12 bg-white dark:bg-slate-700 border-2 ${
                  fieldErrors.title
                    ? 'border-red-500 dark:border-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500'
                } text-gray-900 dark:text-slate-100`}
                aria-invalid={fieldErrors.title ? 'true' : 'false'}
              />
              {fieldErrors.title && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {fieldErrors.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                Deskripsi Detail <span className="text-red-600 dark:text-red-400 font-bold">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Jelaskan masalah secara detail. Sertakan informasi seperti kode error, gejala, slot yang bermasalah, dll."
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                onBlur={(e) => onFieldBlur('description', e.target.value)}
                required
                rows={4}
                className={`text-base bg-white dark:bg-slate-700 border-2 ${
                  fieldErrors.description
                    ? 'border-red-500 dark:border-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-500'
                } text-gray-900 dark:text-slate-100`}
                aria-invalid={fieldErrors.description ? 'true' : 'false'}
              />
              {fieldErrors.description && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-base font-semibold text-gray-900 dark:text-slate-100">
                Prioritas
              </Label>
              <Select value={priority} onValueChange={onPriorityChange}>
                <SelectTrigger
                  id="priority"
                  className="h-12 bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">🟢 Rendah</SelectItem>
                  <SelectItem value="MEDIUM">🟡 Sedang</SelectItem>
                  <SelectItem value="HIGH">🟠 Tinggi</SelectItem>
                  <SelectItem value="CRITICAL">🔴 Kritis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Individual Cassette Details Section */}
        {selectedCassettes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">Detail Spesifik Per Kaset (Opsional)</h3>
              </div>
              {selectedCassettes.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={onApplyDetailsToAll} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Kaset 1 ke Semua
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {selectedCassettes.map((cassette, index) => {
                const details = cassetteDetails[cassette.id] || {
                  errorCode: '',
                  wsid: '',
                  affectedComponents: '',
                  expanded: false,
                };
                const isExpanded = details.expanded;
                const hasDetails = details.errorCode || details.wsid || details.affectedComponents;

                return (
                  <div
                    key={cassette.id}
                    className={`border-2 rounded-lg overflow-hidden transition-all ${
                      isExpanded ? 'border-teal-500 dark:border-teal-600' : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    {/* Header */}
                    <button
                      type="button"
                      onClick={() => onToggleCassetteExpanded(cassette.id)}
                      className="w-full p-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-primary" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                        )}
                        <div className="text-left">
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            Kaset {index + 1}: {cassette.serialNumber}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">
                            {cassette.cassetteType?.typeCode} • {cassette.customerBank?.bankName}
                          </p>
                        </div>
                      </div>
                      {hasDetails && (
                        <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded font-medium">
                          <CheckCheck className="h-3 w-3" />
                          Detail terisi
                        </span>
                      )}
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div 
                        className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t dark:border-slate-700 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor={`errorCode-${cassette.id}`}
                              className="font-semibold text-gray-900 dark:text-slate-100"
                            >
                              Kode Error
                            </Label>
                            <Input
                              id={`errorCode-${cassette.id}`}
                              placeholder="Contoh: E101, E202"
                              value={details.errorCode}
                              onChange={(e) => onCassetteDetailChange(cassette.id, 'errorCode', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              className="bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor={`wsid-${cassette.id}`}
                              className="font-semibold text-gray-900 dark:text-slate-100"
                            >
                              WSID Mesin
                            </Label>
                            <Input
                              id={`wsid-${cassette.id}`}
                              placeholder="Contoh: WS-BNI-JKT-001"
                              value={details.wsid}
                              onChange={(e) => onCassetteDetailChange(cassette.id, 'wsid', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              className="font-mono bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor={`components-${cassette.id}`}
                            className="font-semibold text-gray-900 dark:text-slate-100"
                          >
                            Komponen Terpengaruh
                          </Label>
                          <Input
                            id={`components-${cassette.id}`}
                            placeholder="Contoh: Kaset RB-1, Sensor Unit (pisahkan dengan koma)"
                            value={details.affectedComponents}
                            onChange={(e) =>
                              onCassetteDetailChange(cassette.id, 'affectedComponents', e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Tip: Isi detail kaset pertama, lalu klik &quot;Copy Kaset 1 ke Semua&quot; untuk mempercepat
              pengisian
            </p>
          </div>
        )}

        <div className="pt-4 flex justify-between gap-4">
          <Button type="button" variant="outline" size="lg" onClick={onBack} className="min-w-[150px]">
            Kembali
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={onProceedToStep3}
            disabled={!canProceedToStep3}
            className="min-w-[200px]"
          >
            Lanjut ke Pengiriman
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

