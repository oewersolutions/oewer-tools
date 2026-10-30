# Tool page content

Help, examples, FAQ and related tools for each tool live in the `tool_settings` sheet, one row per part. Each row has the tool's `tool_id`, a `setting_key`, a `setting_value` and a `value_type`.

| `setting_key` | `value_type` | `setting_value` |
|---|---|---|
| `help` | `string` | Restricted Markdown shown under the tool (for example a "How to use" heading and a list). |
| `examples` | `json` | A list of `{"title": "...", "text": "..."}` (up to 10; title up to 100 characters, text up to 500). |
| `faq` | `json` | A list of `{"q": "...", "a": "..."}` (up to 10; question up to 200 characters, answer up to 1000). Also published as FAQ structured data. |
| `guides` | `json` | A list of article ids, such as `["POST0001"]` (up to 10). The tool page shows them as "Guides", and each article automatically shows a "Try it yourself" card for the tool. |
| `related` | `json` | A list of tool ids, such as `["TOOL0005", "TOOL0007"]` (up to 10; three are shown). When absent, other published tools in the same category are suggested. |

Rules:

- All parts are optional. A part that is missing is simply not shown.
- A value is at most 6000 characters, so keep each part short.
- `npm run validate` checks the shape of every part, and that `related` ids exist and are not the tool itself.
- No HTML. Markdown is the same restricted set used for pages and posts.
- Tool pages only exist for published tools, so content for a draft tool is not visible until it is published. A tool can only be published when its `component_key` has a component (checked by `npm run validate`).

The seed content is in `scripts/tool-content.ts`.
