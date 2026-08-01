import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  stack: string | null;
}

// Catches render errors so a single component bug shows a recovery screen
// instead of a blank window (Electron windows have no browser chrome to reload).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, stack: null };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('Renderer error caught by boundary:', error);
    console.error('Component stack:', info?.componentStack || '');
    this.setState({ stack: info?.componentStack || null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex items-center justify-center h-screen bg-background p-6" dir="rtl">
        <div className="pixel-card px-8 py-10 text-center" style={{ minWidth: 360, maxWidth: 480 }}>
          <div className="font-arabic text-primary text-base font-bold mb-3">
            حدث خطأ غير متوقع
          </div>
          <p className="text-muted-foreground text-xs mb-6 leading-relaxed">
            تعذر عرض هذه الشاشة. يمكنك إعادة تحميل التطبيق — بياناتك المكتبة المحفوظة
            (العلامات والملاحظات والسجل) في أمان تام.
          </p>
          {this.state.stack && (
            <pre
              dir="ltr"
              style={{
                textAlign: 'left',
                fontSize: 10,
                lineHeight: 1.5,
                maxHeight: 160,
                overflow: 'auto',
                background: 'rgba(0,0,0,0.35)',
                borderRadius: 8,
                padding: 8,
                margin: '0 0 16px',
                color: '#9db3a8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.stack}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-opacity"
          >
            إعادة تحميل التطبيق
          </button>
        </div>
      </div>
    );
  }
}
