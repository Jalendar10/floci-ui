import { NavLink } from 'react-router-dom'

interface NavItem { label: string; path: string }

interface Props {
  serviceName: string
  serviceIcon?: string
  navItems: NavItem[]
  children: React.ReactNode
}

export default function ServiceLayout({ serviceName, navItems, children }: Props) {
  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 84px)' }}>
      {/* Left sidebar */}
      <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #e9ebed', flexShrink: 0, paddingTop: 8 }}>
        <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #e9ebed', marginBottom: 4 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#16191f' }}>{serviceName}</p>
        </div>
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path}
            style={({ isActive }) => ({
              display: 'block', padding: '8px 20px', fontSize: 13, textDecoration: 'none',
              color: isActive ? '#ec7211' : '#16191f',
              background: isActive ? '#fef9f4' : 'none',
              borderLeft: isActive ? '3px solid #ec7211' : '3px solid transparent',
              fontWeight: isActive ? 700 : 400,
            })}>
            {item.label}
          </NavLink>
        ))}
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
