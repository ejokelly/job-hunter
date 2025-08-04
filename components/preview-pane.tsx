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
  actionButton?: React.ReactNode;
}

export default function PreviewPane({ 
  title, 
  html, 
  onDownload, 
  onRegenerate, 
  isRegenerating = false,
  isDownloading = false,
  isLoading = false,
  loadingText = 'Generating...',
  actionButton
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
    <div className={`theme-card rounded-lg overflow-hidden transition-opacity duration-300 ${isRegenerating ? 'opacity-50' : 'opacity-100'} relative`}>
      <div className="theme-bg-tertiary px-4 py-1 border-b theme-border-light flex justify-between items-center">
        {actionButton && (
          <div className="flex-1">
            {actionButton}
          </div>
        )}
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
                  font-size: 11px;
                  line-height: 1.3;
                }
                h1, h2, h3, h4, h5, h6 { 
                  font-size: 14px; 
                  margin: 8px 0 4px 0;
                  font-weight: 600;
                }
                h1 { font-size: 16px; margin-bottom: 6px; }
                h2 { font-size: 14px; }
                h3 { font-size: 12px; }
                p, li, div { 
                  font-size: 11px; 
                  margin: 2px 0;
                }
                .text-sm { font-size: 10px !important; }
                .text-xs { font-size: 9px !important; }
                .text-lg { font-size: 12px !important; }
                .text-xl { font-size: 14px !important; }
                .text-2xl { font-size: 16px !important; }
                .text-3xl { font-size: 18px !important; }
                ul, ol { margin: 4px 0; padding-left: 16px; }
                li { margin: 1px 0; }
                .mb-1 { margin-bottom: 2px !important; }
                .mb-2 { margin-bottom: 4px !important; }
                .mb-3 { margin-bottom: 6px !important; }
                .mb-4 { margin-bottom: 8px !important; }
                .mt-1 { margin-top: 2px !important; }
                .mt-2 { margin-top: 4px !important; }
                .mt-3 { margin-top: 6px !important; }
                .mt-4 { margin-top: 8px !important; }
                .py-1 { padding-top: 2px !important; padding-bottom: 2px !important; }
                .py-2 { padding-top: 4px !important; padding-bottom: 4px !important; }
                .px-1 { padding-left: 2px !important; padding-right: 2px !important; }
                .px-2 { padding-left: 4px !important; padding-right: 4px !important; }
              </style>
            </head>
            <body>
              ${html || ''}
            </body>
          </html>
        `}
        className="w-full aspect-[8.5/11] border-0"
        title={`${title} Preview`}
      />
      
      {/* Download overlay */}
      {isDownloading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="theme-card p-6 rounded-lg text-center">
            <div className="flex justify-center space-x-2 mb-4">
              <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent-color)' }}></div>
              <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent-color)', animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent-color)', animationDelay: '0.2s' }}></div>
            </div>
            <p className="theme-text-primary font-medium">Preparing your download</p>
            <p className="theme-text-secondary text-sm mt-1">Give us a few seconds...</p>
          </div>
        </div>
      )}
    </div>
  );
}