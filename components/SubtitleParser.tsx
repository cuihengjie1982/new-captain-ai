import React, { useState, useRef } from 'react';
import {
  Upload, FileVideo, FileText, Loader2, Download,
  CheckCircle, AlertCircle, X, Wand2, Settings,
  Play, Clock, Volume2
} from 'lucide-react';
import {
  parseVideoWithAI,
  generateTranscriptFromSubtitleFile,
  generateTranscriptSummary,
  exportTranscript,
  formatTime,
  SubtitleParseOptions,
  SubtitleParseResult
} from '../services/subtitleService';
import { TranscriptLine } from '../types';

interface SubtitleParserProps {
  onTranscriptGenerated: (transcript: TranscriptLine[], summary?: string) => void;
  onClose: () => void;
}

const SubtitleParser: React.FC<SubtitleParserProps> = ({
  onTranscriptGenerated,
  onClose
}) => {
  const [activeMode, setActiveMode] = useState<'video' | 'subtitle'>('video');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [parseResult, setParseResult] = useState<SubtitleParseResult | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  // 解析选项
  const [options, setOptions] = useState<SubtitleParseOptions>({
    language: 'zh',
    format: 'auto',
    enableTimestamps: true,
    enableSpeakerDiarization: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleSubtitleFileUpload = async (file: File) => {
    if (!file) return;

    // 检查文件类型
    const validTypes = ['.srt', '.vtt', '.ass', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(fileExtension)) {
      setParseResult({
        success: false,
        error: `不支持的文件格式: ${fileExtension}。支持的格式: ${validTypes.join(', ')}`
      });
      return;
    }

    setSubtitleFile(file);
    setIsProcessing(true);
    setProcessingStatus('正在解析字幕文件...');

    try {
      const result = await generateTranscriptFromSubtitleFile(file, options);
      setParseResult(result);

      if (result.success && result.transcript) {
        // 生成摘要
        setProcessingStatus('正在生成摘要...');
        const summary = await generateTranscriptSummary(result.transcript);

        setProcessingStatus('');
        onTranscriptGenerated(result.transcript, summary);
      } else {
        setProcessingStatus('');
      }
    } catch (error) {
      setParseResult({
        success: false,
        error: error instanceof Error ? error.message : '解析失败'
      });
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoFileUpload = async (file: File) => {
    if (!file) return;

    // 检查文件类型和大小
    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'];
    const maxSize = 500 * 1024 * 1024; // 500MB

    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|avi|mov|wmv|flv)$/i)) {
      setParseResult({
        success: false,
        error: '不支持的文件格式。支持的格式: MP4, AVI, MOV, WMV, FLV'
      });
      return;
    }

    if (file.size > maxSize) {
      setParseResult({
        success: false,
        error: `文件过大 (${Math.round(file.size / 1024 / 1024)}MB)。最大支持: 500MB`
      });
      return;
    }

    setVideoFile(file);
    setIsProcessing(true);
    setProcessingStatus('正在上传视频并生成逐字稿...');

    try {
      const result = await parseVideoWithAI(file, options);
      setParseResult(result);

      if (result.success && result.transcript) {
        // 生成摘要
        setProcessingStatus('正在生成摘要...');
        const summary = await generateTranscriptSummary(result.transcript);

        setProcessingStatus('');
        onTranscriptGenerated(result.transcript, summary);
      } else {
        setProcessingStatus('');
      }
    } catch (error) {
      setParseResult({
        success: false,
        error: error instanceof Error ? error.message : 'AI解析失败'
      });
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (format: 'srt' | 'vtt' | 'txt') => {
    if (!parseResult?.transcript) return;

    const content = exportTranscript(parseResult.transcript, format);
    const blob = new Blob([content], {
      type: 'text/plain;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1024 / 1024) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Wand2 size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">AI 逐字稿生成器</h2>
                <p className="text-sm text-slate-500">使用 AI 解析视频或字幕文件，生成精确的逐字稿</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Mode Selection */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveMode('video')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                activeMode === 'video'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <FileVideo size={24} className="mb-2 mx-auto" />
              <div className="font-medium">视频文件</div>
              <div className="text-xs opacity-75">AI 直接解析视频</div>
            </button>

            <button
              onClick={() => setActiveMode('subtitle')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                activeMode === 'subtitle'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <FileText size={24} className="mb-2 mx-auto" />
              <div className="font-medium">字幕文件</div>
              <div className="text-xs opacity-75">解析 SRT/VTT 等</div>
            </button>
          </div>

          {/* Options */}
          <div className="mb-6">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-3"
            >
              <Settings size={16} />
              解析设置
              <span className={`ml-1 transition-transform ${showOptions ? 'rotate-90' : ''}`}>›</span>
            </button>

            {showOptions && (
              <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">语言</label>
                  <select
                    value={options.language}
                    onChange={(e) => setOptions({...options, language: e.target.value as 'zh' | 'en' | 'auto'})}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="auto">自动检测</option>
                    <option value="zh">中文</option>
                    <option value="en">英文</option>
                  </select>
                </div>

                {activeMode === 'subtitle' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">字幕格式</label>
                    <select
                      value={options.format}
                      onChange={(e) => setOptions({...options, format: e.target.value as 'srt' | 'vtt' | 'ass' | 'auto'})}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    >
                      <option value="auto">自动检测</option>
                      <option value="srt">SRT</option>
                      <option value="vtt">VTT</option>
                      <option value="ass">ASS</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.enableTimestamps}
                      onChange={(e) => setOptions({...options, enableTimestamps: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">AI 增强时间戳</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.enableSpeakerDiarization}
                      onChange={(e) => setOptions({...options, enableSpeakerDiarization: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">说话人识别</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* File Upload Area */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            {activeMode === 'video' ? (
              <>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => e.target.files?.[0] && handleVideoFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <FileVideo size={48} className="mx-auto mb-4 text-slate-400" />
                <div className="text-lg font-medium text-slate-700 mb-2">上传视频文件</div>
                <div className="text-sm text-slate-500 mb-4">
                  支持 MP4, AVI, MOV, WMV, FLV 格式<br/>
                  最大文件大小: 500MB
                </div>
                <button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {videoFile ? '重新选择' : '选择文件'}
                </button>
              </>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".srt,.vtt,.ass,.txt"
                  onChange={(e) => e.target.files?.[0] && handleSubtitleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <FileText size={48} className="mx-auto mb-4 text-slate-400" />
                <div className="text-lg font-medium text-slate-700 mb-2">上传字幕文件</div>
                <div className="text-sm text-slate-500 mb-4">
                  支持 SRT, VTT, ASS, TXT 格式
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {subtitleFile ? '重新选择' : '选择文件'}
                </button>
              </>
            )}
          </div>

          {/* File Info */}
          {(videoFile || subtitleFile) && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  {activeMode === 'video' ? <FileVideo size={20} className="text-blue-600" /> : <FileText size={20} className="text-blue-600" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 truncate">
                    {(videoFile || subtitleFile)?.name}
                  </div>
                  <div className="text-sm text-slate-500">
                    {formatFileSize((videoFile || subtitleFile)?.size || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="text-blue-600 animate-spin" />
                <div>
                  <div className="font-medium text-blue-900">处理中</div>
                  <div className="text-sm text-blue-700">{processingStatus}</div>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {parseResult && !isProcessing && (
            <div className={`mt-6 p-4 rounded-lg ${
              parseResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-start gap-3">
                {parseResult.success ? (
                  <CheckCircle size={20} className="text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className={`font-medium mb-1 ${
                    parseResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {parseResult.success ? '解析成功' : '解析失败'}
                  </div>

                  {parseResult.success && parseResult.transcript && (
                    <div className="text-sm text-green-700 mb-3">
                      成功解析 {parseResult.transcript.length} 条字幕记录
                      {parseResult.processingTime && `，耗时 ${parseResult.processingTime}ms`}
                      {parseResult.confidence && `，置信度 ${Math.round(parseResult.confidence * 100)}%`}
                    </div>
                  )}

                  {parseResult.error && (
                    <div className="text-sm text-red-700">{parseResult.error}</div>
                  )}

                  {/* Download Options */}
                  {parseResult.success && parseResult.transcript && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleDownload('txt')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <Download size={14} /> TXT
                      </button>
                      <button
                        onClick={() => handleDownload('srt')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <Download size={14} /> SRT
                      </button>
                      <button
                        onClick={() => handleDownload('vtt')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <Download size={14} /> VTT
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {parseResult?.success && parseResult.transcript && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-slate-500" />
                <div className="text-sm font-medium text-slate-700">预览 (前5条)</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                {parseResult.transcript.slice(0, 5).map((line, index) => (
                  <div key={index} className="flex gap-3 text-sm mb-2 last:mb-0">
                    <span className="text-blue-600 font-mono text-xs">
                      [{formatTime(line.time)}]
                    </span>
                    <span className="text-slate-700 flex-1">{line.text}</span>
                  </div>
                ))}
                {parseResult.transcript.length > 5 && (
                  <div className="text-sm text-slate-500 italic text-center pt-2">
                    ... 还有 {parseResult.transcript.length - 5} 条记录
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubtitleParser;