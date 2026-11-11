import { useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { PanelLeft, PanelLeftClose } from 'lucide-react'

import dewTaskLockup from '../../assets/brand/dewtask-lockup.svg'
import dewTaskLockupDark from '../../assets/brand/dewtask-lockup-dark.svg'
import Header from './Header'

import './TitleBar.css'

/**
 * Frameless-window title bar.
 * Brand identity and the sidebar toggle live here, leaving the sidebar
 * dedicated to navigation.
 */
export default function TitleBar({
  collapsed,
  onToggleSidebar,
  title,
  onNewTask,
  onNewWorkspace,
  onNotifications,
  hasUnread,
}: {
  collapsed: boolean
  onToggleSidebar: () => void
  title: string
  onNewTask: () => void
  onNewWorkspace: () => void
  onNotifications: () => void
  hasUnread: boolean
}) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const appWindow = getCurrentWindow()
    let isMounted = true
    let unlisten: (() => void) | undefined

    const syncMaximizedState = async () => {
      try {
        const maximized = await appWindow.isMaximized()
        if (isMounted) setIsMaximized(maximized)
      } catch (error) {
        console.error('Unable to read window state:', error)
      }
    }

    void syncMaximizedState()

    void appWindow.onResized(() => {
      void syncMaximizedState()
    }).then((dispose) => {
      if (isMounted) unlisten = dispose
      else dispose()
    }).catch((error) => {
      console.error('Unable to subscribe to window resize:', error)
    })

    return () => {
      isMounted = false
      unlisten?.()
    }
  }, [])

  const handleTitleBarDoubleClick = () => {
    const appWindow = getCurrentWindow()
    void appWindow.toggleMaximize().then(async () => {
      setIsMaximized(await appWindow.isMaximized())
    }).catch((error) => {
      console.error('Unable to toggle window size:', error)
    })
  }

  const minimizeWindow = () => {
    void getCurrentWindow().minimize().catch((error) => {
      console.error('Unable to minimize the application window:', error)
    })
  }

  const toggleMaximizeWindow = () => {
    const appWindow = getCurrentWindow()
    void appWindow.toggleMaximize().then(async () => {
      setIsMaximized(await appWindow.isMaximized())
    }).catch((error) => {
      console.error('Unable to toggle window size:', error)
    })
  }

  const closeWindow = () => {
    void getCurrentWindow().close().catch((error) => {
      console.error('Unable to close the application window:', error)
    })
  }

  return (
    <div
      className={`tn-window-titlebar ${collapsed ? 'is-sidebar-collapsed' : ''}`}
      data-tauri-drag-region
      role="toolbar"
      aria-label="Application title bar"
      onDoubleClick={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('button, input, textarea, select, [role="menu"]')) return
        handleTitleBarDoubleClick()
      }}
    >
      <div
        className={`tn-window-brand-slot ${collapsed ? 'is-collapsed' : ''}`}
        data-tauri-drag-region
        style={{ width: collapsed ? 72 : 220 }}
      >
        {collapsed ? (
          <span
            role="img"
            aria-label="DewTask"
            className="tn-titlebar-brand-mark"
          />
        ) : (
          <>
            <img src={dewTaskLockup} alt="DewTask" className="tn-brand-light tn-titlebar-brand-lockup" />
            <img src={dewTaskLockupDark} alt="DewTask" className="tn-brand-dark tn-titlebar-brand-lockup" />
          </>
        )}

        <button
          type="button"
          onClick={onToggleSidebar}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="tn-titlebar-sidebar-toggle"
        >
          {collapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <Header
        title={title}
        onNewTask={onNewTask}
        onNewWorkspace={onNewWorkspace}
        onNotifications={onNotifications}
        hasUnread={hasUnread}
      />

      <div className="tn-window-controls" data-no-drag>
        <button
          type="button"
          className="tn-window-control"
          aria-label="Minimize window"
          title="Minimize"
          onClick={minimizeWindow}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8h10" />
          </svg>
        </button>

        <button
          type="button"
          className="tn-window-control"
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          title={isMaximized ? 'Restore' : 'Maximize'}
          onClick={toggleMaximizeWindow}
        >
          {isMaximized ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5.5 3.5h7v7h-7z" />
              <path d="M3.5 5.5v7h7" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="3.5" y="3.5" width="9" height="9" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="tn-window-control tn-window-control-close"
          aria-label="Close window"
          title="Close"
          onClick={closeWindow}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
