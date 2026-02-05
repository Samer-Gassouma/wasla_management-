import React, { useState } from 'react'
import { Sidebar } from './ui/sidebar'
import { cn } from '@/lib/utils'
import UpdateStatus from './UpdateStatus'

interface LayoutProps {
  children: React.ReactNode
  activeTab: 'statistics' | 'queue' | 'staff' | 'vehicles'
  onTabChange: (tab: 'statistics' | 'queue' | 'staff' | 'vehicles') => void
  onLogout: () => void
  isSupervisor: boolean
  userName?: string
  userRole?: string
}

export default function Layout({
  children,
  activeTab,
  onTabChange,
  onLogout,
  isSupervisor,
  userName,
  userRole
}: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  // Show sidebar for all users (supervisors and workers)
  const showSidebar = true

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {showSidebar && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          onLogout={onLogout}
          isSupervisor={isSupervisor}
          userName={userName}
          userRole={userRole}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}
      <main className={cn(
        "flex-1 overflow-y-auto transition-all duration-300",
        "bg-gradient-to-br from-background via-background to-muted/20",
        !showSidebar && "w-full"
      )}>
        {/* Top bar with logo and logout for workers */}
        {!showSidebar && (
          <div className="sticky top-0 z-10 bg-background border-b border-border shadow-sm">
            <div className="container mx-auto px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="icons/logo.png" 
                  alt="Wasla" 
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
                <h1 className="text-lg font-semibold">Wasla</h1>
              </div>
              <div className="flex items-center gap-3">
                <UpdateStatus />
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}

