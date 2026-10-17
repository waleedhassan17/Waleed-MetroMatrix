import { coverRect } from '../FocusImage';

describe('coverRect', () => {
  it('fills a tall box with a wide photo, keeping the focus in view', () => {
    // 100×200 box, 2:1 photo → 400×200, focus at 75% across → shifted left.
    const r = coverRect({ width: 100, height: 200 }, { aspect: 2, x: 0.75, y: 0.5 });
    expect(r).toMatchObject({ width: 400, height: 200, top: 0 });
    expect(r.left).toBe(50 - 300);
  });

  it('never leaves a gap at an edge', () => {
    const left = coverRect({ width: 100, height: 200 }, { aspect: 2, x: 0, y: 0.5 });
    const right = coverRect({ width: 100, height: 200 }, { aspect: 2, x: 1, y: 0.5 });
    expect(left.left).toBe(0);
    expect(right.left).toBe(100 - 400);
  });

  it('fills a wide box with a narrower photo by height', () => {
    const r = coverRect({ width: 300, height: 100 }, { aspect: 1.5, x: 0.5, y: 0.2 });
    expect(r).toMatchObject({ width: 300, height: 200, left: 0 });
    expect(r.top).toBe(0);
  });
});
