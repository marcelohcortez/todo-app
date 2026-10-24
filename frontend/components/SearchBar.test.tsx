import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchBar from "./SearchBar";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function type(value: string) {
  fireEvent.change(screen.getByLabelText("Search tasks"), { target: { value } });
}

describe("SearchBar", () => {
  it("does not search before the third character", () => {
    const onSearch = vi.fn();
    render(<SearchBar label="Search tasks" onSearch={onSearch} />);
    type("ab");
    act(() => vi.advanceTimersByTime(1000));
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByText("Type at least 3 characters to search.")).toBeTruthy();
  });

  it("searches on its own once typing pauses after the third character", () => {
    const onSearch = vi.fn();
    render(<SearchBar label="Search tasks" onSearch={onSearch} />);
    type("mil");
    act(() => vi.advanceTimersByTime(100));
    type("milk");
    act(() => vi.advanceTimersByTime(299));
    expect(onSearch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("milk");
  });

  it("goes back to the full list when the text drops below three characters", () => {
    const onSearch = vi.fn();
    render(<SearchBar label="Search tasks" onSearch={onSearch} />);
    type("milk");
    act(() => vi.advanceTimersByTime(300));
    type("mi");
    act(() => vi.advanceTimersByTime(300));
    expect(onSearch).toHaveBeenLastCalledWith("");
  });

  it("clears the text and the search with the × button", () => {
    const onSearch = vi.fn();
    render(<SearchBar label="Search tasks" onSearch={onSearch} />);
    type("milk");
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect((screen.getByLabelText("Search tasks") as HTMLInputElement).value).toBe("");
    expect(onSearch).toHaveBeenLastCalledWith("");
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  });
});
