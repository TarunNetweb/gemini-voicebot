import type { StreamingLog } from "../../types";

const soundLogs = (n: number): StreamingLog[] =>
  new Array(n).fill(0).map(
    (): StreamingLog => ({
      type: "server.audio",
      message: "buffer (11250)",
    })
  );
//
const realtimeLogs = (n: number): StreamingLog[] =>
  new Array(n).fill(0).map(
    (): StreamingLog => ({
 
      type: "client.realtimeInput",
      message: "",
    })
  );

export const mockLogs: StreamingLog[] = [
  {
    type: "client.open",
    message: "connected",
  },
  {  type: "receive", message: "setupComplete" },
  ...realtimeLogs(10),
  ...soundLogs(10),
  {
    
    type: "receive.content",
    message: {
      serverContent: {
        interrupted: true,
      },
    },
  },
  {

    type: "receive.content",
    message: {
      serverContent: {
        turnComplete: true,
      },
    },
  },
  ...realtimeLogs(10),
  ...soundLogs(20),
  {

    type: "receive.content",
    message: {
      serverContent: {
        modelTurn: {
          parts: [{ text: "Hey its text" }, { text: "more" }],
        },
      },
    },
  },
  {

    type: "server.toolCallCancellation",
    message: {
      toolCallCancellation: {
        ids: ["akladfjadslfk", "adkafsdljfsdk"],
      },
    },
  },
  {

    type: "client.toolResponse",
    message: {
      functionResponses: [
        {
          response: { success: true },
          id: "akslaj-10102",
        },
      ],
    },
  },
  {

    type: "receive.serverContent",
    message: "interrupted",
  },
  {

    type: "receive.serverContent",
    message: "turnComplete",
  },
];
