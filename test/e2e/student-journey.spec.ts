/**
 * E2E Test: Student Journey (current portal)
 *
 * Requirements:
 * - npm install -D @playwright/test
 * - npx playwright install
 *
 * Run:
 * npx playwright test test/e2e/student-journey.spec.ts
 */

import { test, expect, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.PORTAL_URL || 'http://localhost:3000';

async function isVisible(locator: Locator, timeout = 5000): Promise<boolean> {
    try {
        await locator.first().waitFor({ state: 'visible', timeout });
        return true;
    } catch {
        return false;
    }
}

async function loginAsStudent(page: Page): Promise<void> {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const studentRoleButton = page.getByRole('button', { name: /Apprenant\s*Etudiant/i });
    if (await isVisible(studentRoleButton, 3000)) {
        await studentRoleButton.click();
    }

    const autoFillButton = page.getByRole('button', { name: /Auto Fill Demo/i });
    if (await isVisible(autoFillButton, 8000)) {
        await autoFillButton.click();
    } else {
        await page.getByLabel('Email').fill('student01@pmp.edu');
        await page.locator('input[type="password"]').first().fill('qa-pass-123');
    }

    await page.getByRole('button', { name: /Se connecter/i }).click();
    await page.waitForURL('**/student', { timeout: 30000 });
    await expect(page.locator('h1').first()).toContainText(/Bonjour/i);
}

async function answerCurrentQuestion(page: Page): Promise<void> {
    const answerButton = page.locator('h2 + div button').first();
    await expect(answerButton).toBeVisible();
    await answerButton.click();
}

test.describe('Student Journey', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsStudent(page);
    });

    test('shows student dashboard quick actions', async ({ page }) => {
        await expect(page.getByRole('link', { name: /Mes Quiz/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Ma Progression/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Mes Badges/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Transactions/i }).first()).toBeVisible();
    });

    test('completes quiz flow from quiz catalog', async ({ page }) => {
        await page.goto(`${BASE_URL}/student/quizzes`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Mes Quiz/i })).toBeVisible();

        const quizLink = page.locator('a[href^="/student/quiz/"]').first();
        await expect(quizLink).toBeVisible();
        await quizLink.click();

        await page.waitForURL(/\/student\/quiz\//, { timeout: 20000 });
        await expect(page.getByRole('heading', { name: /Quiz non disponible/i })).toHaveCount(0);

        for (let i = 0; i < 20; i++) {
            const submitButton = page.getByRole('button', { name: /Soumettre/i });
            const submitVisible = await submitButton.isVisible().catch(() => false);

            if (submitVisible) {
                const submitEnabled = await submitButton.isEnabled().catch(() => false);
                if (!submitEnabled) {
                    await answerCurrentQuestion(page);
                }
                await expect(submitButton).toBeEnabled();
                await submitButton.click();
                break;
            }

            await answerCurrentQuestion(page);
            const nextButton = page.getByRole('button', { name: /Suivant/i });
            const nextVisible = await nextButton.isVisible().catch(() => false);
            if (nextVisible) {
                await expect(nextButton).toBeEnabled();
                await nextButton.click();
                continue;
            }

            const submitVisibleAfterAnswer = await submitButton.isVisible().catch(() => false);
            if (submitVisibleAfterAnswer) {
                await expect(submitButton).toBeEnabled();
                await submitButton.click();
                break;
            }

            throw new Error('Neither next nor submit buttons were available after answering.');
        }

        const passHeading = page.getByRole('heading', { name: /Quiz valide/i });
        const failHeading = page.getByRole('heading', { name: /Quiz non valide/i });
        await expect(passHeading.or(failHeading)).toBeVisible();
    });

    test('opens student pages for progression, badges and transactions', async ({ page }) => {
        await page.goto(`${BASE_URL}/student/progress`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Ma Progression/i })).toBeVisible();

        await page.goto(`${BASE_URL}/student/badges`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Mes Badges/i })).toBeVisible();

        await page.goto(`${BASE_URL}/student/transactions`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Transactions Plateforme/i })).toBeVisible();
    });

    test('opens lab and ctf student pages', async ({ page }) => {
        await page.goto(`${BASE_URL}/lab`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Security\s*Lab/i })).toBeVisible();

        await page.goto(`${BASE_URL}/student/ctf`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: '404' })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: /Security Labs/i })).toBeVisible();
    });
});
