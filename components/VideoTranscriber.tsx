import React, { useState, useRef } from 'react';
import { tingWuService, VideoTranscriptionResult, VideoTranscriptSegment } from '../services/tingwuService';
import {
  Upload, FileVideo, Clock, Download, Copy, Check, Loader2,
  Play, Pause, SkipForward, SkipBack, Volume2, Maximize2
} from 'lucide-react';

interface VideoTranscriberProps {
  onTranscriptionComplete?: (result: VideoTranscriptionResult) => void;
  className?: string;
}

const VideoTranscriber: React.FC<VideoTranscriberProps> = ({
  onTranscriptionComplete,
  className = ''
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionResult, setTranscriptionResult] = useState<VideoTranscriptionResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 配置听悟服务
  React.useEffect(() => {
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
      // 验证文件类型
      if (!file.type.startsWith('video/')) {
        alert('请选择视频文件');
        return;
      }

      // 验证文件大小 (最大2GB)
      if (file.size > 2 * 1024 * 1024 * 1024) {
        alert('视频文件大小不能超过2GB');
        return;
      }

      setSelectedFile(file);
      setTranscriptionResult(null);

      // 加载视频信息
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        setDuration(video.duration);
        URL.revokeObjectURL(video.src);
      };
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;

    setIsTranscribing(true);
    setProgress(0);

    try {
      const result = await tingWuService.transcribeVideoFile(selectedFile);
      setTranscriptionResult(result);
      onTranscriptionComplete?.(result);
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
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <FileVideo className="text-blue-600" />
          视频逐字稿生成器
        </h2>
        <p className="text-slate-600">
          上传视频文件，使用阿里云通义听悟生成带时间戳的精确逐字稿
        </p>
      </div>

      {/* 文件上传区域 */}
      {!selectedFile && (
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">点击或拖拽上传视频文件</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            选择视频文件
          </button>
          <p className="text-xs text-slate-500 mt-2">
            支持格式：MP4, AVI, MOV, WMV（最大2GB）
          </p>
        </div>
      )}

      {/* 文件信息和转写控制 */}
      {selectedFile && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-slate-800 flex items-center gap-2">
                <FileVideo className="w-4 h-4" />
                {selectedFile.name}
              </h3>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setTranscriptionResult(null);
                  setProgress(0);
                }}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600">
              大小：{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              {duration > 0 && ` • 时长：${formatTime(duration)}`}
            </p>
          </div>

          {/* 转写进度 */}
          {isTranscribing && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  {progress < 50 ? '上传中...' : progress < 100 ? '转写中...' : '完成'}
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
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Loader2 className="w-4 h-4" />
              开始转写视频
            </button>
          )}
        </div>
      )}

      {/* 转写结果 */}
      {transcriptionResult && transcriptionResult.success && (
        <div className="space-y-6">
          {/* 视频播放器 */}
          <div className="bg-slate-900 rounded-lg p-4">
            <video
              ref={videoRef}
              src={URL.createObjectURL(selectedFile!)}
              className="w-full rounded-lg"
              onTimeUpdate={handleVideoTimeUpdate}
              onLoadedMetadata={handleVideoLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* 播放控制栏 */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayPause}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => seekTo(Math.max(0, currentTime - 5))}
                  className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={() => seekTo(Math.min(duration, currentTime + 5))}
                  className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <div className="flex-1 bg-slate-700 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white">{formatTime(currentTime)}</span>
                    <span className="text-slate-400">{formatTime(duration)}</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-1 mt-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          {transcriptionResult.summary && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">内容摘要</h4>
              <p className="text-sm text-green-700">{transcriptionResult.summary}</p>
            </div>
          )}

          {/* 下载和复制选项 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadFile('text')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载文本稿
            </button>

            <button
              onClick={() => downloadFile('srt')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载SRT字幕
            </button>

            <button
              onClick={() => downloadFile('vtt')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载VTT字幕
            </button>

            <button
              onClick={() => copyToClipboard('text')}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm flex items-center gap-2"
            >
              {copiedFormat === 'text' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              复制文本
            </button>
          </div>

          {/* 逐字稿内容 */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <h4 className="font-medium text-slate-800">逐字稿（点击段落可跳转播放）</h4>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {transcriptionResult.transcript.map((segment, index) => {
                const isCurrentSegment = getCurrentSegment()?.start_time === segment.start_time;
                return (
                  <div
                    key={index}
                    onClick={() => handleSegmentClick(segment)}
                    className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors ${
                      isCurrentSegment ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-slate-500 font-mono mt-1 flex-shrink-0">
                        {tingWuService.formatTimestamp(segment.start_time)}
                      </span>
                      <div className="flex-1">
                        <span className="text-sm text-slate-700">
                          {segment.speaker && <span className="font-medium text-blue-600">{segment.speaker}: </span>}
                          {segment.text}
                        </span>
                      </div>
                      {isCurrentSegment && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 转写失败 */}
      {transcriptionResult && !transcriptionResult.success && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-800 mb-2">转写失败</h4>
          <p className="text-sm text-red-600">{transcriptionResult.error}</p>
          <button
            onClick={() => setTranscriptionResult(null)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            重新尝试
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoTranscriber;