import {
  Content,
  GoogleGenAI,
  LiveCallbacks,
  LiveClientToolResponse,
  LiveConnectConfig,
  LiveServerContent,
  LiveServerMessage,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
  Session,
} from "@google/genai";

import { EventEmitter } from "eventemitter3";
import { difference } from "lodash";
import { LiveClientOptions, StreamingLog } from "../types";
import { base64ToArrayBuffer } from "./utils";

export interface LiveClientEventTypes {
  audio: (data: ArrayBuffer) => void;
  close: (event: CloseEvent) => void;
  content: (data: LiveServerContent) => void;
  error: (error: ErrorEvent) => void;
  interrupted: () => void;
  log: (log: StreamingLog) => void;
  open: () => void;
  setupcomplete: () => void;
  toolcall: (toolCall: LiveServerToolCall) => void;
  toolcallcancellation: (
    toolcallCancellation: LiveServerToolCallCancellation
  ) => void;
  turncomplete: () => void;
}
export class GenAILiveClient extends EventEmitter<LiveClientEventTypes> {
  protected client: GoogleGenAI;

  private _status: "connected" | "disconnected" | "connecting" = "disconnected";
  public get status() {
    return this._status;
  }

  private _session: Session | null = null;
  public get session() {
    return this._session;
  }

  private _model: string | null = null;
  public get model() {
    return this._model;
  }

  protected config: LiveConnectConfig | null = null;

  public getConfig() {
    return { ...this.config };
  }

  constructor(options: LiveClientOptions) {
    super();
    this.client = new GoogleGenAI(options);
    this.send = this.send.bind(this);
    this.onopen = this.onopen.bind(this);
    this.onerror = this.onerror.bind(this);
    this.onclose = this.onclose.bind(this);
    this.onmessage = this.onmessage.bind(this);
  }

  protected log(isInput: boolean,message: StreamingLog["message"]) {
    const log: StreamingLog = {
      isInput,
            message,
    };
    this.emit("log", log);
  }

  
  async connect(model: string, config: LiveConnectConfig): Promise<boolean> {
    if (this._status === "connected" || this._status === "connecting") {
      return false;
    }

    this._status = "connecting";
    this.config = config;
    this._model = model;

    const callbacks: LiveCallbacks = {
      onopen: this.onopen,
      onmessage: this.onmessage,
      onerror: this.onerror,
      onclose: this.onclose,
    };

    try {
      this._session = await this.client.live.connect({
        model,
        config,
        callbacks,
      });
    } catch (e) {
      console.error("Error connecting to GenAI Live:", e);
      this._status = "disconnected";
      return false;
    }

    this._status = "connected";
    return true;
  }

  public disconnect() {
    if (!this.session) {
      return false;
    }
    this.session?.close();
    this._session = null;
    this._status = "disconnected";

    this.log(true,`Disconnected`);
    return true;
  }

  protected onopen() {
    this.log(true, "Connected");
    this.emit("open");
  }

  protected onerror(e: ErrorEvent) {
    this.log(true, e.message);
    this.emit("error", e);
  }

  protected onclose(e: CloseEvent) {
    this.log(true,
      `disconnected ${e.reason ? `with reason: ${e.reason}` : ``}`
    );
    this.emit("close", e);
  }

  protected async onmessage(message: LiveServerMessage) {
    if (message.setupComplete) {
      this.log(true,"setupComplete");
      this.emit("setupcomplete");
      return;
    }
    if (message.toolCall) {
      this.log(true,message);
      this.emit("toolcall", message.toolCall);
      return;
    }
    if (message.toolCallCancellation) {
      this.log(true, message);
      this.emit("toolcallcancellation", message.toolCallCancellation);
      return;
    }

    // this json also might be `contentUpdate { interrupted: true }`
    // or contentUpdate { end_of_turn: true }
    if (message.serverContent) {
      const { serverContent } = message;
      if ("interrupted" in serverContent) {
        this.log(true,"interrupted");
        this.emit("interrupted");
        return;
      }
      if ("turnComplete" in serverContent) {
        this.log(true, "turnComplete");
        this.emit("turncomplete");
      }

      console.log("serverContent output ", serverContent)
      if ('inputTranscription' in serverContent){
        let audioTrans = serverContent.inputTranscription?.text
        this.log(true,`(${audioTrans})`); 
        // input_or_output
      }
      if ("outputTranscription" in serverContent) {
        let audioTrans = serverContent.outputTranscription?.text
        this.log(false,`(${audioTrans})`);
      }

      if ("modelTurn" in serverContent) {
        console.log("serverContent", serverContent)
        let parts: Part[] = serverContent.modelTurn?.parts || [];
        if ("outputTranscription" in serverContent) {
          console.log("cdfdvfdb ", serverContent)
        }
        const audioParts = parts.filter(
          (p) => p.inlineData && p.inlineData.mimeType?.startsWith("audio/pcm")
        );
        const base64s = audioParts.map((p) => p.inlineData?.data);

        const otherParts = difference(parts, audioParts);

        base64s.forEach((b64) => {
          if (b64) {

            const data = base64ToArrayBuffer(b64);
            this.emit("audio", data);

          }
        });
        if (!otherParts.length) {
          return;
        }
        parts = otherParts;
        const content: { modelTurn: Content } = { modelTurn: { parts } };
        this.emit("content", content);
      }
    } else {
      console.log("received unmatched message", message);
    }
  }

  /**
   * send realtimeInput, this is base64 chunks of "audio/pcm" and/or "image/jpg"
   */
  sendRealtimeInput(chunks: Array<{ mimeType: string; data: string }>) {
    let hasAudio = false;
    let hasVideo = false;
    for (const ch of chunks) {
      this.session?.sendRealtimeInput({ media: ch });
      if (ch.mimeType.includes("audio")) {
        hasAudio = true;
      }
     
    }
    const message =
      hasAudio 
        ? "audio "
        : hasAudio
          ? "audio"
          : hasVideo
            ? "video"
            : "unknown";
    this.log(true, message);
  }

  /**
   *  send a response to a function call and provide the id of the functions you are responding to
   */
  sendToolResponse(toolResponse: LiveClientToolResponse) {
    if (
      toolResponse.functionResponses &&
      toolResponse.functionResponses.length
    ) {
      this.session?.sendToolResponse({
        functionResponses: toolResponse.functionResponses,
      });
      this.log(false,toolResponse);
    }
  }

  /**
   * send normal content parts such as { text }
   */
  send(parts: Part | Part[], turnComplete: boolean = true) {
    console.log(" sending the parth s")
    this.session?.sendClientContent({ turns: parts, turnComplete });
    this.log(false, {
      turns: Array.isArray(parts) ? parts : [parts],
      turnComplete,
    });
  }
}
