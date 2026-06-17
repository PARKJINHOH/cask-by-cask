import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './shared/utils/i18n'

// 리다이렉션 진행 여부를 판별하여 렌더링 차단 (UI Flash 방지)
const isRedirecting = !window.location.pathname.startsWith('/api/') && 
                     window.location.pathname !== '/oauth/callback' && 
                     !window.location.pathname.split('/').pop()?.includes('.') &&
                     !/^\/(ko|en)(\/|$)/.test(window.location.pathname);

if (!isRedirecting) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
