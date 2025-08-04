import IconButton from './icon-button';
import RegenerateButton from './regenerate-button';

interface PreviewPaneProps {
  title: string;
  html?: string;
  onDownload: () => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  isDownloading?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

export default function PreviewPane({ 
  title, 
  html, 
  onDownload, 
  onRegenerate, 
  isRegenerating = false,
  isDownloading = false,
  isLoading = false,
  loadingText = 'Generating...'
}: PreviewPaneProps) {
  if (isLoading) {
    return (
      <div className="theme-card rounded-lg overflow-hidden">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="flex justify-center space-x-2 mb-6">
              <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="theme-text-tertiary text-lg">{loadingText}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`theme-card rounded-lg overflow-hidden transition-opacity duration-300 ${isRegenerating ? 'opacity-50' : 'opacity-100'}`}>
      <div className="theme-bg-tertiary px-4 py-1 border-b theme-border-light flex justify-end items-center">
        <div className="flex gap-1">
          <IconButton onClick={onDownload} busy={isDownloading} disabled={isRegenerating}>
            ⬇
          </IconButton>
          <RegenerateButton 
            onClick={onRegenerate} 
            isRegenerating={isRegenerating} 
            disabled={isDownloading} 
          />
        </div>
      </div>
      <iframe
        srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${title} Preview</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                body { 
                  font-family: 'Inter', sans-serif; 
                  margin: 0; 
                  padding: 0;
                  background: white;
                }
              </style>
            </head>
            <body>
              ${html || ''}
            </body>
          </html>
        `}
        className="w-full h-[800px] border-0"
        title={`${title} Preview`}
      />
    </div>
  );
}