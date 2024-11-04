import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { ContextItemWithId } from "core";
import React, { Fragment, useContext, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWebviewListener } from "../hooks/useWebviewListener";
import {
  lightGray,
  vscBackground,
} from "../components";
import { useNavigationListener } from "../hooks/useNavigationListener";
import { getFontSize } from "../util";
import { CodeWithHighlightRangesPre } from "../components/markdown/CodeWithHighlightRangesPre";
import { IdeMessengerContext } from "../context/IdeMessenger";

function QuickReferencePage() {
  useNavigationListener();
  const navigate = useNavigate();
  const location = useLocation();

  const [contextItems, setContextItems] = useState<ContextItemWithId[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const ideMessenger = useContext(IdeMessengerContext);
  const stickyHistoryHeaderRef = React.useRef<HTMLDivElement>(null);

  const fetchReferences = async () => {
    setIsLoading(true);
    const result = await ideMessenger.request("context/getQuickReferences", undefined);
    if (result.status === "success") {
      const contextItems = result.content;
      setContextItems(contextItems);
    }
    setIsLoading(false);
  }

  // useWebviewListener(
  //   "showTopReferences",
  //   async (data: { contextItems: ContextItemWithId[] }) => {
  //     window.postMessage({
  //       type: 'debug',
  //       value: data.contextItems
  //     });
  //     console.log("Received contextItems:", data.contextItems);
  //     setContextItems(data.contextItems);
  //     setIsLoading(false);
  //   },
  //   [setContextItems]
  // );

  return (
    <div className="overflow-y-scroll" style={{ fontSize: getFontSize() }}>
       <pre style={{whiteSpace: 'pre-wrap'}}>
      Debug ContextItems: {JSON.stringify(contextItems.length, null, 2)}
    </pre>
      <div
        ref={stickyHistoryHeaderRef}
        className="sticky top-0"
        style={{ backgroundColor: vscBackground }}
      >
        <div
          className="m-0 flex items-center p-0"
          style={{
            borderBottom: `0.5px solid ${lightGray}`,
          }}
        >
          <ArrowLeftIcon
            width="1.2em"
            height="1.2em"
            onClick={() => navigate("/")}
            className="ml-4 inline-block cursor-pointer"
          />
          <h3 className="m-2 inline-block text-lg font-bold">
            Quick Reference
          </h3>
        </div>
      </div>

      <div className="flex justify-center">
      <span
            className={`mx-3 my-2 block cursor-${isLoading ? "not-allowed" : "pointer"} text-lg select-none rounded-md px-20 py-5 text-center`}
            style={{
              fontSize: "11px",
              backgroundColor: "#000",
              opacity: isLoading ? 0.5 : 1,
            }}
            onClick={() => {
              if (!isLoading) {
                fetchReferences();
              }
            }}
          >
            {isLoading ? "..." : "⏎"}
          </span>
        </div>

      <div>
        {contextItems.length === 0 && (
          <div className="m-4 text-center">
            No similar content found.
          </div>
        )}

        <table className="w-full border-collapse border-spacing-0">
          <tbody>
          <pre style={{whiteSpace: 'pre-wrap'}}>
            Debug ContextItems: {JSON.stringify(contextItems.length > 0 ? contextItems[0].highlightRanges?.[0] : [], null, 2)}
          </pre>
            {contextItems.map((contextItem, index) => {
              return (
                <Fragment key={`${index}-${contextItem.uri}-${JSON.stringify(contextItem.highlightRanges)}`}>
                  <code>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                      }}
                    >
                      {contextItem.name} {contextItem.id.providerTitle}
                    </a>
                  </code>
                  <CodeWithHighlightRangesPre
                    code={contextItem.content.trimEnd()}
                    highlightRanges={contextItem.highlightRanges}
                  />
                </Fragment>
              );
            })}
          </tbody>
        </table>
        <br />
      </div>
    </div>
  );
}

export default QuickReferencePage;
