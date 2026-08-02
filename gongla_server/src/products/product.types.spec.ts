import { statusAt } from './product.types';

describe('statusAt', () => {
  const now = new Date('2026-08-03T03:00:00.000Z'); // 한국시간 12:00

  it('시작 전 상품은 scheduled이다', () => {
    expect(
      statusAt('2026-08-03T04:00:00.000Z', '2026-08-07T03:00:00.000Z', now),
    ).toBe('scheduled');
  });

  it('판매 기간 안의 상품은 active이다', () => {
    expect(
      statusAt('2026-08-02T15:00:00.000Z', '2026-08-07T03:00:00.000Z', now),
    ).toBe('active');
  });

  it('종료시각과 같아지면 ended이다', () => {
    expect(
      statusAt('2026-08-01T00:00:00.000Z', '2026-08-03T03:00:00.000Z', now),
    ).toBe('ended');
  });
});
