import { ReactNode } from 'react';

interface PopupLayoutProps {
  children: ReactNode;
}

/**
 * Popup Layout Component
 * 
 * Fixed 360x540px layout for Chrome Extension popup
 */
function PopupLayout({ children }: PopupLayoutProps) {
  return (
    <div className="w-[360px] h-[540px] bg-background text-foreground overflow-hidden flex flex-col popup-enter">
      {children}
    </div>
  );
}

export default PopupLayout;
