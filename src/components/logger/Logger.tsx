
import "./logger.scss";

import cn from "classnames";
import { memo, ReactNode } from "react";
import { useLoggerStore } from "../../lib/store-logger";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 as dark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  ClientContentLog as ClientContentLogType,
  StreamingLog,
} from "../../types";
import {
  Content,
  LiveClientToolResponse,
  LiveServerContent,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
} from "@google/genai";


const LogEntry = memo(
  ({
    log,
    MessageComponent,
  }: {
    log: StreamingLog;
    MessageComponent: ({
      message,
    }: {
      message: StreamingLog["message"];
    }) => ReactNode;
  }): JSX.Element => {
    console.log("log", log);

    const isAudio = log.message === "audio ";
    const isInput = log.isInput === true;
    console.log(" is input ", isInput)
    return (
      <>
        {!isAudio && (
          <span
          key = {isInput? "true":  "false"}
          className={isInput ? "message1" : "message"}>
            <MessageComponent message={log.message} />
          </span>
        )}

      </>
    );
  }
);

const PlainTextMessage = ({
  message,
}: {
  message: StreamingLog["message"];
}) => <span>{
  message as string} </span>;

type Message = { message: StreamingLog["message"] };

const AnyMessage = ({ message }: Message) => (
  <pre>{JSON.stringify(message, null, "  ")}</pre>
);

function tryParseCodeExecutionResult(output: string) {
  try {
    const json = JSON.parse(output);
    return JSON.stringify(json, null, "  ");
  } catch (e) {
    return output;
  }
}

const RenderPart = memo(({ part }: { part: Part }) => {
  if (part.text && part.text.length) {
    return <p className="part part-text">{part.text}</p>;
  }
  if (part.executableCode) {
    return (
      <div className="part part-executableCode">
        <h5>executableCode: {part.executableCode.language}</h5>
        <SyntaxHighlighter
          language={part.executableCode!.language!.toLowerCase()}
          style={dark}
        >
          {part.executableCode!.code!}
        </SyntaxHighlighter>
      </div>
    );
  }
  if (part.codeExecutionResult) {
    return (
      <div className="part part-codeExecutionResult">
        <h5>codeExecutionResult: {part.codeExecutionResult!.outcome}</h5>
        <SyntaxHighlighter language="json" style={dark}>
          {tryParseCodeExecutionResult(part.codeExecutionResult!.output!)}
        </SyntaxHighlighter>
      </div>
    );
  }
  if (part.inlineData) {
    return (
      <div className="part part-inlinedata">
        <h5>Inline Data: {part.inlineData?.mimeType}</h5>
      </div>
    );
  }
  return <div className="part part-unknown">&nbsp;</div>;
});

const ClientContentLog = memo(({ message }: Message) => {
  const { turns, turnComplete } = message as ClientContentLogType;
  const textParts = turns.filter((part) => !(part.text && part.text === "\n"));
  return (
    <div className="rich-log client-content user">
      <h4 className="roler-user">User</h4>
      <div key={`message-turn`}>
        {textParts.map((part, j) => (
          <RenderPart part={part} key={`message-part-${j}`} />
        ))}
      </div>
      {!turnComplete ? <span>turnComplete: false</span> : ""}
    </div>
  );
});

const ToolCallLog = memo(({ message }: Message) => {
  const { toolCall } = message as { toolCall: LiveServerToolCall };
  return (
    <div className={cn("rich-log tool-call")}>
      {toolCall.functionCalls?.map((fc, i) => (
        <div key={fc.id} className="part part-functioncall">
          <h5>Function call: {fc.name}</h5>
          <SyntaxHighlighter language="json" style={dark}>
            {JSON.stringify(fc, null, "  ")}
          </SyntaxHighlighter>
        </div>
      ))}
    </div>
  );
});

const ToolCallCancellationLog = ({ message }: Message): JSX.Element => (
  <div className={cn("rich-log tool-call-cancellation")}>
    <span>
      {" "}
      ids:{" "}
      {(
        message as { toolCallCancellation: LiveServerToolCallCancellation }
      ).toolCallCancellation.ids?.map((id) => (
        <span className="inline-code" key={`cancel-${id}`}>
          "{id}"
        </span>
      ))}
    </span>
  </div>
);

const ToolResponseLog = memo(
  ({ message }: Message): JSX.Element => (
    <div className={cn("rich-log tool-response")}>
      {(message as LiveClientToolResponse).functionResponses?.map((fc) => (
        <div key={`tool-response-${fc.id}`} className="part">
          <h5>Function Response: {fc.id}</h5>
          <SyntaxHighlighter language="json" style={dark}>
            {JSON.stringify(fc.response, null, "  ")}
          </SyntaxHighlighter>
        </div>
      ))}
    </div>
  )
);

const ModelTurnLog = ({ message }: Message): JSX.Element => {
  const serverContent = (message as { serverContent: LiveServerContent })
    .serverContent;
  const { modelTurn } = serverContent as { modelTurn: Content };
  const { parts } = modelTurn;

  return (
    <div className="rich-log model-turn model">
      <h4 className="role-model">Model</h4>
      {parts
        ?.filter((part) => !(part.text && part.text === "\n"))
        .map((part, j) => (
          <RenderPart part={part} key={`model-turn-part-${j}`} />
        ))}
    </div>
  );
};

const CustomPlainTextLog = (msg: string) => () =>
  <PlainTextMessage message={msg} />;

export type LoggerFilterType = "conversations" | "tools" | "none";

export type LoggerProps = {
  filter: LoggerFilterType;
};

const filters: Record<LoggerFilterType, (log: StreamingLog) => boolean> = {
  tools: (log: StreamingLog) =>
    typeof log.message === "object" &&
    ("toolCall" in log.message ||
      "functionResponses" in log.message ||
      "toolCallCancellation" in log.message),
  conversations: (log: StreamingLog) =>
    typeof log.message === "object" &&
    (("turns" in log.message && "turnComplete" in log.message) ||
      "serverContent" in log.message),
  none: () => true,
};

const component = (log: StreamingLog) => {
  if (typeof log.message === "string") {
    return PlainTextMessage;
  }
  if ("turns" in log.message && "turnComplete" in log.message) {
    return ClientContentLog;
  }
  if ("toolCall" in log.message) {
    return ToolCallLog;
  }
  if ("toolCallCancellation" in log.message) {
    return ToolCallCancellationLog;
  }
  if ("functionResponses" in log.message) {
    return ToolResponseLog;
  }
  if ("serverContent" in log.message) {
    const { serverContent } = log.message;
    if (serverContent?.interrupted) {
      return CustomPlainTextLog("interrupted");
    }
    if (serverContent?.turnComplete) {
      return CustomPlainTextLog("turnComplete");
    }
    if (serverContent && "modelTurn" in serverContent) {
      return ModelTurnLog;
    }
  }
  return AnyMessage;
};

export default function Logger({ filter = "none" }: LoggerProps) {
  const { logs } = useLoggerStore();

  const filterFn = filters[filter];

  return (
    <div className="logger">
      <ul className="logger-list">
        {logs.filter(filterFn).map((log, key) => {
          return (
            <LogEntry MessageComponent={component(log)} log={log} key={key} />
          );
        })}
      </ul>
    </div>
  );
}
