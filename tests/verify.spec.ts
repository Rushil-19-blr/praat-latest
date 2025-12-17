
import { test, expect } from '@playwright/test';

test('login and verify dashboard', async ({ page }) => {
  await page.goto('http://localhost:3001');

  // Wait for the login screen to be visible
  await expect(page.getByText('Login As')).toBeVisible({ timeout: 10000 });

  // Enter the 4-digit code
  const codeInputs = await page.locator('input[type="text"][maxlength="1"]').all();
  await codeInputs[0].fill('9');
  await codeInputs[1].fill('9');
  await codeInputs[2].fill('9');
  await codeInputs[3].fill('9');

  // Enter the password
  await page.locator('input[type="password"]').fill('asdfgh');

  // Locate the slider handle using the SVG path inside it for precision
  const handle = page.locator('div:has(> svg > path[d="m9 18 6-6-6-6"])').first();
  const handleBoundingBox = await handle.boundingBox();

  if (!handleBoundingBox) {
    throw new Error('Could not find slider handle');
  }

  // Locate the slider container to determine the drag distance
  const slider = handle.locator('xpath=..');
  const sliderBoundingBox = await slider.boundingBox();

  if (!sliderBoundingBox) {
    throw new Error('Could not find slider container');
  }

  // Define the start and end points for the drag action
  const startPoint = {
    x: handleBoundingBox.x + handleBoundingBox.width / 2,
    y: handleBoundingBox.y + handleBoundingBox.height / 2,
  };

  const endPoint = {
    x: sliderBoundingBox.x + sliderBoundingBox.width * 0.9, // Drag 90% of the way
    y: handleBoundingBox.y + handleBoundingBox.height / 2,
  };

  // Simulate a drag using mouse actions
  await page.mouse.move(startPoint.x, startPoint.y);
  await page.mouse.down();
  await page.mouse.move(endPoint.x, endPoint.y);
  await page.mouse.up();

  // After a successful swipe, the dashboard should be visible
  await expect(page.getByText('Welcome back, Student!')).toBeVisible({ timeout: 10000 });

  // Capture a screenshot to confirm the UI state
  await page.screenshot({ path: '/home/jules/verification/dashboard_after_login.png' });
});
