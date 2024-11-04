import React from 'react';
import styled from 'styled-components';
import { defaultBorderRadius, vscEditorBackground, vscForeground } from '..';
import { OneLineRange } from 'core';
const StyledPre = styled.pre`
  background-color: ${vscEditorBackground};
  color: ${vscForeground};
  border-radius: ${defaultBorderRadius};
  padding: 8px;
  margin: 0;
  overflow-x: auto;
  font-family: var(--vscode-editor-font-family);
`;

const HighlightedSpan = styled.span`
  background-color: rgba(255, 255, 0, 0.3);
  display: inline;
`;

const NormalSpan = styled.span`
  display: inline;
`;


interface CodeWithHighlightRangesPreProps {
  code: string;
  highlightRanges: OneLineRange[];
}

export const CodeWithHighlightRangesPre: React.FC<CodeWithHighlightRangesPreProps> = ({
  code,
  highlightRanges = []
}) => {
  // Sort ranges by start position to process them in order
  const sortedRanges = [...highlightRanges].sort((a, b) => a.start - b.start);

  const renderCodeWithHighlights = () => {
    const result: JSX.Element[] = [];
    let currentPosition = 0;

    // Process each range in order
    for (const range of sortedRanges) {
      // Add non-highlighted text before the range
      if (currentPosition < range.start) {
        result.push(
          <NormalSpan key={`normal-${currentPosition}`}>
            {code.slice(currentPosition, range.start)}
          </NormalSpan>
        );
      }

      // Add highlighted text
      result.push(
        <HighlightedSpan key={`highlight-${range.start}`}>
          {code.slice(range.start, range.end)}
        </HighlightedSpan>
      );

      currentPosition = range.end;
    }

    // Add remaining non-highlighted text
    if (currentPosition < code.length) {
      result.push(
        <NormalSpan key={`normal-${currentPosition}`}>
          {code.slice(currentPosition)}
        </NormalSpan>
      );
    }

    return result;
  };

  return (
    <StyledPre>
      {renderCodeWithHighlights()}
    </StyledPre>
  );
};
