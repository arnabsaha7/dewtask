import { useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { PanelLeft, PanelLeftClose } from 'lucide-react'

import taskNestLockup from '../../assets/brand/tasknest-lockup.svg'
import taskNestLockupDark from '../../assets/brand/tasknest-lockup-dark.svg'
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
        style={{ width: collapsed ? 72 : 240 }}
      >
        {collapsed ? (
          <svg
            role="img"
            aria-label="TaskNest"
            viewBox="0 0 320 300"
            className="tn-titlebar-brand-mark"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="translate(-8 0)" fill="currentColor">
              <g fill="none" stroke="currentColor" strokeWidth="11.5" strokeLinecap="round">
                <path d="M237.5 45.5 L248.5 23.5" />
                <path d="M259.5 60 L279 41.5" />
                <path d="M269.5 83 L294.5 76.5" />
              </g>
              <path
                fillRule="evenodd"
                d="M90.2 135.5 A80 80 0 1 1 249.8 134 C226 151.5 198.5 169.5 168.5 185.8 C141 171 114.5 153.5 90.2 135.5 Z M161.8 153.2 C159.5 153.2 157.3 152.3 155.6 150.6 L138.2 133.2 C134.8 129.8 134.8 124.2 138.2 120.8 C141.6 117.4 147.2 117.4 150.6 120.8 L161.8 132 L191.4 100.4 C194.7 96.9 200.3 96.8 203.8 100.1 C207.3 103.4 207.4 109 204.1 112.5 L168.2 150.5 C166.5 152.2 164.2 153.2 161.8 153.2 Z"
              />
              <path d="M179.5 196.2 C218 176.5 256.5 153.5 294.5 133 C302.5 128.6 310.2 133.8 308.8 143.2 C305.8 166.8 296.2 194.5 282.5 215.2 C279.8 218.5 274.5 219.2 267.5 219.2 C237.5 219 207 209.8 179.5 196.2 Z" />
              <path d="M26.2 142.5 C25 132.8 33.2 128.2 41.8 133.2 C86.5 159.2 134.5 189.2 184.5 210.8 C214.5 223.8 244.2 229 274.2 228.5 C252 261.8 212.5 281 167.5 281 C93.5 281 34.2 221.5 26.2 142.5 Z" />
            </g>
          </svg>
        ) : (
          <>
            <img src={taskNestLockup} alt="TaskNest" className="tn-brand-light tn-titlebar-brand-lockup" />
            <img src={taskNestLockupDark} alt="TaskNest" className="tn-brand-dark tn-titlebar-brand-lockup" />
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
