import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  onClose: () => void
  onConfirm?: () => void
  confirmLabel?: string
  confirmDanger?: boolean
  children: React.ReactNode
  wide?: boolean
}

export default function Modal({ title, onClose, onConfirm, confirmLabel = 'Create', confirmDanger, children, wide }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={wide ? { width: 760 } : {}}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#545b64' }}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {onConfirm && (
          <div className="modal-footer">
            <button onClick={onClose} className="btn-aws-secondary">Cancel</button>
            <button onClick={onConfirm} className={confirmDanger ? 'btn-aws-danger' : 'btn-aws-primary'}>{confirmLabel}</button>
          </div>
        )}
      </div>
    </div>
  )
}
