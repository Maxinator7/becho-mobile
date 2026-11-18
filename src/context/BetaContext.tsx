import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { FeedbackSheet, FeedbackCategory } from '../components/FeedbackSheet';
import { currentRouteName } from '../navigation/navigationRef';

export interface FeedbackPreset {
  category?: FeedbackCategory;
  message?: string;
}

interface BetaContextValue {
  /** The beta banner was closed this session (it comes back on the next app start). */
  bannerDismissed: boolean;
  dismissBanner: () => void;
  /** Opens the feedback sheet for the screen currently shown. */
  openFeedback: (preset?: FeedbackPreset) => void;
}

const BetaContext = createContext<BetaContextValue>({
  bannerDismissed: false,
  dismissBanner: () => {},
  openFeedback: () => {},
});

export const BetaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sheet, setSheet] = useState<{ page?: string; preset?: FeedbackPreset } | null>(null);

  const openFeedback = useCallback((preset?: FeedbackPreset) => setSheet({ page: currentRouteName(), preset }), []);
  const value = useMemo(() => ({ bannerDismissed, dismissBanner: () => setBannerDismissed(true), openFeedback }), [bannerDismissed, openFeedback]);

  return (
    <BetaContext.Provider value={value}>
      {children}
      <FeedbackSheet visible={!!sheet} page={sheet?.page} preset={sheet?.preset} onClose={() => setSheet(null)} />
    </BetaContext.Provider>
  );
};

export const useBeta = () => useContext(BetaContext);
