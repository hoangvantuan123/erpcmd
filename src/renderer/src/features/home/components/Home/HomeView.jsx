import React, { useCallback, useEffect, useState } from 'react'
import { Activity, AlertCircle, ArrowRight, CheckCircle2, Database, Factory, History, RefreshCw } from 'lucide-react'
import { getSystemStatus } from '@/features/system/api/systemApi'

const workspaces = [
  {
    id: 'settle-process',
    title: 'Quyết toán lệnh công đoạn',
    description: 'Xem danh sách lệnh sản xuất, theo dõi tiến độ và thực hiện quyết toán.',
    icon: Factory
  },
  {
    id: 'settle-step',
    title: 'Quyết toán lệnh thao tác',
    description: 'Tra cứu các thao tác theo số lệnh công đoạn.',
    icon: Activity
  },
  {
    id: 'settle-logs',
    title: 'Nhật ký API',
    description: 'Xem phản hồi và lịch sử yêu cầu tới Bravo ERP Gateway.',
    icon: History
  }
]

export const HomeView = ({ onSelectItem }) => {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getSystemStatus()
      if (!response.ok) throw new Error(`Máy chủ phản hồi HTTP ${response.status}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Không lấy được trạng thái hệ thống.')
      setStatus(data)
    } catch (err) {
      setError(err.message || 'Không thể kết nối tới dịch vụ cục bộ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const isConnected = Boolean(status?.is_token_valid)
  const tokenMinutes = Math.max(0, Math.ceil((status?.expires_in || 0) / 60))

  return (
    <div className="home-overview h-full w-full overflow-y-auto custom-scrollbar select-none">
      <header className="home-page-header">
        <div>
          <div className="home-eyebrow">ERPSYN · ERP / MES</div>
          <h1 className="home-title">Tổng quan hệ thống</h1>
          <p className="home-subtitle">Trạng thái kết nối và truy cập các nghiệp vụ sản xuất.</p>
        </div>
        <div className="home-header-actions">
          <span className={`home-status-badge ${loading ? 'is-loading' : isConnected ? 'is-success' : 'is-warning'}`} role="status">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : isConnected ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {loading ? 'Đang kiểm tra kết nối' : isConnected ? 'Đã kết nối ERP' : 'Chưa có phiên ERP'}
          </span>
          <button className="home-refresh-button" type="button" onClick={fetchStatus} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="home-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <section className="home-metrics" aria-label="Thông tin phiên ERP">
        <div className="home-metric">
          <span className="home-label">Tài khoản ERP</span>
          <strong className="home-metric-value">{loading && !status ? 'Đang tải…' : status?.username || '—'}</strong>
        </div>
        <div className="home-metric">
          <span className="home-label">Chi nhánh</span>
          <strong className="home-metric-value home-mono">{loading && !status ? '—' : status?.branch_code || '—'}</strong>
        </div>
        <div className="home-metric">
          <span className="home-label">Năm tài chính</span>
          <strong className="home-metric-value home-mono">{loading && !status ? '—' : status?.fiscal_year || '—'}</strong>
        </div>
        <div className="home-metric">
          <span className="home-label">Phiên đăng nhập</span>
          <strong className={`home-metric-value ${isConnected ? 'home-success-text' : 'home-muted-value'}`}>
            {loading && !status ? 'Đang kiểm tra' : isConnected ? `Còn ${tokenMinutes} phút` : 'Cần đăng nhập'}
          </strong>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-workspaces-title">
        <div className="home-section-header">
          <div>
            <h2 id="home-workspaces-title">Nghiệp vụ sản xuất</h2>
            <p>Chọn khu vực cần làm việc.</p>
          </div>
          <span className="home-section-meta">3 phân hệ</span>
        </div>
        <div className="home-workspaces">
          {workspaces.map(({ id, title, description, icon: Icon }, index) => (
            <button key={id} type="button" className="home-workspace" onClick={() => onSelectItem?.(id)}>
              <span className="home-workspace-index">0{index + 1}</span>
              <Icon className="home-workspace-icon" size={19} strokeWidth={1.8} />
              <span className="home-workspace-copy">
                <strong>{title}</strong>
                <span>{description}</span>
              </span>
              <ArrowRight className="home-workspace-arrow" size={16} />
            </button>
          ))}
        </div>
      </section>

      <section className="home-connection" aria-labelledby="home-connection-title">
        <div className="home-connection-heading">
          <span className="home-connection-icon"><Database size={17} /></span>
          <div>
            <h2 id="home-connection-title">Kết nối hệ thống</h2>
            <p>Thông tin lấy trực tiếp từ dịch vụ cục bộ của ERPSYN.</p>
          </div>
        </div>
        <dl className="home-connection-details">
          <div>
            <dt>Gateway</dt>
            <dd className="home-mono">127.0.0.1:5184/api</dd>
          </div>
          <div>
            <dt>Chế độ client</dt>
            <dd>{status?.client_mode || '—'}</dd>
          </div>
          <div>
            <dt>Trạng thái token</dt>
            <dd className={isConnected ? 'home-success-text' : 'home-muted-value'}>
              {loading && !status ? 'Đang kiểm tra' : isConnected ? 'Hợp lệ' : 'Không hợp lệ hoặc chưa đăng nhập'}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

export default HomeView
