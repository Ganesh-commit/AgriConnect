import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aiService } from '../../services/api';
import {
  ArrowLeft,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  Leaf,
  FlaskConical,
  ShieldCheck,
  History,
  Loader2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const confidenceBadge = {
  high: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-red-100 text-red-800 border-red-200'
};

export default function FarmerDiseaseCheck() {
  const [cropName, setCropName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await aiService.getDiseaseHistory();
      setHistory(res.data?.data?.reports || []);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please upload or capture a leaf/plant photo first.');
      return;
    }

    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('image', selectedFile);
      if (cropName.trim()) {
        formData.append('cropName', cropName.trim());
      }

      const res = await aiService.checkDisease(formData);
      const report = res.data?.data?.report;
      setCurrentReport(report);
      toast.success('Leaf health analysis complete!');
      loadHistory();
    } catch (err) {
      toast.error(err.message || 'Could not analyze plant image');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/farmer/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Farmer Dashboard</span>
        </Link>

        {/* Kisan Call Centre Help Button */}
        <a
          href="tel:18001801551"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs shadow-sm transition-colors"
        >
          <PhoneCall size={15} />
          <span>Kisan Call Centre: 1800-180-1551</span>
        </a>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            AI Plant Vision
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Crop Leaf & Disease Check
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload or capture a clear photo of an affected leaf or stem to receive structured symptom & remedy suggestions.
          </p>
        </div>
      </div>

      {/* Mandatory Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
        <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="font-extrabold">
            AI suggestion only. Consult your local Agriculture Officer / Rythu Bharosa Kendra for confirmation.
          </p>
          <p className="text-amber-800 mt-0.5">
            AI replies are suggestions and may be imperfect. Always verify chemical dosages and waiting periods with an authorized extension officer or call 1800-180-1551.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload & Capture Form */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleAnalyze}
            className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5"
          >
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Camera size={18} className="text-emerald-700" />
              <span>1. Capture or Upload Plant Photo</span>
            </h2>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Crop Name (Optional)
              </label>
              <input
                type="text"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="e.g. Tomato, Chilli, Paddy, Cotton"
                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            {!previewUrl ? (
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/70 text-center space-y-4">
                <Leaf size={36} className="text-emerald-600 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Select a close-up photo of the leaf or plant
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    JPEG, PNG, or WEBP • Max 5MB
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs">
                    <Camera size={15} />
                    <span>Take Photo (Camera)</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                    <Upload size={15} />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3">
                <img
                  src={previewUrl}
                  alt="Selected leaf"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl('');
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={analyzing || !selectedFile}
              className="w-full py-3.5 px-5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-md shadow-emerald-700/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {analyzing ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>Analyzing Leaf Image...</span>
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  <span>Analyze Crop Health</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Diagnosis Result Card */}
        <div className="lg:col-span-7 space-y-6">
          {currentReport ? (
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Identified Crop: {currentReport.cropGuess}
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                    {currentReport.likelyIssue}
                  </h2>
                  {currentReport.provider && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Provider: {currentReport.provider} ({currentReport.model})
                    </p>
                  )}
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                    confidenceBadge[currentReport.confidence] || confidenceBadge.medium
                  }`}
                >
                  Confidence: {currentReport.confidence}
                </span>
              </div>

              {/* Symptoms */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Leaf size={15} className="text-emerald-600" />
                  <span>Observed Symptoms</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-5">
                  {currentReport.symptoms?.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Remedies Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-700" />
                    <span>Organic & Cultural Remedies</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-emerald-950 list-disc pl-4">
                    {currentReport.organicRemedies?.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <FlaskConical size={15} className="text-blue-700" />
                    <span>Chemical Extension Options</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-blue-950 list-disc pl-4">
                    {currentReport.chemicalRemedies?.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Prevention Tips */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  <span>Prevention & Field Management Tips</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-5">
                  {currentReport.preventionTips?.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              {/* When to Consult Expert */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                <p className="text-xs font-extrabold text-amber-900">
                  When to Consult an Expert:
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {currentReport.whenToConsultExpert}
                </p>
                <p className="text-[11px] font-bold text-amber-900 pt-1">
                  Disclaimer: AI suggestion only. Consult your local Agriculture Officer / Rythu Bharosa Kendra for confirmation.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <Leaf size={28} />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">
                Upload a Leaf Photo to Start Diagnosis
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Take a well-lit photo showing both healthy and affected parts of the leaf. You can also click any past report below to view its details.
              </p>
            </div>
          )}

          {/* Past Reports History */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <History size={17} className="text-emerald-700" />
              <span>Past Disease Check Reports ({history.length})</span>
            </h3>

            {loadingHistory ? (
              <p className="text-xs text-slate-400 py-4">Loading past reports...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">
                No past disease reports yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => setCurrentReport(item)}
                    className="w-full py-3 px-2 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between text-left"
                  >
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">
                        {item.cropGuess}: {item.likelyIssue}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()} • Confidence: {item.confidence}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">View →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

