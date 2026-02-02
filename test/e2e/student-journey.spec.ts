/**
 * E2E Test: Student Journey
 * Tests the complete student learning path
 *
 * Requirements:
 * - npm install -D @playwright/test
 * - npx playwright install
 *
 * Run: npx playwright test test/e2e/student-journey.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Student Learning Journey', () => {
    test.beforeEach(async ({ page }) => {
        // Mock login as student
        await page.goto('http://localhost:3001/login');
        await page.fill('input[name="email"]', 'student01@pmp.edu');
        await page.fill('input[name="password"]', 'student123');
        await page.click('button[type="submit"]');

        // Wait for redirect to student dashboard
        await page.waitForURL('http://localhost:3001/student');
    });

    test('should display student dashboard with modules', async ({ page }) => {
        // Verify student page loaded
        await expect(page.locator('h1')).toContainText('Mon Parcours');

        // Verify modules are displayed
        await expect(page.locator('text=Module 05')).toBeVisible();
        await expect(page.locator('text=3D Secure Multi-Domain')).toBeVisible();

        // Verify progress bar
        await expect(page.locator('text=65% COMPLÉTÉ')).toBeVisible();
    });

    test('should navigate to exercise from module', async ({ page }) => {
        // Click "Continuer l'exercice" link for Module 05
        await page.click('a[href*="localhost:3000?role=etudiant&module=5"]');

        // Should land on TPE-Web with exercise loaded
        await page.waitForURL(/localhost:3000\?role=etudiant&module=5/);

        // Verify TPE-Web loaded
        await expect(page.locator('text=TPE')).toBeVisible();
    });

    test('should navigate to theory page', async ({ page }) => {
        // Click theory link for Module 05
        await page.click('a[href="/student/theory/05"]');

        // Verify theory page loaded
        await expect(page.locator('h1')).toContainText('Module 05: 3D Secure');
        await expect(page.locator('text=Introduction')).toBeVisible();
    });

    test('should complete quiz and show results', async ({ page }) => {
        // Navigate to quiz
        await page.click('a[href="/student/quiz/04"]');

        // Verify quiz loaded
        await expect(page.locator('h1')).toContainText('Module 04: Protocoles ISO 8583');

        // Answer all questions
        for (let i = 0; i < 5; i++) {
            // Select first option (may not be correct, but for testing)
            await page.click('button:has-text("Identifier le type de transaction")');

            // Click Next/Finish
            if (i < 4) {
                await page.click('button:has-text("Suivant")');
            } else {
                await page.click('button:has-text("Terminer")');
            }

            // Wait for next question or results
            await page.waitForTimeout(500);
        }

        // Verify results page loaded
        await expect(
            page.locator('text=Félicitations').or(page.locator('text=Presque'))
        ).toBeVisible();

        // Should show score percentage
        await expect(page.locator('text=%')).toBeVisible();
    });

    test('should show badges and achievements', async ({ page }) => {
        // Verify achievements section exists
        await expect(page.locator('text=Succès')).toBeVisible();

        // Verify at least one badge is shown
        await expect(page.locator('text=ISO Master').or(page.locator('text=Key Guardian'))).toBeVisible();
    });

    test('should navigate between apps with context preserved', async ({ page }) => {
        // Click link to User-Cards-Web
        const [newPage] = await Promise.all([
            page.context().waitForEvent('page'),
            page.click('a[href*="localhost:3006"]'),
        ]);

        // Verify new page opened
        await newPage.waitForLoadState();
        expect(newPage.url()).toContain('localhost:3006');

        // Verify user is still authenticated (should see cards page, not login)
        await expect(newPage.locator('text=Cartes').or(newPage.locator('text=Cards'))).toBeVisible({
            timeout: 10000,
        });
    });
});

test.describe('Student Quiz Validation', () => {
    test('should require 80% to pass quiz', async ({ page }) => {
        await page.goto('http://localhost:3001/student/quiz/04');

        // Answer questions (simulate failing)
        for (let i = 0; i < 5; i++) {
            // Select first option every time
            await page.locator('button').nth(1).click(); // Click first option

            if (i < 4) {
                await page.click('button:has-text("Suivant")');
            } else {
                await page.click('button:has-text("Terminer")');
            }
            await page.waitForTimeout(300);
        }

        // Should show percentage
        await expect(page.locator('text=%')).toBeVisible();

        // If score < 80%, should show retry button
        const score = await page.locator('text=/%').textContent();
        if (score && parseInt(score) < 80) {
            await expect(page.locator('button:has-text("Réessayer")')).toBeVisible();
        }
    });
});

test.describe('Student Module Progression', () => {
    test('should track module completion', async ({ page }) => {
        await page.goto('http://localhost:3001/student');

        // Verify completed module shows checkmark
        await expect(
            page.locator('text=Module 04').locator('..').locator('[data-icon="check-circle"]')
        ).toBeVisible();

        // Verify locked module shows shield icon
        await expect(
            page.locator('text=Module 06').locator('..').locator('[data-icon="shield"]')
        ).toBeVisible();
    });
});
