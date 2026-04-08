import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDefects } from '../api/defects';
import { analyzeDefects, previewCsv, bulkInsert, type AnalysisResult, type CsvPreviewResult } from '../api/ai';
import { useAuth } from '../context/AuthContext';

export default function AIAnalysis() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canWrite = user?.role === 'admin' || user?.role === 'supervisor';

  const { data: defects = [] } = useQuery({ queryKey: ['defects'], queryFn: getDefects });

  // Analysis state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  // CSV state
  const [csvPreview, setCsvPreview] = useState<CsvPreviewResult | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');
  const [csvError, setCsvError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAnalyze() {
    if (!defects.length) return;
    setAnalyzing(true);
    setAnalyzeError('');
    setAnalysis(null);
    try {
      const result = await analyzeDefects(defects);
      setAnalysis(result);
    } catch {
      setAnalyzeError('Failed to reach AI service. Make sure it is running.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvPreview(null);
    setCsvError('');
    setImportSuccess('');
    setPreviewing(true);
    try {
      const preview = await previewCsv(file);
      setCsvPreview(preview);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setCsvError(msg ?? 'Failed to parse CSV.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    if (!csvPreview) return;
    setImporting(true);
    setCsvError('');
    try {
      const result = await bulkInsert(csvPreview.preview);
      setImportSuccess(`Successfully imported ${result.inserted} defects.`);
      setCsvPreview(null);
      setCsvFile(null);
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['defects'] });
    } catch {
      setCsvError('Import failed. Check that your CSV has the required columns.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">AI Analysis</h1>
        <p className="text-gray-500 text-sm mt-0.5">Pattern detection and CSV import powered by Claude</p>
      </div>

      {/* Analysis Panel */}
      <section className="mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-100">Defect Pattern Analysis</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Analyzes all {defects.length} logged defects and surfaces risk patterns
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || defects.length === 0}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
            >
              {analyzing ? 'Analyzing…' : 'Run Analysis'}
            </button>
          </div>

          {defects.length === 0 && (
            <p className="text-sm text-gray-600">No defects logged yet. Add some from the Defect Log first.</p>
          )}

          {analyzeError && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {analyzeError}
            </p>
          )}

          {analyzing && (
            <div className="flex items-center gap-3 text-sm text-gray-400 mt-2">
              <span className="animate-pulse">Sending defects to AI service…</span>
            </div>
          )}

          {analysis && (
            <div className="mt-4 space-y-5">
              {/* Summary */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Summary</p>
                <p className="text-sm text-gray-200 leading-relaxed">{analysis.summary}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Risk Areas */}
                <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-4">
                  <p className="text-xs text-red-400 uppercase tracking-wide mb-3">Risk Areas</p>
                  <ul className="space-y-2">
                    {analysis.risk_areas.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-red-500 mt-0.5 shrink-0">▲</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="bg-green-950/20 border border-green-900/40 rounded-lg p-4">
                  <p className="text-xs text-green-400 uppercase tracking-wide mb-3">Recommendations</p>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CSV Import */}
      {canWrite && (
        <section>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-100 mb-1">CSV Import</h2>
            <p className="text-sm text-gray-500 mb-5">
              Upload a spreadsheet with columns: <code className="text-gray-400 bg-gray-800 px-1 rounded">title</code>,{' '}
              <code className="text-gray-400 bg-gray-800 px-1 rounded">description</code>,{' '}
              <code className="text-gray-400 bg-gray-800 px-1 rounded">severity</code>,{' '}
              <code className="text-gray-400 bg-gray-800 px-1 rounded">status</code>
            </p>

            {/* Drop zone */}
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-blue-600 transition-colors bg-gray-800/30">
              <span className="text-sm text-gray-500">
                {csvFile ? csvFile.name : 'Click to upload a CSV file'}
              </span>
              <span className="text-xs text-gray-600 mt-1">.csv files only</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {previewing && (
              <p className="text-sm text-gray-500 mt-3 animate-pulse">Parsing CSV…</p>
            )}

            {csvError && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2 mt-3">
                {csvError}
              </p>
            )}

            {importSuccess && (
              <p className="text-sm text-green-400 bg-green-950/40 border border-green-900 rounded-lg px-3 py-2 mt-3">
                {importSuccess}
              </p>
            )}

            {csvPreview && (
              <div className="mt-5">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
                  Preview — {csvPreview.imported} rows detected (showing first 5)
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-500">
                        <th className="text-left px-3 py-2">Title</th>
                        <th className="text-left px-3 py-2">Description</th>
                        <th className="text-left px-3 py-2">Severity</th>
                        <th className="text-left px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.preview.map((row, i) => (
                        <tr key={i} className="border-b border-gray-800/50 last:border-0">
                          <td className="px-3 py-2 text-gray-300 max-w-xs truncate">{row.title}</td>
                          <td className="px-3 py-2 text-gray-400 max-w-xs truncate">{row.description}</td>
                          <td className="px-3 py-2 text-gray-400 capitalize">{row.severity}</td>
                          <td className="px-3 py-2 text-gray-400 capitalize">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="mt-4 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {importing ? 'Importing…' : `Import ${csvPreview.imported} defects`}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
