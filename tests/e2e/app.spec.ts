import { test, expect } from '@playwright/test';
async function join(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '내 지역 선택' }).click();
  await page.getByRole('radio', { name: '서울 마포구' }).click();
  await page.getByRole('button', { name: '마포구 팀으로 참여하기' }).click();
}
test('dashboard renders without runtime errors or horizontal overflow', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByText('오늘도, 우리 동네를 위해.')).toBeVisible();
  await expect(page.getByText('로컬 데모 · 실제 대회·기부 아님')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/design/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test('region locks, simulated run pauses and persists, consent and deletion work', async ({
  page,
}) => {
  await page.goto('/');
  await join(page);
  await page.getByRole('button', { name: '서울 마포구' }).click();
  await expect(
    page.getByText(/이번 시즌 지역은 고정되어 있어요/),
  ).toBeVisible();
  await page.getByRole('tab', { name: '러닝', exact: true }).click();
  await page.getByRole('button', { name: '데모로 먼저 달려보기' }).click();
  await expect
    .poll(async () =>
      Number(await page.getByTestId('run-distance').textContent()),
    )
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '이어서 달리기' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '종료하고 기록 저장' }).click();
  await expect(page.getByText(/기록을 남겼어요/)).toBeVisible();
  await page.getByRole('textbox', { name: '닉네임' }).fill('테스트러너');
  await page.getByRole('switch').click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('barley-run:v1')!).profile.name,
      ),
    )
    .toBe('테스트러너');
  await page.reload();
  await page.getByRole('tab', { name: '나의 기록' }).click();
  await expect(page.getByRole('textbox', { name: '닉네임' })).toHaveValue(
    '테스트러너',
  );
  await expect(page.getByRole('switch')).toBeChecked();
  await expect(page.getByText(/· 마포구/)).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('barley-run:v1')!).runs.length,
    ),
  ).toBe(1);
  await page.getByRole('button', { name: '이 기기의 기록 모두 삭제' }).click();
  await page.getByRole('button', { name: '취소하고 돌아가기' }).click();
  await expect(page.getByText(/· 마포구/)).toBeVisible();
  await page.getByRole('button', { name: '이 기기의 기록 모두 삭제' }).click();
  await page
    .getByRole('button', { name: '모두 삭제하기', exact: true })
    .click();
  await expect(page.getByText('첫 번째 발자국을 기다려요.')).toBeVisible();
});
test('GPS position updates measure distance through the real location adapter', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({
    latitude: 37.52,
    longitude: 126.9,
    accuracy: 5,
  });
  await page.goto('/');
  await join(page);
  await page.getByRole('tab', { name: '러닝', exact: true }).click();
  await page
    .getByRole('button', { name: 'GPS 러닝 시작', exact: true })
    .click();
  await expect(page.getByText(/GPS 수신 중/)).toBeVisible();
  await page.waitForTimeout(1800);
  await context.setGeolocation({
    latitude: 37.52005,
    longitude: 126.9,
    accuracy: 5,
  });
  await expect(page.getByText('0.01', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '종료하고 기록 저장' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('barley-run:v1')!).runs[0].meters,
      ),
    )
    .toBeGreaterThan(5);
});
test('denied GPS permission leaves demo available', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) =>
      fail?.({
        code: 1,
        message: 'Denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
  });
  await page.goto('/');
  await join(page);
  await page.getByRole('tab', { name: '러닝', exact: true }).click();
  await page
    .getByRole('button', { name: 'GPS 러닝 시작', exact: true })
    .click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('button', { name: '데모로 먼저 달려보기' }),
  ).toBeEnabled();
});
test('corrupt storage is preserved until explicit reset', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('barley-run:v1', '{broken'),
  );
  await page.goto('/');
  await expect(page.getByText(/기존 기록을 읽지 못했어요/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('barley-run:v1'))).toBe(
    '{broken',
  );
  await page.getByRole('tab', { name: '나의 기록' }).click();
  await expect(
    page.getByRole('textbox', { name: '닉네임' }),
  ).not.toBeEditable();
});
