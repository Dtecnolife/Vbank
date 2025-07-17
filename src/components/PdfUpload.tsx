'use client';

import { useState, useCallback } from 'react';
import { Upload, File, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface PdfUploadProps {
  onUploadSuccess?: () => void;
}

export default function PdfUpload({ onUploadSuccess }: PdfUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.includes('pdf')) {
      setMessage({
        text: 'Sadece PDF dosyaları kabul edilir',
        type: 'error'
      });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          text: result.message || `${result.recordsInserted} kayıt başarıyla eklendi`,
          type: 'success'
        });
        onUploadSuccess?.();
      } else {
        let errorMessage = result.error || 'Upload failed';
        
        if (result.duplicate) {
          errorMessage = `⚠️ ${result.error}`;
          setMessage({
            text: errorMessage,
            type: 'warning'
          });
        } else if (result.duplicates > 0) {
          errorMessage = `ℹ️ ${result.message} (${result.duplicates} duplicate atlandı)`;
          setMessage({
            text: errorMessage,
            type: 'info'
          });
        } else {
          setMessage({
            text: errorMessage,
            type: 'error'
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({
        text: 'Bağlantı hatası oluştu',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type.includes('pdf'));
    
    if (pdfFile) {
      handleFileUpload(pdfFile);
    } else {
      setMessage({
        text: 'PDF dosyası bulunamadı',
        type: 'error'
      });
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);



  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info': return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default: return null;
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            {uploading ? (
              <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
            ) : (
              <Upload className="h-12 w-12 text-gray-400" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              PDF Dosyası Yükle
            </h3>
            <p className="text-gray-600">
              Finansal dökümanınızı sürükleyip bırakın veya dosya seçin
            </p>
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              <File className="h-4 w-4 mr-2" />
              Dosya Seç
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
            
            <p className="text-sm text-gray-500">
              Sadece PDF dosyaları desteklenir (Maks. 10MB)
            </p>
          </div>
        </div>
      </div>



      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg border flex items-start space-x-3 ${getMessageColor(message.type)}`}>
          {getMessageIcon(message.type)}
          <div className="flex-1">
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        </div>
      )}

      {/* Upload Status */}
      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
            <div>
              <p className="text-sm font-medium text-blue-800">PDF işleniyor...</p>
              <p className="text-xs text-blue-600">
                Dosya yükleniyor ve finansal veriler çıkarılıyor
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 