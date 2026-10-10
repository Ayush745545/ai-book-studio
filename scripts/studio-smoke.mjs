import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.BASE_URL || "http://127.0.0.1:3001";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const books = [];
let checks = 0;
function check(value, label) {
  assert.ok(value, label);
  checks++;
  console.log(`PASS ${label}`);
}
try {
  await page.goto(base);
  await page.screenshot({ path: ".local/qa/home-desktop.png", fullPage: true });
  check(
    (await page.locator(".studio-format-card").count()) === 5,
    "All five formats are visible",
  );
  await page
    .getByRole("link", { name: /Get Started/ })
    .first()
    .click();
  await page.waitForURL(/\/login/);
  check(
    new URL(page.url()).searchParams
      .get("callbackUrl")
      ?.includes("format=book"),
    "Selected format survives sign-in redirect",
  );
  await page
    .getByLabel("Email address")
    .fill(`studio-qa-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("Studio-test-8472");
  await page.getByRole("button", { name: "Continue to my studio" }).click();
  await page.waitForURL(/\/books\/new/);
  check(
    await page
      .getByRole("heading", { name: "Make room for your next big idea." })
      .isVisible(),
    "Account creation and callback work",
  );
  for (const [format, name, target] of [
    ["book", "Book", 120],
    ["ebook", "E-Book", 50],
    ["guide", "Guide", 30],
    ["workbook", "Workbook", 15],
    ["audiobook", "Audiobook", 50],
  ]) {
    await page.goto(`${base}/books/new?format=${format}`);
    await page
      .getByRole("button", { name: `Continue with ${name}`, exact: false })
      .click();
    await page
      .getByLabel("Working title")
      .fill(`QA ${name}: A practical beginning`);
    await page.getByLabel("Who is it for?").fill("Curious beginners");
    await page
      .getByLabel("What is it about?")
      .fill("A practical writing project with a clear purpose.");
    await page.getByRole("button", { name: "Plan the structure" }).click();
    check(
      Number(await page.getByRole("spinbutton").inputValue()) === target,
      `${name} page target`,
    );
    await page.getByRole("button", { name: "Create my writing space" }).click();
    await page.waitForURL(/\/books\/(?!new)[^/]+$/);
    const id = page.url().split("/").pop();
    books.push(id);
    await page.getByLabel("Manuscript content").waitFor();
    const before = await (
      await context.request.get(`${base}/api/books/${id}`)
    ).json();
    check(
      before.book.format === format &&
        before.book.targetPages === target &&
        before.book.audience === "Curious beginners",
      `${name} brief is persisted`,
    );
    check(
      before.book.chapters.length > 0 &&
        before.book.chapters[0].notes.length > 0,
      `${name} outline and planning notes are created`,
    );
    await page
      .getByLabel("Manuscript content")
      .fill(
        `A practical beginning for the ${name}. This text must remain saved when switching sections.\n\nTry this approach in your own work.`,
      );
    await page.locator(".studio-chapter-select").nth(1).click();
    await expect(page.getByLabel("Section title")).toHaveValue(before.book.chapters[1].title);
    const after = await (
      await context.request.get(`${base}/api/books/${id}`)
    ).json();
    check(
      after.book.chapters[0].content.includes("must remain saved"),
      `${name} saves before changing sections`,
    );
    await page.locator(".studio-chapter-select").first().click();
    await expect(page.getByLabel("Section title")).toHaveValue(before.book.chapters[0].title);
    await page
      .getByLabel("Manuscript content")
      .fill(
        `A revised beginning for the ${name}. This is the final version.\n\nUse the lessons in this chapter to take your next step.`,
      );
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await page.getByLabel("Preview section").selectOption("0");
    check(
      await page
        .getByText(
          `A revised beginning for the ${name}. This is the final version.`,
          { exact: true },
        )
        .isVisible(),
      `${name} preview includes latest saved draft`,
    );
    const history = await (
      await context.request.get(
        `${base}/api/chapters/${before.book.chapters[0].id}/versions`,
      )
    ).json();
    check(
      history.versions.some((v) => v.content.includes("must remain saved")),
      `${name} previous content is recoverable`,
    );
    await page.getByRole("button", { name: "Write", exact: true }).click();
    await page.getByLabel("Section title").fill(`First ${name} section`);
    await page.getByLabel("Section type").selectOption("FRONT_MATTER");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("All changes saved", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: `Move First ${name} section down` })
      .click();
    await page.waitForResponse(
      (res) =>
        res.url().endsWith(`/api/books/${id}`) &&
        res.request().method() === "GET",
    );
    const reordered = await (
      await context.request.get(`${base}/api/books/${id}`)
    ).json();
    check(
      reordered.book.chapters[1].title === `First ${name} section`,
      `${name} reorder persists`,
    );
    await page
      .getByRole("button", { name: "Export & publish", exact: true })
      .click();
    for (const kind of ["PDF", "EPUB", "TXT"]) {
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: `Download ${kind}`, exact: true })
        .click();
      const result = await download;
      await result.saveAs(`.local/qa/${format}.${kind.toLowerCase()}`);
      check(
        (await fs.stat(`.local/qa/${format}.${kind.toLowerCase()}`)).size > 100,
        `${name} ${kind} download works`,
      );
    }
    check(
      !(
        await context.request.get(`${base}/api/books/${id}/export?format=bad`)
      ).ok(),
      `${name} rejects unsupported exports`,
    );
    if (format === "book") {
      await page.getByRole("button", { name: "Write", exact: true }).click();
      await page.getByLabel("Manuscript content").waitFor();
      await page.route("**/api/chapters/*", async route => {
        if (route.request().method() === "PUT") await new Promise(resolve => setTimeout(resolve, 500));
        await route.continue();
      });
      await page.getByLabel("Manuscript content").fill("First snapshot during a delayed save.");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.getByLabel("Manuscript content").fill("The final version typed while the earlier save was still running.");
      await page.getByText("All changes saved", { exact: true }).waitFor();
      await page.unroute("**/api/chapters/*");
      const concurrent = await (await context.request.get(`${base}/api/books/${id}`)).json();
      check(concurrent.book.chapters.some(c => c.content.includes("typed while")), "Edits made during a save are also persisted");
      await page.route("**/api/chapters/*", route => route.request().method() === "PUT" ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Simulated save outage" }) }) : route.continue());
      await page.getByLabel("Manuscript content").fill("The final version kept safely during a simulated save outage.");
      await page.locator(".studio-chapter-select").first().click();
      await page.getByRole("button", { name: "Retry save" }).waitFor();
      check(await page.getByLabel("Section title").inputValue() === `First ${name} section`, "Save failure keeps the current section open");
      check(await page.evaluate(() => Object.values(localStorage).some(value => value.includes("simulated save outage"))), "Failed saves keep a recoverable local draft");
      await page.unroute("**/api/chapters/*");
      await page.getByRole("button", { name: "Retry save" }).click();
      await page.getByText("All changes saved", { exact: true }).waitFor();
      const recovered = await (await context.request.get(`${base}/api/books/${id}`)).json();
      check(recovered.book.chapters.some(c => c.content.includes("simulated save outage")), "Retry saves the recovered draft");
      await page.screenshot({
        path: ".local/qa/editor-desktop.png",
        fullPage: true,
        style: ".pointer-events-none.fixed.bottom-4 { display:none !important; }",
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByLabel("Current section").waitFor();
      await page.getByRole("button", { name: "Notes", exact: true }).click();
      await page.getByRole("button", { name: "Close writing notes" }).waitFor();
      check(await page.locator(".studio-writing-notes").isVisible(), "Mobile writing notes can be opened");
      await page.getByRole("button", { name: "Close writing notes" }).click();
      await page.screenshot({
        path: ".local/qa/editor-mobile.png",
        fullPage: true,
        style: ".pointer-events-none.fixed.bottom-4 { display:none !important; }",
      });
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Mobile editor fits the viewport",
      );
      await page.setViewportSize({ width: 1440, height: 1050 });
    }
    if (format === "audiobook") {
      await page.getByRole("button", { name: "Listen", exact: true }).click();
      await page.getByRole("heading", { name: "Give your story a voice." }).waitFor();
      check(
        await page
          .getByRole("heading", { name: "Give your story a voice." })
          .isVisible(),
        "Audiobook listening workspace works",
      );
      check(
        !(await page
          .getByRole("button", { name: "Download track MP3" })
          .isEnabled()),
        "AI audio clearly remains unavailable without a key",
      );
      const audio = await context.request.post(
        `${base}/api/books/${id}/audio`,
        { data: { chapterId: before.book.chapters[0].id } },
      );
      check(
        audio.status() === 503,
        "AI audio returns a useful missing-key response",
      );
    }
  }
  const source = await (
    await context.request.get(`${base}/api/books/${books[0]}`)
  ).json();
  const copied = await (
    await context.request.post(`${base}/api/books`, {
      data: {
        title: "QA audiobook from source",
        format: "audiobook",
        sourceBookId: books[0],
      },
    })
  ).json();
  books.push(copied.book.id);
  check(
    copied.book.chapters.some((c) => c.content.includes("final version")),
    "Audiobook imports saved manuscript content",
  );
  check(
    copied.book.chapters[0].id !== source.book.chapters[0].id,
    "Audiobook copy leaves original independent",
  );
  const other = await browser.newContext();
  const unauthorized = await other.request.get(
    `${base}/api/books/${books[0]}/export?format=epub`,
  );
  check(unauthorized.status() === 401, "Exports require authentication");
  await other.close();
  const activity = await (await context.request.get(`${base}/api/activity?timeZone=Asia%2FKolkata`)).json();
  check(activity.days.some(day => day.edits > 0 && day.wordsAdded > 0), "Writing contributions are recorded from actual saves");
  const previousCount = activity.days.reduce((sum, day) => sum + day.edits, 0);
  const currentBook = await (await context.request.get(`${base}/api/books/${books[0]}`)).json();
  const currentChapter = currentBook.book.chapters.find(chapter => chapter.wordCount > 0);
  await context.request.put(`${base}/api/chapters/${currentChapter.id}`, { data: { content: currentChapter.content } });
  const unchanged = await (await context.request.get(`${base}/api/activity?timeZone=Asia%2FKolkata`)).json();
  check(unchanged.days.reduce((sum, day) => sum + day.edits, 0) === previousCount, "Saving unchanged content does not create a contribution");
  const invalidZone = await context.request.get(`${base}/api/activity?timeZone=invalid-zone`);
  check(invalidZone.status() === 400, "Activity rejects invalid time zones");
  await page.goto(`${base}/dashboard`);
  await page.getByRole("heading", { name: "Your writing activity" }).waitFor();
  await page.getByRole("button", { name: "Refresh writing activity" }).waitFor({state:"visible"});
  await expect(page.getByRole("button", { name: "Refresh writing activity" })).toBeEnabled();
  check(await page.locator(".studio-activity-day").count() >= 365, "Calendar displays a complete contribution year");
  const todayCell = page.locator(`.studio-activity-day[data-date="${activity.today}"]`);
  await todayCell.click();
  check((await page.locator(".studio-activity-detail").innerText()).includes("saved"), "Selecting a calendar day shows real writing details");
  await page.getByRole("button", { name: "90 days", exact: true }).click();
  check(await page.locator(".studio-activity-day").count() < 105, "90-day view changes the calendar range");
  await page.getByRole("button", { name: "12 months", exact: true }).click();
  await page.screenshot({ path: ".local/qa/dashboard-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Mobile calendar scrolls without widening the page");
  await page.screenshot({ path: ".local/qa/dashboard-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(`${base}/settings`);
  await page.getByLabel("OpenRouter API key").waitFor();
  await expect(page.getByLabel("Writing provider")).toHaveValue("openrouter");
  check(await page.getByLabel("Writing provider").inputValue() === "openrouter", "OpenRouter is the default writing provider");
  const connection = await (await context.request.get(`${base}/api/settings/ai`)).json();
  check(!("apiKey" in connection) && !("openRouterKey" in connection), "AI connection status never exposes credentials");
  const invalidKey = await context.request.post(`${base}/api/settings/ai`, { data: { apiKey: "invalid-key" } });
  check(invalidKey.status() === 400, "Invalid API keys are rejected before contacting a provider");
  const noKeyDraft = await context.request.post(`${base}/api/ai/chapter`, { data: { bookTitle: "A safe test", chapterTitle: "A first section", provider: "openrouter" } });
  check(!noKeyDraft.ok() && (await noKeyDraft.json()).error.includes("Connect OpenRouter"), "Writing without a key gives a useful connection message");
  await page.screenshot({ path: ".local/qa/settings-desktop.png", fullPage: true });
  await page.goto(base);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".local/qa/home-mobile.png", fullPage: true });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile format picker fits the viewport",
  );
  check(errors.length === 0, `No browser errors: ${errors.join(", ")}`);
  console.log(`\n${checks} checks passed.`);
} catch (error) {
  await page.screenshot({ path: ".local/qa/failure.png", fullPage: true }).catch(() => {});
  throw error;
} finally {
  const owned = await context.request.get(`${base}/api/books`).then(res => res.json()).catch(() => ({}));
  for (const book of owned.books ?? []) if (book.title.startsWith("QA ") && !books.includes(book.id)) books.push(book.id);
  for (const id of books)
    await context.request.delete(`${base}/api/books/${id}`).catch(() => {});
  await browser.close();
}
