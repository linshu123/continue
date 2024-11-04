import { useContext } from "react";
import styled from "styled-components";
import { defaultBorderRadius, vscForeground } from "..";
import { VscThemeContext } from "../../context/VscTheme";
import React from "react";
import { OneLineRange, Range } from "core";

const StyledPre = styled.pre<{ theme: any }>`
  & .hljs {
    color: ${vscForeground};
  }

  margin-top: 0;
  margin-bottom: 0;
  
  border-radius: 0 0 ${defaultBorderRadius} ${defaultBorderRadius} !important;
  ${(props) =>
    Object.keys(props.theme)
      .map((key) => {
        return `
      & ${key} {
        color: ${props.theme[key]};
      }
    `;
      })
      .join("")}
`;

interface SyntaxHighlightedPreProps {
  highlightRanges?: OneLineRange[];
  children: React.ReactNode;
}

export const SyntaxHighlightedPre: React.FC<SyntaxHighlightedPreProps> = ({
  highlightRanges = [],
  children,
  ...props
}) => {
  const currentTheme = useContext(VscThemeContext);

  const modifiedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child;
    }

    

    // Ensure child.props.children exists and is an array
    const childrenArray = React.Children.toArray(child.props.children);
    
    return React.cloneElement(child, {
      ...child.props,
      children: (() => {
        let totalPreviousChars = 0;  // Running count of characters
        return childrenArray.map((line, index) => {
          if (!React.isValidElement(line)) {
            return <span style={{ display: 'inline', backgroundColor: 'rgba(150, 150, 150, 0.3)' }}>{String(line).length}{line}</span>;
          }
          // Store current total before adding this line
          const currentTotalChars = totalPreviousChars;
          // Add current line length to running total (convert to string if needed)
          totalPreviousChars += String(line).length + 1;
          
          let shouldHighlight = false;
          if (highlightRanges.length > 0) {
            shouldHighlight = highlightRanges.some(
              (range) => currentTotalChars + 1 >= range.start && totalPreviousChars <= range.end
            );
          }
          return (
            <span style={{ 
              backgroundColor: 'rgba(255, 255, 0, 0.3)',
              display: 'inline'
            }}>
              {String(line).length}
              {line}
            </span>
          );
        });
      })()
    });
  });

  return (
    <StyledPre {...props} theme={currentTheme}>
      {modifiedChildren}
    </StyledPre>
  );
};