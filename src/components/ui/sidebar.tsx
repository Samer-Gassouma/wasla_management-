import { cn } from '@/lib/utils'
import UpdateStatus from '../UpdateStatus'

interface SidebarProps {
  activeTab: 'statistics' | 'queue' | 'staff' | 'vehicles'
  onTabChange: (tab: 'statistics' | 'queue' | 'staff' | 'vehicles') => void
  onLogout: () => void
  isSupervisor: boolean
  userName?: string
  userRole?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const menuItems = [
  { id: 'queue' as const, label: 'Gestion Queue', availableFor: ['SUPERVISOR', 'WORKER'] },
  { id: 'vehicles' as const, label: 'Véhicules', availableFor: ['SUPERVISOR', 'WORKER'] },
  { id: 'statistics' as const, label: 'Statistiques', availableFor: ['SUPERVISOR'] },
  { id: 'staff' as const, label: 'Personnel', availableFor: ['SUPERVISOR'] },
]

export function Sidebar({ 
  activeTab, 
  onTabChange, 
  onLogout, 
  isSupervisor,
  userName,
  userRole,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const filteredItems = menuItems.filter(item => 
    item.availableFor.includes(userRole as 'SUPERVISOR' | 'WORKER' || 'WORKER')
  )

  return (
    <div className={cn(
      "flex flex-col h-screen bg-sidebar-background text-sidebar-foreground transition-all duration-300 border-r border-sidebar-border",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden bg-sidebar-primary">
              <img 
                src="icons/logo.png" 
                alt="Wasla" 
                className="h-full w-full object-contain"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = '<span class="text-lg font-bold text-sidebar-primary-foreground">W</span>'
                  }
                }}
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Wasla</h1>
              <p className="text-xs text-sidebar-foreground/70">Management</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex items-center justify-center w-full">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg  overflow-hidden">
              <img 
                src="icons/logo.png" 
                alt="Wasla" 
                className="h-full w-full object-contain"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = '<span class="text-lg font-bold text-sidebar-primary-foreground">W</span>'
                  }
                }}
              />
            </div>
          </div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-xs"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? '>' : '<'}
          </button>
        )}
      </div>

      {/* User Info */}
      {!isCollapsed && userName && (
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-sidebar-accent">
              <span className="text-sm font-medium">
                {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                {isSupervisor ? 'Superviseur' : 'Employé'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
        {filteredItems.map((item) => {
          const isActive = activeTab === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg" 
                  : "text-sidebar-foreground/80"
              )}
            >
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {isCollapsed && (
                <span className="text-xs font-medium">{item.label.charAt(0)}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {/* Update Status */}
        <div className={cn(
          "flex items-center justify-center",
          isCollapsed ? "px-1" : "px-2"
        )}>
          <UpdateStatus compact={isCollapsed} />
        </div>
        
        {/* Disconnect Button */}
        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "text-sidebar-foreground/80 hover:bg-destructive hover:text-destructive-foreground"
          )}
        >
          {!isCollapsed && <span className="text-sm font-medium">Déconnexion</span>}
          {isCollapsed && <span className="text-xs font-medium">X</span>}
        </button>
      </div>
    </div>
  )
}

