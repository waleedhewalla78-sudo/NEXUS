import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WorkspaceState {
  workspaceId: string | null;
  setupError: string | null;
  needsDatabaseSetup: boolean;
  bootstrapping: boolean;
  branding: {
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
  };
  setWorkspaceId: (id: string | null) => void;
  setSetupError: (error: string | null) => void;
  setNeedsDatabaseSetup: (value: boolean) => void;
  setBootstrapping: (value: boolean) => void;
  setBranding: (branding: Partial<WorkspaceState['branding']>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools((set) => ({
    workspaceId: null,
    setupError: null,
    needsDatabaseSetup: false,
    bootstrapping: false,
    branding: {},
    setWorkspaceId: (id: string | null) => set({ workspaceId: id && id.length > 0 ? id : null }),
    setSetupError: (error) => set({ setupError: error }),
    setNeedsDatabaseSetup: (value) => set({ needsDatabaseSetup: value }),
    setBootstrapping: (value) => set({ bootstrapping: value }),
    setBranding: (branding) => set((state) => ({ branding: { ...state.branding, ...branding } })),
  }))
);
