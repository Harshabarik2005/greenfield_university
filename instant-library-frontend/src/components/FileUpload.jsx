// FileUpload – light Figma-matched theme, preserves all S3 upload logic
import { useState, useRef } from 'react';

export default function FileUpload({ label, accept, onUploadComplete, onUploadStateChange, apiBaseUrl, token }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [uploadedName, setUploadedName] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const isImage = accept?.startsWith('image');

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file); setError(''); setUploadProgress(0); setUploadedName('');
        if (file.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(file));
        else setPreviewUrl('');
        await handleUpload(file);
    };

    const handleUpload = async (fileToUpload) => {
        setIsUploading(true);
        if (onUploadStateChange) onUploadStateChange(true);
        setError('');
        try {
            const res = await fetch(`${apiBaseUrl}/upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fileName: `${Date.now()}-${fileToUpload.name}`, fileType: fileToUpload.type }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to get upload URL'); }
            const { uploadUrl, fileUrl } = await res.json();

            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl, true);
                xhr.setRequestHeader('Content-Type', fileToUpload.type);
                xhr.upload.onprogress = (ev) => {
                    if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
                };
                xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(fileToUpload);
            });

            onUploadComplete(fileUrl);
            setUploadedName(fileToUpload.name);
        } catch (err) {
            console.error('Upload Error:', err);
            setError(err.message);
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
            if (onUploadStateChange) onUploadStateChange(false);
        }
    };

    const reset = () => {
        setSelectedFile(null); setPreviewUrl(''); setUploadProgress(0);
        setUploadedName(''); setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const isSuccess = uploadProgress === 100 && !isUploading && uploadedName;

    return (
        <div className="border border-zinc-200 rounded-xl p-3.5 bg-white flex flex-col gap-3">
            {/* Header */}
            <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-600">
                    {isImage ? '🖼' : '📄'} {label}
                </span>
                {selectedFile && !isUploading && (
                    <button
                        type="button" onClick={reset}
                        className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Drop zone */}
            <label className={`upload-zone ${isUploading ? 'uploading' : ''} ${isSuccess ? 'success' : ''}`}
                style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}>
                <input
                    type="file" accept={accept}
                    onChange={handleFileSelect} ref={fileInputRef}
                    disabled={isUploading}
                    className="hidden"
                />

                {previewUrl && (
                    <img src={previewUrl} alt="Preview"
                        className="w-16 h-16 object-cover rounded-lg mx-auto mb-2" />
                )}

                {isSuccess ? (
                    <>
                        <p className="text-xl mb-1">✅</p>
                        <p className="text-xs font-semibold text-green-700 truncate max-w-[160px] mx-auto">{uploadedName}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Uploaded successfully</p>
                    </>
                ) : isUploading ? (
                    <>
                        <div className="spinner w-6 h-6 mx-auto mb-2" />
                        <p className="text-xs text-zinc-600">Uploading… {uploadProgress}%</p>
                    </>
                ) : (
                    <>
                        <p className="text-2xl mb-1.5 opacity-30">{isImage ? '🖼' : '📄'}</p>
                        <p className="text-xs font-semibold text-zinc-500">Click to browse</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{accept}</p>
                    </>
                )}
            </label>

            {/* Progress bar */}
            {isUploading && (
                <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
            )}

            {/* Error */}
            {error && (
                <p className="text-xs text-red-600 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                    ⚠ {error}
                </p>
            )}
        </div>
    );
}
