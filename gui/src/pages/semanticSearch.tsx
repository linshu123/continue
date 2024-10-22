import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { ContextItemWithId } from "core";
import React, { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IdeMessengerContext } from "../context/IdeMessenger";
import { useContext } from "react";
import {
  defaultBorderRadius,
  lightGray,
  vscBackground,
  vscBadgeBackground,
  vscForeground,
  vscInputBackground,
} from "../components";
import { useNavigationListener } from "../hooks/useNavigationListener";
import { getFontSize } from "../util";
import ContextItemsPeek from "../components/mainInput/ContextItemsPeek";
import StyledMarkdownPreview from "../components/markdown/StyledMarkdownPreview";
import { getMarkdownLanguageTagForFile } from "core/util";
import { contextItemToRangeInFileWithContents } from "core/commands/util";
const SearchBarContainer = styled.div`
  display: flex;
  max-width: 500px;
  padding: 0 8px 0 8px;
  margin: 0 auto;
  align-items: center;
  justify-content: center;
`;

const SearchBar = styled.input`
  padding: 4px 8px;
  border-radius: ${defaultBorderRadius};
  border: 0.5px solid #888;
  outline: none;
  margin: 8px auto;
  display: block;
  background-color: ${vscInputBackground};
  color: ${vscForeground};
  &:focus {
    border: 0.5px solid ${vscBadgeBackground};
    outline: none;
  }
`;

const backticksRegex = /`{3,}/gm;

function SemanticSearch() {
  useNavigationListener();
  const navigate = useNavigate();

  // const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [contextItems, setContextItems] = useState<ContextItemWithId[]>([]);
  const [filteredAndSortedContextItems, setFilteredAndSortedContextItems] =
    useState<ContextItemWithId[]>([]);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const miniSearchInputRef = React.useRef<HTMLInputElement>(null);
  const stickyHistoryHeaderRef = React.useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [miniSearchTerm, setMiniSearchTerm] = useState("");

  const ideMessenger = useContext(IdeMessengerContext);

  const getFence = (contextItem: ContextItemWithId) => {
    const backticks = contextItem.content.match(backticksRegex);
    return backticks ? backticks.sort().at(-1) + "`" : "```";
  };

  const fetchContextItems = async (query: string) => {
    console.log("fetchContextItems", query);
    const data = {
      name: "codebase",
      query: "",
      fullInput: query,
      selectedCode: [],
    };
    const result = await ideMessenger.request("context/getContextItems", data);
    if (result.status === "success") {
      const resolvedItems = result.content;
      // remove the last element
      resolvedItems.pop();
      setContextItems(resolvedItems);
      return resolvedItems;
    }
    return [];
  };

  const openContextItem = (contextItem: ContextItemWithId) => {
    const rif = contextItemToRangeInFileWithContents(contextItem);
    ideMessenger.ide.showLines(
      rif.filepath,
      rif.range.start.line,
      rif.range.end.line,
    );
  };

  useEffect(() => {
    const lowerCaseMiniSearchTerm = miniSearchTerm.toLowerCase();
    const filteredContextItems = contextItems.filter((contextItem) => {
      return (
        contextItem.content.toLowerCase().includes(lowerCaseMiniSearchTerm) ||
        contextItem.name.toLowerCase().includes(lowerCaseMiniSearchTerm) ||
        contextItem.description.toLowerCase().includes(lowerCaseMiniSearchTerm)
      );
    });
    setFilteredAndSortedContextItems(filteredContextItems);
  }, [contextItems, miniSearchTerm]);

  useEffect(() => {
    setHeaderHeight(stickyHistoryHeaderRef.current?.clientHeight || 100);
  }, [stickyHistoryHeaderRef.current]);

  return (
    <div className="overflow-y-scroll" style={{ fontSize: getFontSize() }}>
      <div
        ref={stickyHistoryHeaderRef}
        className="sticky top-0"
        style={{ backgroundColor: vscBackground }}
      >
        <div
          className="items-center flex m-0 p-0"
          style={{
            borderBottom: `0.5px solid ${lightGray}`,
          }}
        >
          <ArrowLeftIcon
            width="1.2em"
            height="1.2em"
            onClick={() => navigate("/")}
            className="inline-block ml-4 cursor-pointer"
          />
          <h3 className="text-lg font-bold m-2 inline-block">
            Semantic Search
          </h3>
        </div>
      </div>

      <div>
        <SearchBarContainer className="space-x-2">
          <SearchBar
            className="flex-1 w-full"
            ref={miniSearchInputRef}
            placeholder="Filter results..."
            type="text"
            onChange={(e) => setMiniSearchTerm(e.target.value)}
          />
        </SearchBarContainer>
        <SearchBarContainer className="space-x-2">
          <SearchBar
            className="flex-1 w-full text-xl"
            ref={searchInputRef}
            placeholder="Search codebase"
            type="text"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span
            className="block text-center px-2 py-1.5 rounded-md w-12 mx-1 my-2 select-none cursor-pointer"
            style={{
              fontSize: "11px",
              backgroundColor:
                searchTerm !== "" ? vscInputBackground : vscBadgeBackground,
            }}
            onClick={() => {
              fetchContextItems(searchTerm);
            }}
          >
            ⏎
          </span>
        </SearchBarContainer>

        <ContextItemsPeek contextItems={filteredAndSortedContextItems} />

        {filteredAndSortedContextItems.length === 0 && (
          <div className="text-center m-4">
            No context found. Enter a search term to search the codebase.
          </div>
        )}

        <table className="w-full border-spacing-0 border-collapse">
          <tbody>
            {filteredAndSortedContextItems.map((contextItem, index) => {
              return (
                <Fragment key={index}>
                  <code>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        openContextItem(contextItem);
                      }}
                    >
                      {contextItem.name} {contextItem.id.providerTitle}
                    </a>
                  </code>
                  <StyledMarkdownPreview
                    source={`${contextItem.content.trimEnd()}\n`}
                    showCodeBorder={false}
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

export default SemanticSearch;
