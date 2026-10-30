# A failed build never replaces the live site (T7.4)

## How it is guaranteed

`deploy.yml` has two jobs. **build** does everything that can fail; **deploy** has `needs: build`, so GitHub starts it only if every step of *build* succeeded. A failure anywhere leaves the previously published site exactly as it was. The steps, in order:

1. `npm run validate`: the workbook must pass the full schema and content validation.
2. `npm run typecheck` and `npm test`: the code and the unit tests (including the failure tests below).
3. `npm run build`: re-validates while exporting, then builds every page. It also stops for a missing article image, a published tool with no component, or a test-build switch set in the deploy workflow.
4. `npm run check-build`: sanity checks on the finished build, because a build can succeed and still be wrong. It fails if a core file is missing, the home page has no title or heading, the sitemap looks empty or lists a page that was not built, the admin page lacks its security policy, or the output contains preview ad boxes (a test build).
5. Upload, then deploy.

Content committed from the admin page goes through the same path. The admin also validates before it commits, so a bad workbook is normally refused before it ever reaches `main`; if one does arrive some other way (a direct edit, for example), the build fails and nothing is published.

## Proof

**Automated** (`tests/build-failures.test.ts`, runs in every build): a valid workbook passes; an invalid address, a broken reference, a tool with no component, an unusable status, a file that is not a workbook, and a missing file each make `validate` and `export` exit with an error and write no export; the three preview switches are refused when the workflow is the deploy workflow; and each `checkBuild` rule is exercised, including with a base path.

**On GitHub, 30 October 2026.** I pushed a throwaway branch with a deliberately invalid page address in the workbook and ran the deploy workflow on it:

- The *build* job failed at **Validate workbook**; every later step was skipped.
- The *deploy* job was **skipped**, and no deployment was created.
- The live site kept its last-modified time and content; the newest deployment stayed the previous one from `main`.
- The branch was then deleted.

## What you will see when it happens for real

- On GitHub, the **Actions** tab shows the run in red with the failing step named. If you saved from the admin, the **Site status** panel shows *Failed* with a plain-words reason and says the live site still shows the previous version.
- The live site is unchanged. Fix the workbook (or revert the commit from **History**) and save again.

## Not covered

- **A problem that passes every check** (a typo in an article, say) is published like any other change. Use the article preview, and restore an earlier version from History if needed.
- **GitHub itself being down** can delay a deploy; it does not publish a half-built site.
