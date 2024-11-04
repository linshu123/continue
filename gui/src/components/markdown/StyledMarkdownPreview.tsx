import { memo, useEffect, useMemo } from "react";
import { useRemark } from "react-remark";
import rehypeHighlight, { Options } from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import styled from "styled-components";
import { visit } from "unist-util-visit";
import {
  defaultBorderRadius,
  vscBackground,
  vscEditorBackground,
  vscForeground,
} from "..";
import { getFontSize } from "../../util";
import "./katex.css";
import FilenameLink from "./FilenameLink";
import "./markdown.css";
import PreWithToolbar from "./PreWithToolbar";
import { SyntaxHighlightedPre } from "./SyntaxHighlightedPre";
import { ContextItem, ContextItemWithId, OneLineRange } from "core";

const StyledMarkdown = styled.div<{
  fontSize?: number;
}>`
  pre {
    background-color: ${vscEditorBackground};
    border-radius: ${defaultBorderRadius};

    max-width: calc(100vw - 24px);
    overflow-x: scroll;
    overflow-y: hidden;

    margin: 10px 0;
    padding: 6px 8px;
  }

  code {
    span.line:empty {
      display: none;
    }
    word-wrap: break-word;
    border-radius: ${defaultBorderRadius};
    background-color: ${vscEditorBackground};
    font-size: ${getFontSize() - 2}px;
    font-family: var(--vscode-editor-font-family);
  }

  code:not(pre > code) {
    font-family: var(--vscode-editor-font-family);
    color: #f78383;
  }

  background-color: ${vscBackground};
  font-family: var(--vscode-font-family), system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
    "Open Sans", "Helvetica Neue", sans-serif;
  font-size: ${(props) => props.fontSize || getFontSize()}px;
  padding-left: 8px;
  padding-right: 8px;
  color: ${vscForeground};

  p,
  li,
  ol,
  ul {
    line-height: 1.5;
  }

  > *:first-child {
    margin-top: 8px;
  }

  > *:last-child {
    margin-bottom: 0;
  }
`;

interface StyledMarkdownPreviewProps {
  className?: string;
  showCodeBorder?: boolean;
  scrollLocked?: boolean;
  contextItem?: ContextItemWithId;
}

const HLJS_LANGUAGE_CLASSNAME_PREFIX = "language-";

function getLanuageFromClassName(className: any): string | null {
  if (!className || typeof className !== "string") {
    return null;
  }

  const language = className
    .split(" ")
    .find((word) => word.startsWith(HLJS_LANGUAGE_CLASSNAME_PREFIX))
    ?.split("-")[1];

  return language;
}

function getCodeChildrenContent(children: any) {
  if (typeof children === "string") {
    return children;
  } else if (
    Array.isArray(children) &&
    children.length > 0 &&
    typeof children[0] === "string"
  ) {
    return children[0];
  }

  return undefined;
}

const StyledMarkdownPreview = memo(function StyledMarkdownPreview(
  props: StyledMarkdownPreviewProps,
) {
  const [reactContent, setMarkdownSource] = useRemark({
    rehypePlugins: [
      rehypeKatex as any,
      {},
      rehypeHighlight as any,
      // Note: An empty obj is the default behavior, but leaving this here for scaffolding to
      // add unsupported languages in the future. We will need to install the `lowlight` package
      // to use the `common` language set in addition to unsupported languages.
      // https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md
      {
        // languages: {},
      } as Options,
      () => {
        let codeBlockIndex = 0;
        return (tree) => {
          visit(tree, { tagName: "pre" }, (node: any) => {
            // Pass highlightRanges to the pre component
            node.properties = { 
              codeBlockIndex,
              highlightRanges: props.contextItem.highlightRanges
            };
            codeBlockIndex++;
          });
        };
      },
      {},
    ],
    rehypeReactOptions: {
      components: {
        a: ({ node, ...props }) => {
          return (
            <a {...props} target="_blank">
              {props.children}
            </a>
          );
        },
        pre: ({ node, ...preProps }) => {
          const { className, filepath } = preProps?.children?.[0]?.props;
          return props.showCodeBorder ? (
            <PreWithToolbar
              codeBlockIndex={preProps.codeBlockIndex}
              language={getLanuageFromClassName(className)}
              filepath={filepath}
            >
              <SyntaxHighlightedPre 
                key={JSON.stringify(props.contextItem.uri) + JSON.stringify(props.contextItem.highlightRanges)}
                {...preProps}
                highlightRanges={props.contextItem.highlightRanges}
              >
                {preProps.children}
              </SyntaxHighlightedPre>
            </PreWithToolbar>
          ) : (
            <SyntaxHighlightedPre 
              key={JSON.stringify(props.contextItem.uri) + JSON.stringify(props.contextItem.highlightRanges)}
              {...preProps} 
              highlightRanges={props.contextItem.highlightRanges}
            >
              {preProps.children}
            </SyntaxHighlightedPre>
          );
        },
        code: ({ node, ...codeProps }) => {
          const content = getCodeChildrenContent(codeProps.children);
          
          return <code {...codeProps}>{codeProps.children}</code>;
        },
      },
    },
  });

  useEffect(() => {
    setMarkdownSource(props.contextItem?.content + JSON.stringify(props.contextItem?.highlightRanges));
  }, [props.contextItem]);

  return (
    <StyledMarkdown fontSize={getFontSize()}>{reactContent}</StyledMarkdown>
  );
});

export default StyledMarkdownPreview;
