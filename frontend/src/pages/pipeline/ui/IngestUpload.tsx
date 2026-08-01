import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { uploadPipelineFile } from '@/features/pipeline/api/pipelineApi';
import { useToast } from '@/shared/ui/Toast';

export function IngestUpload({ onUploadComplete }: { onUploadComplete: (data: { file_path: string, adapter_id: string, ingest_limit: number }) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<{ file_path: string, adapter: string, preview: any[], total_rows: number } | null>(null);
  const [ingestLimit, setIngestLimit] = useState<string>("400");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setPreviewData(null);
    try {
      const data = await uploadPipelineFile(file);
      setPreviewData(data);
      setIngestLimit(data.total_rows ? Math.min(400, data.total_rows).toString() : "400");
      showToast('success', 'File analyzed successfully.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmUpload = () => {
    if (previewData) {
      const limitInt = parseInt(ingestLimit, 10);
      onUploadComplete({ file_path: previewData.file_path, adapter_id: previewData.adapter, ingest_limit: isNaN(limitInt) ? 0 : limitInt });
    }
  };

  if (previewData) {
    return (
      <Card className="p-0 overflow-hidden">
        <div className="bg-surface-raised px-5 py-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-positive w-icon h-icon" />
            <h3 className="text-h3 text-text-primary">File ready for ingestion</h3>
          </div>
          <span className="text-small text-text-muted font-data">Format: {previewData.adapter} • {previewData.total_rows} total rows</span>
        </div>
        
        {previewData.preview && previewData.preview.length > 0 ? (
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-small text-text-secondary">Previewing first {previewData.preview.length} rows</p>
              <div className="flex items-center gap-3">
                <label className="text-small text-text-secondary">Limit ingestion to:</label>
                <input 
                  type="text" 
                  className="w-24 bg-surface border border-border rounded-control px-2 py-1 text-small text-text-primary focus:border-accent outline-none text-center"
                  value={ingestLimit}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setIngestLimit(val);
                  }}
                  placeholder="All"
                />
                <span className="text-small text-text-muted">samples</span>
              </div>
            </div>
            <div className="overflow-x-auto rounded-control border border-border">
              <table className="w-full text-left text-small">
                <thead className="bg-surface-raised border-b border-border text-text-muted uppercase font-medium">
                  <tr>
                    <th className="px-4 py-2">Ticker</th>
                    <th className="px-4 py-2">Headline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewData.preview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-hover">
                      <td className="px-4 py-2 font-data text-text-primary whitespace-nowrap">{row.ticker || <span className="text-text-muted italic">none</span>}</td>
                      <td className="px-4 py-2 text-text-secondary max-w-md truncate" title={row.headline}>{row.headline || <span className="text-text-muted italic">none</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-5 flex items-center gap-2 text-warning">
            <AlertCircle className="w-icon h-icon" />
            <span className="text-small">Could not preview rows. Proceed with caution.</span>
          </div>
        )}

        <div className="p-5 bg-surface border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPreviewData(null)}>Cancel</Button>
          <Button variant="primary" onClick={confirmUpload}>Continue with this file</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center transition-colors hover:bg-surface-hover">
      <UploadCloud className="w-8 h-8 text-accent mb-4" />
      <h3 className="text-h3 text-text-primary">Upload news data</h3>
      <p className="text-body text-text-secondary max-w-md mt-2">
        Upload a JSON or CSV file containing corporate news events. We'll automatically detect the format and match tickers to the graph.
      </p>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json,.jsonl,.csv"
      />
      
      <Button 
        variant="primary" 
        className="mt-6"
        isLoading={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        Select File
      </Button>
    </Card>
  );
}
