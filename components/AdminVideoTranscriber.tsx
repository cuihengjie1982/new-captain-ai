import React, { useState, useRef, useEffect } from 'react';
import { tingWuService, VideoTranscriptionResult, VideoTranscriptSegment } from '../services/tingwuService';
import {
  Upload, FileVideo, Clock, Download, Copy, Check, Loader2,
  Play, Pause, SkipForward, SkipBack, Volume2, Brain, FileText,
  AlertCircle, X, Zap
} from 'lucide-react';

interface AdminVideoTranscriberProps {
  onTranscriptGenerated?: (transcript: string) => void;
  onClose?: () => void;
  initialVideoUrl?: string;
}

const AdminVideoTranscriber: React.FC<AdminVideoTranscriberProps> = ({
  onTranscriptGenerated,
  onClose,
  initialVideoUrl
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionResult, setTranscriptionResult] = useState<VideoTranscriptionResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl || '');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 配置听悟服务
  useEffect(() => {
    tingWuService.config.onConnectionStatus = (status, message) => {
      console.log('转写状态:', status, message);
      if (status === 'error') {
        setIsTranscribing(false);
      }
    };

    tingWuService.config.onVideoProgress = (progressValue) => {
      setProgress(progressValue);
    };

    tingWuService.config.onError = (error) => {
      console.error('转写错误:', error);
      setIsTranscribing(false);
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert('请选择视频文件');
        return;
      }

      if (file.size > 2 * 1024 * 1024 * 1024) {
        alert('视频文件大小不能超过2GB');
        return;
      }

      setSelectedFile(file);
      setTranscriptionResult(null);

      // 创建视频URL用于预览
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;

    setIsTranscribing(true);
    setProgress(0);

    try {
      const result = await tingWuService.transcribeVideoFile(selectedFile);
      setTranscriptionResult(result);

      // 将转写结果转换为课程所需的格式
      if (result.success && result.transcript.length > 0) {
        const transcriptText = result.transcript
          .map(segment => `${Math.floor(segment.start_time)} | ${segment.text}`)
          .join('\n');
        onTranscriptGenerated?.(transcriptText);
      }
    } catch (error) {
      console.error('转写失败:', error);
      alert('视频转写失败，请稍后重试');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSegmentClick = (segment: VideoTranscriptSegment) => {
    seekTo(segment.start_time);
    if (!isPlaying) {
      togglePlayPause();
    }
  };

  const copyToClipboard = (format: 'text' | 'srt' | 'vtt') => {
    if (!transcriptionResult) return;

    let content = '';
    switch (format) {
      case 'text':
        content = transcriptionResult.transcript.map(s => s.text).join(' ');
        break;
      case 'srt':
        content = tingWuService.generateSRTSubtitles(transcriptionResult.transcript);
        break;
      case 'vtt':
        content = tingWuService.generateVTTSubtitles(transcriptionResult.transcript);
        break;
    }

    navigator.clipboard.writeText(content).then(() => {
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    });
  };

  const downloadFile = (format: 'text' | 'srt' | 'vtt') => {
    if (!transcriptionResult || !selectedFile) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'text':
        content = transcriptionResult.transcript.map(s => s.text).join(' ');
        filename = `${selectedFile.name.split('.')[0]}_transcript.txt`;
        mimeType = 'text/plain';
        break;
      case 'srt':
        content = tingWuService.generateSRTSubtitles(transcriptionResult.transcript);
        filename = `${selectedFile.name.split('.')[0]}_subtitles.srt`;
        mimeType = 'text/plain';
        break;
      case 'vtt':
        content = tingWuService.generateVTTSubtitles(transcriptionResult.transcript);
        filename = `${selectedFile.name.split('.')[0]}_subtitles.vtt`;
        mimeType = 'text/vtt';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getCurrentSegment = () => {
    if (!transcriptionResult) return null;
    return transcriptionResult.transcript.find(
      segment => currentTime >= segment.start_time && currentTime <= segment.end_time
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">AI视频逐字稿生成器</h3>
            <p className="text-sm text-slate-500">使用阿里云通义听悟技术生成精确时间戳</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：上传和视频预览 */}
        <div className="space-y-4">
          {/* 文件上传区域 */}
          {!selectedFile && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors bg-slate-50">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-4 font-medium">上传视频文件生成逐字稿</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 mx-auto"
              >
                <FileVideo className="w-4 h-4" />
                选择视频文件
              </button>
              <p className="text-xs text-slate-500 mt-3">
                支持：MP4, AVI, MOV, WMV（最大2GB）
              </p>
            </div>
          )}

          {/* 文件信息和转写控制 */}
          {selectedFile && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-800 flex items-center gap-2">
                    <FileVideo className="w-4 h-4" />
                    {selectedFile.name}
                  </h4>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setTranscriptionResult(null);
                      setProgress(0);
                      setVideoUrl('');
                    }}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-600">
                  大小：{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  {duration > 0 && ` • 时长：${formatTime(duration)}`}
                </p>
              </div>

              {/* 转写进度 */}
              {isTranscribing && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {progress < 50 ? '上传中...' : progress < 100 ? 'AI转写中...' : '完成'}
                    </span>
                    <span className="text-sm text-blue-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 转写按钮 */}
              {!isTranscribing && !transcriptionResult && (
                <button
                  onClick={handleTranscribe}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg"
                >
                  <Zap className="w-4 h-4" />
                  开始AI智能转写
                </button>
              )}

              {/* 视频预览 */}
              {videoUrl && (
                <div className="bg-slate-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full max-h-64 object-contain"
                    onTimeUpdate={handleVideoTimeUpdate}
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    controls
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧：转写结果 */}
        <div className="space-y-4">
          {transcriptionResult && transcriptionResult.success && (
            <>
              {/* 统计信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-800 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium text-sm">转写成功</span>
                  </div>
                  <p className="text-xs text-green-600">
                    {transcriptionResult.transcript.length} 条字幕
                    {transcriptionResult.total_duration && ` • ${formatTime(transcriptionResult.total_duration)}`}
                  </p>
                </div>
                {transcriptionResult.summary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-800 mb-1">
                      <Brain className="w-4 h-4" />
                      <span className="font-medium text-sm">AI摘要</span>
                    </div>
                    <p className="text-xs text-blue-600 line-clamp-2">
                      {transcriptionResult.summary}
                    </p>
                  </div>
                )}
              </div>

              {/* 导出选项 */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => downloadFile('text')}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                >
                  <Download className="w-3 h-3" />
                  下载文本
                </button>
                <button
                  onClick={() => downloadFile('srt')}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
                >
                  <Download className="w-3 h-3" />
                  下载SRT
                </button>
                <button
                  onClick={() => downloadFile('vtt')}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2"
                >
                  <Download className="w-3 h-3" />
                  下载VTT
                </button>
                <button
                  onClick={() => copyToClipboard('text')}
                  className="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm flex items-center gap-2"
                >
                  {copiedFormat === 'text' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  复制文本
                </button>
              </div>

              {/* 逐字稿预览 */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h4 className="font-medium text-slate-800 text-sm">逐字稿预览（点击可跳转播放）</h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {transcriptionResult.transcript.slice(0, 10).map((segment, index) => (
                    <div
                      key={index}
                      onClick={() => handleSegmentClick(segment)}
                      className="px-3 py-2 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-slate-500 font-mono mt-0.5 flex-shrink-0">
                          {tingWuService.formatTimestamp(segment.start_time)}
                        </span>
                        <div className="flex-1">
                          <span className="text-sm text-slate-700">
                            {segment.speaker && <span className="font-medium text-blue-600">{segment.speaker}: </span>}
                            {segment.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {transcriptionResult.transcript.length > 10 && (
                    <div className="px-3 py-2 text-center text-sm text-slate-500 bg-slate-50">
                      ... 还有 {transcriptionResult.transcript.length - 10} 条字幕
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 转写失败 */}
          {transcriptionResult && !transcriptionResult.success && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 mb-1">转写失败</h4>
                  <p className="text-sm text-red-600">{transcriptionResult.error}</p>
                  <button
                    onClick={() => setTranscriptionResult(null)}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    重新尝试
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 空状态 */}
          {!selectedFile && !transcriptionResult && (
            <div className="text-center py-8 text-slate-400">
              <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">请上传视频文件开始智能转写</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVideoTranscriber;