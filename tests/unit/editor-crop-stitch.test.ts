import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildSessionCompositePlacements } from '../../src/editor/canvas-stage';
import { initEditor } from '../../src/editor/index';
import { getCaptureSession, saveCaptureSession } from '../../src/shared/db';
import type { CaptureSession } from '../../src/shared/types';

describe('Editor Physical DPI Cropping and Multi-Frame Scroll Stitching (Task 018)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="editor-app"></div>';
  });

  it('computes Retina @2x physical crop placement for Selection and Image captures', () => {
    const selectionSession: CaptureSession = {
      id: 'cap_selection_crop_test',
      mode: 'selection',
      sourceUrl: 'https://docs.snapmark.pl/guide',
      sourceDomain: 'docs.snapmark.pl',
      capturedAt: '2026-11-21T15:10:00.000Z',
      dpr: 2,
      totalWidthCss: 440,
      totalHeightCss: 80,
      cropRectCss: {
        x: 80,
        y: 130,
        width: 440,
        height: 80,
      },
      frames: [
        {
          blob: new Blob(['selection-frame'], { type: 'image/png' }),
          scrollYCss: 0,
          viewportWidthCss: 1440,
          viewportHeightCss: 900,
        },
      ],
    };

    const placements = buildSessionCompositePlacements(selectionSession);
    expect(placements).toHaveLength(1);
    expect(placements[0]).toEqual({
      frameIndex: 0,
      sx: 160,
      sy: 260,
      sw: 880,
      sh: 160,
      dx: 0,
      dy: 0,
      dw: 880,
      dh: 160,
    });
  });

  it('computes seamless multi-frame stitching placements with a partial final scroll step at @2x DPR', () => {
    const fullPageSession: CaptureSession = {
      id: 'cap_fullpage_stitch_test',
      mode: 'fullpage',
      sourceUrl: 'https://snapmark.pl/changelog',
      sourceDomain: 'snapmark.pl',
      capturedAt: '2026-11-21T15:15:00.000Z',
      dpr: 2,
      totalWidthCss: 1440,
      totalHeightCss: 2250,
      frames: [
        {
          blob: new Blob(['frame-0'], { type: 'image/png' }),
          scrollYCss: 0,
          viewportWidthCss: 1440,
          viewportHeightCss: 900,
        },
        {
          blob: new Blob(['frame-1'], { type: 'image/png' }),
          scrollYCss: 900,
          viewportWidthCss: 1440,
          viewportHeightCss: 900,
        },
        {
          blob: new Blob(['frame-2-partial'], { type: 'image/png' }),
          scrollYCss: 1350,
          viewportWidthCss: 1440,
          viewportHeightCss: 900,
        },
      ],
    };

    const placements = buildSessionCompositePlacements(fullPageSession);
    expect(placements).toHaveLength(3);

    // Frame 0: full 1800px height at dy=0
    expect(placements[0]).toEqual({
      frameIndex: 0,
      sx: 0,
      sy: 0,
      sw: 2880,
      sh: 1800,
      dx: 0,
      dy: 0,
      dw: 2880,
      dh: 1800,
    });

    // Frame 1: full 1800px height at dy=1800
    expect(placements[1]).toEqual({
      frameIndex: 1,
      sx: 0,
      sy: 0,
      sw: 2880,
      sh: 1800,
      dx: 0,
      dy: 1800,
      dw: 2880,
      dh: 1800,
    });

    // Frame 2: partial scroll step (scrollY=1350 overlaps coveredBottom=1800 by 450 CSS px = 900 physical px)
    // Slices only bottom 900 physical px (sy=900, sh=900) and places at dy=3600
    expect(placements[2]).toEqual({
      frameIndex: 2,
      sx: 0,
      sy: 900,
      sw: 2880,
      sh: 900,
      dx: 0,
      dy: 3600,
      dw: 2880,
      dh: 900,
    });
  });

  it('hydrates a multi-frame Full-Page session with max-height warning in initEditor and purges IndexedDB', async () => {
    const fullPageSession: CaptureSession = {
      id: 'cap_live_fullpage_maxheight',
      mode: 'fullpage',
      sourceUrl: 'https://docs.snapmark.pl/long-guide',
      sourceDomain: 'docs.snapmark.pl',
      capturedAt: '2026-11-21T15:20:00.000Z',
      dpr: 2,
      totalWidthCss: 1440,
      totalHeightCss: 2250,
      exceededMaxHeight: true,
      frames: [
        {
          blob: new Blob(['f0'], { type: 'image/png' }),
          scrollYCss: 0,
          viewportWidthCss: 1440,
          viewportHeightCss: 900,
        },
        {
          blob: new Blob(['f1'], { type: 'image/png' }),
          scrollYCss: 900,
          viewportWidthCss: 1440,
          viewportHeightCss: 900,
        },
        {
          blob: new Blob(['f2'], { type: 'image/png' }),
          scrollYCss: 1350,
          viewportWidthCss: 1440,
          viewportHeightCss: 900,
        },
      ],
    };

    await saveCaptureSession(fullPageSession);

    const root = document.getElementById('editor-app')!;
    const controller = initEditor(root, {
      initialSearch: '?captureId=cap_live_fullpage_maxheight',
    });

    await controller.ready;

    const state = controller.getState();
    expect(state.captureMode).toBe('fullpage');
    expect(state.prototypeState).toBe('max-height-warning');
    expect(state.framePlacements).toHaveLength(3);

    // Canvas physical pixel dimensions match 1440x2250 @2x = 2880x4500
    const canvas = root.querySelector<HTMLCanvasElement>('#editor-canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.width).toBe(2880);
    expect(canvas?.height).toBe(4500);
    expect(canvas?.style.width).toBe('1440px');
    expect(canvas?.style.height).toBe('2250px');

    // Warning banner is shown for exceededMaxHeight
    const banner = root.querySelector('#max-height-banner');
    expect(banner).not.toBeNull();

    // IndexedDB record was immediately purged after loading onto canvas
    const afterConsume = await getCaptureSession('cap_live_fullpage_maxheight');
    expect(afterConsume).toBeNull();
  });
});
