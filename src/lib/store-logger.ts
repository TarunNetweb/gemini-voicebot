import { create } from "zustand";
import { StreamingLog } from "../types";

interface StoreLoggerState {
  maxLogs: number;
  logs: StreamingLog[];
  log: (streamingLog: StreamingLog) => void;
  clearLogs: () => void;
  setMaxLogs: (n: number) => void;
}

export const useLoggerStore = create<StoreLoggerState>((set, get) => ({
  maxLogs: 1000,
  logs: [],

  log: (streamingLog: StreamingLog) => {
    set((state) => {
      const prevLog = state.logs.at(-1);
      if (prevLog && prevLog.message === streamingLog.message) {
        return {
          logs: [
            ...state.logs.slice(0, -1),
            streamingLog,
          ],
        };
      }

      return {
        logs: [
          ...state.logs.slice(-(get().maxLogs - 1)),
          streamingLog,
        ],
      };
    });
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  setMaxLogs: (n: number) => set({ maxLogs: n }),
}));
