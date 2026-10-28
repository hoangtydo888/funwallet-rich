import { ReactNode } from 'react';

interface PopupLayoutProps {
  children: ReactNode;
}

// After install the worker opens popup.html?surface=onboarding in a full tab.
// There the wallet sits in a centered card, like MetaMask's welcome page.
const inTab = new URLSearchParams(window.location.search).get('surface') === 'onboarding';

/**
 * Popup Layout Component
 *
 * Fills the popup / side panel; centered card when opened as a full tab
 */
function PopupLayout({ children }: PopupLayoutProps) {
  const body = (
    <div className="w-full h-full min-h-0 bg-background text-foreground overflow-hidden flex flex-col popup-enter">
      {children}
    </div>
  );
  if (!inTab) return body;
  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-emerald-50 via-amber-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] h-[680px] max-h-full rounded-3xl shadow-2xl overflow-hidden border border-emerald-100">
        {body}
      </div>
    </div>
  );
}

export default PopupLayout;
