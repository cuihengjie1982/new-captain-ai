import React, { useState, useRef, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import {
  Image,
  Video,
  FileAudio,
  FileText,
  X,
  Upload,
  Link,
  Bold,
  Italic,
  Code,
  List,
  Quote,
  Eye,
  Maximize2
} from 'lucide-react';

interface CommunityRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  preview?: boolean;
  enablePreview?: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  size: number;
  uploadTime: string;
}

const CommunityRichTextEditor: React.FC<CommunityRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '在这里输入您的内容...',
  height = 400,
  preview = true,
  enablePreview = true
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 模拟文件上传函数
  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);

    try {
      const newFiles: UploadedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 模拟上传延迟
        await new Promise(resolve => setTimeout(resolve, 500));

        // 根据文件类型确定分类
        let fileType: UploadedFile['type'];
        if (file.type.startsWith('image/')) {
          fileType = 'image';
        } else if (file.type.startsWith('video/')) {
          fileType = 'video';
        } else if (file.type.startsWith('audio/')) {
          fileType = 'audio';
        } else {
          fileType = 'document';
        }

        // 创建模拟URL（实际项目中这里应该是真实的上传URL）
        const mockUrl = URL.createObjectURL(file);

        const uploadedFile: UploadedFile = {
          id: `${Date.now()}_${i}`,
          name: file.name,
          type: fileType,
          url: mockUrl,
          size: file.size,
          uploadTime: new Date().toLocaleString('zh-CN')
        };

        newFiles.push(uploadedFile);
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);

      // 自动插入文件链接到编辑器
      const fileLinks = newFiles.map(file => {
        const fileName = file.name;
        switch (file.type) {
          case 'image':
            return `![${fileName}](${file.url})`;
          case 'video':
            return `[📹 ${fileName}](${file.url})`;
          case 'audio':
            return `[🎵 ${fileName}](${file.url})`;
          default:
            return `[📄 ${fileName}](${file.url})`;
        }
      }).join('\n\n');

      onChange(value ? `${value}\n\n${fileLinks}` : fileLinks);

    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  }, [value, onChange]);

  // 处理文件选择
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // 清空input值，允许重复选择相同文件
    event.target.value = '';
  }, [handleFileUpload]);

  // 删除已上传文件
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // 获取文件图标
  const getFileIcon = (type: UploadedFile['type']) => {
    switch (type) {
      case 'image':
        return <Image size={16} />;
      case 'video':
        return <Video size={16} />;
      case 'audio':
        return <FileAudio size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 自定义工具栏按钮
  const customCommands = [
    {
      name: 'image-upload',
      buttonProps: {
        'aria-label': 'Insert image',
        title: 'Insert image',
        children: <Image size={16} />
      },
      execute: () => {
        fileInputRef.current?.click();
      }
    },
    {
      name: 'link',
      buttonProps: {
        'aria-label': 'Insert link',
        title: 'Insert link',
        children: <Link size={16} />
      },
      execute: () => {
        const url = prompt('请输入链接地址:');
        if (url) {
          const text = prompt('请输入链接文本:');
          const linkText = text || url;
          onChange(value ? `${value}\n[${linkText}](${url})` : `[${linkText}](${url})`);
        }
      }
    }
  ];

  // 基础工具栏配置
  const toolbarCommands = [
    'bold',
    'italic',
    'divider',
    'title',
    'divider',
    'link',
    'image-upload',
    'divider',
    'quote',
    'code',
    'divider',
    'unordered-list',
    'ordered-list',
    'divider',
    'preview'
  ];

  return (
    <div className="space-y-4">
      {/* 文件上传区域 */}
      <div className="border border-gray-300 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">附件管理</h4>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  上传中...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  上传文件
                </>
              )}
            </button>
          </div>
        </div>

        {/* 已上传文件列表 */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">已上传文件：</div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="text-gray-500">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {file.uploadTime}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="删除文件"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 支持的文件类型说明 */}
        <div className="text-xs text-gray-500">
          支持格式：图片 (JPG, PNG, GIF)、视频 (MP4, AVI)、音频 (MP3, WAV)、文档 (PDF, DOC, TXT)
        </div>
      </div>

      {/* Markdown 编辑器 */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <MDEditor
          value={value}
          onChange={onChange}
          height={height}
          preview={preview}
          enableScrollContainer
          data-color-mode="light"
          toolbarCommands={toolbarCommands}
          textareaProps={{
            placeholder,
            className: 'min-h-[300px]'
          }}
        />
      </div>

      {/* 编辑器帮助提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
          <Eye size={16} />
          编辑器使用提示
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>• 支持Markdown语法，包括标题、列表、代码块等</div>
          <div>• 使用工具栏快速格式化文本</div>
          <div>• 点击图片按钮或拖拽文件到编辑器中上传附件</div>
          <div>• 支持实时预览，切换预览模式查看最终效果</div>
        </div>
      </div>
    </div>
  );
};

export default CommunityRichTextEditor;