import { create } from "zustand";
import { StreamingLog } from "../types";
import { mockLogs } from "../components/logger/mock-logs";

interface StoreLoggerState {
  maxLogs: number;
  logs: StreamingLog[];
  log: (streamingLog: StreamingLog) => void;
  clearLogs: () => void;
}

export const useLoggerStore = create<StoreLoggerState>((set, get) => ({
  maxLogs: 100,
  logs: [], 
  log: ({  type, message }: StreamingLog) => {
    set((state) => {
      const prevLog = state.logs.at(-1);
      if (prevLog && prevLog.type === type && prevLog.message === message) {
        return {
          logs: [
            ...state.logs.slice(0, -1),
            {
              message,
            } as StreamingLog,
          ],
        };
      }
      return {
        logs: [
          ...state.logs.slice(-(get().maxLogs - 1)),
          {
            message,
          } as StreamingLog,
        ],
      };
    });
  },

  clearLogs: () => {
    set({ logs: [] });
  },
  setMaxLogs: (n: number) => set({ maxLogs: n }),
}));
