import { chromium } from '@playwright/test';
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);
const baseURL = process.env.BARLEY_CAPTURE_URL || 'http://127.0.0.1:4173';
try {
  for (const [name, width, height] of [
    ['desktop', 1440, 1100],
    ['mobile', 390, 1000],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    await page.goto(baseURL);
    await page.getByText('오늘도, 우리 동네를 위해.').waitFor();
    await page.screenshot({ path: `docs/design/home-${name}.png` });
    await page.getByRole('button', { name: '내 지역 선택' }).click();
    await page
      .getByRole('button', { name: '영등포구 팀으로 참여하기' })
      .click();
    await page
      .getByRole('button', { name: '지역 선택 닫기' })
      .waitFor({ state: 'hidden' });
    for (const [id, title] of [
      ['tournament', '지역 토너먼트'],
      ['run', '러닝'],
      ['impact', '함께 만든 기부'],
      ['profile', '나의 기록'],
    ]) {
      await page.getByRole('tab', { name: title, exact: true }).click();
      await page.waitForTimeout(350);
      await page.screenshot({ path: `docs/design/${id}-${name}.png` });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
