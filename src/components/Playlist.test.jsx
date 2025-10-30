import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Playlist from "./Playlist";
import { handlePlaylistItemKeyDown } from "./playlistKeydown";

afterEach(() => {
  vi.clearAllMocks();
});

const SAMPLE_TRACKS = [
  {
    id: "alpha",
    title: "Alpha",
    artist: "Artist A",
    length: 185,
  },
  {
    id: "beta",
    title: "Beta",
    artist: "Artist B",
    length: 200,
  },
];

const setup = (overrides = {}) => {
  const props = {
    tracks: SAMPLE_TRACKS,
    currentTrackIndex: 0,
    onTrackSelect: vi.fn(),
    onUpload: vi.fn(),
    onReset: vi.fn(),
    onRemoveTrack: vi.fn(),
    ...overrides,
  };

  render(<Playlist {...props} />);
  return props;
};

describe("Playlist interactions", () => {
  it("calls onRemoveTrack when the remove button is clicked", () => {
    const { onRemoveTrack, onTrackSelect } = setup();

    const removeButton = screen.getByRole("button", { name: /remove alpha/i });
    fireEvent.click(removeButton);

    expect(onRemoveTrack).toHaveBeenCalledTimes(1);
    expect(onRemoveTrack).toHaveBeenCalledWith(0);
    expect(onTrackSelect).not.toHaveBeenCalled();
  });
});

describe("handleTrackKeyDown", () => {
  const createEvent = (key) => {
    const event = {
      key,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
    return event;
  };

  it("selects the track when Enter is pressed", () => {
    const event = createEvent("Enter");
    const onSelect = vi.fn();
    const onRemove = vi.fn();

    handlePlaylistItemKeyDown({ event, index: 2, onSelect, onRemove });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(2);
    expect(onRemove).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it("removes the track when Delete is pressed", () => {
    const event = createEvent("Delete");
    const onSelect = vi.fn();
    const onRemove = vi.fn();

    handlePlaylistItemKeyDown({ event, index: 1, onSelect, onRemove });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("removes the track when Backspace is pressed", () => {
    const event = createEvent("Backspace");
    const onRemove = vi.fn();

    handlePlaylistItemKeyDown({ event, index: 0, onSelect: vi.fn(), onRemove });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("ignores other keys", () => {
    const event = createEvent("ArrowDown");
    const onSelect = vi.fn();
    const onRemove = vi.fn();

    handlePlaylistItemKeyDown({ event, index: 5, onSelect, onRemove });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
