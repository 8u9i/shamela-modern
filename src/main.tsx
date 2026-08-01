import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/globals.css'

const root = document.getElementById('root')!

// window.api is injected by the Electron preload (contextBridge). If this page
// is opened in a plain browser — e.g. pointing a tab at the Vite dev server at
// http://localhost:5173 — the bridge is missing, so render a clear notice
// instead of letting every IPC call throw into the error boundary.
if (typeof window.api === 'undefined') {
  ReactDOM.createRoot(root).render(
    <div style={{ minHeight: '100vh', background: '#07130e', color: '#e5efe9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }} dir="rtl">
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
          لا يمكن تشغيل هذه الصفحة في المتصفح
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#9db3a8', margin: 0 }}>
          واجهة المكتبة الشاملة تعمل داخل تطبيق سطح المكتب (Electron) فقط.
          <br />
          أغلق هذه التبويبة وشغّل التطبيق عبر <span dir="ltr">npm run dev</span> أو من الاختصار المثبّت.
        </p>
      </div>
    </div>,
  )
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
