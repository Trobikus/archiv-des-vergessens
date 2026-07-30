import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('FullscreenToggle', () => {
  let mockWindow;

  beforeEach(() => {
    mockWindow = {
      isFullscreen: vi.fn(),
      setFullscreen: vi.fn().mockResolvedValue(undefined),
      maximize: vi.fn().mockResolvedValue(undefined),
      unmaximize: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('should toggle from fullscreen to maximized window when currentWindow is in fullscreen', async () => {
    mockWindow.isFullscreen.mockResolvedValue(true);

    const toggleFullscreen = async (currentWindow) => {
      if (currentWindow) {
        const isFS = await currentWindow.isFullscreen();
        if (isFS) {
          await currentWindow.setFullscreen(false);
          await currentWindow.maximize();
        } else {
          await currentWindow.setFullscreen(true);
        }
      }
    };

    await toggleFullscreen(mockWindow);

    expect(mockWindow.isFullscreen).toHaveBeenCalled();
    expect(mockWindow.setFullscreen).toHaveBeenCalledWith(false);
    expect(mockWindow.maximize).toHaveBeenCalled();
  });

  it('should toggle from windowed to fullscreen when currentWindow is not in fullscreen', async () => {
    mockWindow.isFullscreen.mockResolvedValue(false);

    const toggleFullscreen = async (currentWindow) => {
      if (currentWindow) {
        const isFS = await currentWindow.isFullscreen();
        if (isFS) {
          await currentWindow.setFullscreen(false);
          await currentWindow.maximize();
        } else {
          await currentWindow.setFullscreen(true);
        }
      }
    };

    await toggleFullscreen(mockWindow);

    expect(mockWindow.isFullscreen).toHaveBeenCalled();
    expect(mockWindow.setFullscreen).toHaveBeenCalledWith(true);
    expect(mockWindow.maximize).not.toHaveBeenCalled();
  });

  it('should fall back to DOM fullscreen API if currentWindow is null', async () => {
    const requestFullscreenMock = vi.fn().mockResolvedValue(undefined);
    globalThis.document = {
      fullscreenElement: null,
      documentElement: {
        requestFullscreen: requestFullscreenMock
      }
    };

    const toggleFullscreen = async (currentWindow) => {
      if (currentWindow) {
        const isFS = await currentWindow.isFullscreen();
        if (isFS) {
          await currentWindow.setFullscreen(false);
          await currentWindow.maximize();
        } else {
          await currentWindow.setFullscreen(true);
        }
        return;
      }

      if (!globalThis.document.fullscreenElement) {
        if (globalThis.document.documentElement.requestFullscreen) {
          await globalThis.document.documentElement.requestFullscreen();
        }
      }
    };

    await toggleFullscreen(null);

    expect(requestFullscreenMock).toHaveBeenCalled();
  });
});
