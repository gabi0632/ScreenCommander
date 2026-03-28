import { useRef, useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { api } from '../../lib/api';

interface ImageInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageInput({ value, onChange, label = 'כתובת תמונה (אופציונלי)' }: ImageInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await api.uploadImage(file);
      onChange(result.url);
    } catch {
      // Upload failed silently
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Input
            label={label}
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... או העלה קובץ"
            ltr
          />
        </div>
        <Button
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ marginBottom: 1 }}
        >
          {uploading ? 'מעלה...' : 'העלה'}
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {value && (
        <div style={{ marginTop: 8, position: 'relative' }}>
          <img
            src={value.startsWith('/') ? value : value}
            alt="תצוגה מקדימה"
            style={{
              maxWidth: '100%',
              maxHeight: 120,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              objectFit: 'contain',
              background: 'var(--bg-input)',
            }}
          />
          <button
            onClick={() => onChange('')}
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              background: 'var(--red)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 20,
              height: 20,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            x
          </button>
        </div>
      )}
    </div>
  );
}
