import React, { useState, useEffect } from 'react'
import {
  Settings,
  Server,
  Building,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  Radio
} from 'lucide-react'
import { closeSettingsWindow, getSystemConfig, getSystemStatus, saveSystemConfig } from '@/features/system/api/systemApi'

export const SettingsWindow = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)
  const [testResult, setTestResult] = useState(null)

  const [form, setForm] = useState({
    api_url: '',
    poll_url: '',
    data_url: '',
    branch_code: 'A01',
    fiscal_year: '2026',
    client_mode: 'winform',
    app_name: 'ERPSYS',
    ws_name: ''
  })

  const [erpStatus, setErpStatus] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setStatusMsg(null)
    try {
      const [cfgRes, statusRes] = await Promise.all([
        getSystemConfig().catch(() => null),
        getSystemStatus().catch(() => null)
      ])

      if (cfgRes && cfgRes.ok) {
        const cfg = await cfgRes.json()
        if (cfg.success) {
          setForm({
            api_url: cfg.api_url || '',
            poll_url: cfg.poll_url || '',
            data_url: cfg.data_url || '',
            branch_code: cfg.branch_code || 'A01',
            fiscal_year: cfg.fiscal_year || '2026',
            client_mode: cfg.client_mode || 'winform',
            app_name: cfg.app_name || 'ERPSYS',
            ws_name: cfg.ws_name || ''
          })
        }
      }

      if (statusRes && statusRes.ok) {
        const stat = await statusRes.json()
        if (stat.success) {
          setErpStatus(stat)
        }
      }
    } catch (e) {
      console.error('Lỗi khi tải cấu hình:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    setStatusMsg(null)
    try {
      const res = await saveSystemConfig(form)
      const json = await res.json()
      if (json.success) {
        setStatusMsg({ type: 'success', text: 'Đã lưu cấu hình kết nối hệ thống thành công!' })
        loadData()
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Lỗi khi lưu cấu hình' })
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Không kết nối được dịch vụ' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await getSystemStatus()
      const json = await res.json()
      if (json.success) {
        setErpStatus(json)
        setTestResult({
          success: true,
          text: json.is_token_valid 
            ? `Kết nối tốt! Token hợp lệ (còn ${Math.round(json.expires_in / 60)} phút)` 
            : 'Đã kết nối dịch vụ. Chưa có Token hợp lệ.'
        })
      } else {
        setTestResult({ success: false, text: 'Không kiểm tra được dịch vụ ERP.' })
      }
    } catch (err) {
      setTestResult({ success: false, text: 'Lỗi: ' + err.message })
    } finally {
      setTesting(false)
    }
  }

  const handleClose = () => {
    closeSettingsWindow().catch(() => {})
    window.close()
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-slate-800 font-sans text-xs select-none">
      {/* Header Bar */}
      <div className="flex h-8 items-center justify-between border-b border-slate-200 px-3 shrink-0">
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-slate-900">
          <Settings size={13} />
          <span>ERPSYS — Cài Đặt Hệ Thống & Kết Nối</span>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            title="Tải lại cấu hình"
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 transition cursor-pointer rounded-none"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={handleClose}
            title="Đóng cửa sổ"
            className="flex h-7 w-7 items-center justify-center text-slate-400 hover:bg-rose-600 hover:text-white transition cursor-pointer rounded-none"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex h-40 flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw size={16} className="animate-spin text-slate-600" />
            <span className="text-xs">Đang tải thông số cấu hình...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            {/* Box 1: Bravo API Gateway */}
            <div className="border border-slate-200 bg-white p-2.5">
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] uppercase tracking-wide">
                  <Server size={12} />
                  <span>Cổng Kết Nối Bravo API Gateway</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 transition cursor-pointer rounded-none"
                >
                  <Radio size={10} className={testing ? 'animate-pulse' : ''} />
                  <span>{testing ? 'Đang thử...' : 'Kiểm tra'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Địa chỉ API Gateway (Auth & Settle Endpoint)
                  </label>
                  <input
                    type="text"
                    value={form.api_url}
                    onChange={(e) => setForm(prev => ({ ...prev, api_url: e.target.value }))}
                    placeholder="https://bravo.goldsunpackaging.vn:5051/..."
                    className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-none outline-none focus:border-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Endpoint Lệnh Sản Xuất (Data URL)
                    </label>
                    <input
                      type="text"
                      value={form.data_url}
                      onChange={(e) => setForm(prev => ({ ...prev, data_url: e.target.value }))}
                      placeholder="/4e9b7232116b4a4af1b990d81e00a049"
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-none outline-none focus:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Endpoint Kiểm Tra Trạng Thái (Poll URL)
                    </label>
                    <input
                      type="text"
                      value={form.poll_url}
                      onChange={(e) => setForm(prev => ({ ...prev, poll_url: e.target.value }))}
                      placeholder="/api/status"
                      className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded-none outline-none focus:border-slate-800"
                    />
                  </div>
                </div>

                {testResult && (
                  <div className={`p-1.5 text-[11px] flex items-center gap-1 border ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {testResult.success ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    <span>{testResult.text}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Ngữ Cảnh Doanh Nghiệp */}
            <div className="border border-slate-200 bg-white p-2.5">
              <div className="mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1.5 text-slate-900 font-bold text-[11px] uppercase tracking-wide">
                <Building size={12} />
                <span>Ngữ Cảnh Doanh Nghiệp (ERP Scope)</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Mã Đơn Vị / Chi Nhánh
                  </label>
                  <input
                    type="text"
                    value={form.branch_code}
                    onChange={(e) => setForm(prev => ({ ...prev, branch_code: e.target.value.toUpperCase() }))}
                    placeholder="A01"
                    className="w-full px-2 py-1 text-xs font-mono font-bold uppercase border border-slate-300 rounded-none outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Niên Độ Kế Toán
                  </label>
                  <input
                    type="text"
                    value={form.fiscal_year}
                    onChange={(e) => setForm(prev => ({ ...prev, fiscal_year: e.target.value }))}
                    placeholder="2026"
                    className="w-full px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded-none outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Chế Độ Máy Trạm
                  </label>
                  <select
                    value={form.client_mode}
                    onChange={(e) => setForm(prev => ({ ...prev, client_mode: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-none outline-none focus:border-slate-800 bg-white"
                  >
                    <option value="winform">Winform (B10.10.9.1.1)</option>
                    <option value="web">Web Browser (Bravo Web)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Box 3: Trạng Thái Phiên */}
            <div className="border border-slate-200 bg-white p-2.5">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-1.5 bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Tài khoản:</span>
                  <span className="font-bold text-slate-900 font-mono text-[11px]">
                    {erpStatus?.username || '(Chưa đăng nhập)'}
                  </span>
                </div>
                <div className="p-1.5 bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Token ERP:</span>
                  <span className={`text-[10px] font-bold ${erpStatus?.is_token_valid ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {erpStatus?.is_token_valid ? `Hợp lệ (còn ${Math.round((erpStatus?.expires_in || 0) / 60)}p)` : 'Chưa đăng nhập'}
                  </span>
                </div>
              </div>
            </div>

            {statusMsg && (
              <div className={`p-1.5 text-xs flex items-center gap-1.5 border ${
                statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {statusMsg.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex h-9 items-center justify-end gap-2 border-t border-slate-200 bg-white px-3 shrink-0">
        <button
          type="button"
          onClick={handleClose}
          className="px-3 py-1 text-xs border border-slate-300 hover:bg-slate-100 text-slate-700 transition cursor-pointer rounded-none"
        >
          Đóng
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-1 px-4 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50 cursor-pointer rounded-none"
        >
          {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
          <span>{saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
        </button>
      </div>
    </div>
  )
}

export default SettingsWindow
