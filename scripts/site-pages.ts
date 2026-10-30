/**
 * The wording of the legal and contact pages. The seed workbook uses it, and it is what was loaded into the real
 * workbook for launch (T7.1). Once the site is live, edit the pages in the admin: the workbook is the source of truth.
 */
export const CONTACT_EMAIL = "oewersolutions@gmail.com";
export const LEGAL_UPDATED = "30 October 2026";

const mail = `[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})`;

export const CONTACT_PAGE = `Questions, bug reports or ideas for a new tool? We would like to hear from you.

Email us at ${mail}.

# Helpful details to include

- The name of the tool and what you were trying to do.
- What you expected to happen, and what happened instead.
- Your browser and device, for example Chrome on Android.

Please do not send passwords, bank details or files containing personal information. We do not need them to help.

# Suggest a tool

Tell us what you would use it for and how often. Tools that save people the most time go to the top of our list.

# How we handle your email

We use your message and email address only to reply to you and to improve the site. We do not add you to a mailing list or share your details. See the [Privacy Policy](/privacy-policy) for more.`;

export const PRIVACY_PAGE = `Last updated: ${LEGAL_UPDATED}

We built OEWER Tools to be private by design. This page explains, in plain words, what happens to your information when you use the site.

# The short version

- Our tools run in your browser. The images, text, numbers and files you use in them stay on your device and are never uploaded to us.
- We do not ask you to create an account.
- We use Google Analytics to count visits, but only if you say yes. If you decline, the site works exactly the same.
- We may show ads. Where the law requires it, personalised ads only follow your consent.

# What stays on your device

When you use a tool, for example the image compressor, the JSON formatter or an EMI calculator, the work is done by your browser. We do not receive, see or store what you type, paste or choose. We check this with automated tests that watch the network while each tool is used.

The site stores one small note in your browser, called a local storage entry, to remember your analytics choice. It holds only whether you allowed analytics and when you chose.

# Analytics (only with your permission)

If you click **Allow analytics**, we load Google Analytics, a service from Google. It uses cookies to count visits and sends Google anonymous usage figures such as:

- which pages you view and which tools you open or finish (by name only, never what you entered);
- the approximate area you are in, your browser, device type and screen size;
- how you arrived at the site, for example from a search engine.

We use these figures to see which tools and guides are useful and what to improve. We do not use them to identify you, and we do not turn on Google's advertising features for analytics.

If you click **Decline**, or do not answer, no analytics script is loaded and no analytics cookies are set. You can change your mind at any time with **Analytics settings** at the bottom of every page. Declining stops counting immediately and removes the analytics cookies.

Google's own handling of this data is described in its privacy policy: [policies.google.com/privacy](https://policies.google.com/privacy).

# Advertising

We may show ads on the site to cover its costs, using Google AdSense. To show ads, Google and its partners may use cookies or similar technologies, and may use your approximate location and the page you are viewing. Personalised ads, where they are offered, are shown only if you consent where the law requires it. You can control Google's ad personalisation at [adssettings.google.com](https://adssettings.google.com).

# Where the site is hosted

The site is hosted on GitHub Pages. Like any web host, GitHub receives technical information when your browser requests a page, such as your IP address, and may keep it in its logs. We do not receive that information from GitHub. See GitHub's privacy statement at [docs.github.com/site-policy/privacy-policies](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement).

The fonts on this site are served from the site itself, so your browser does not contact Google Fonts.

# When you contact us

If you email us, we receive your email address and what you wrote. We use it only to reply and to improve the site, and we keep it for as long as it is useful for that. We do not sell it or share it for marketing.

# Your choices and rights

- You can allow, decline or change your analytics choice at any time, as described above.
- You can clear cookies and site data in your browser settings.
- You can ask us what we hold about you, and ask us to correct or delete it, by emailing ${mail}. Depending on where you live, you may have further rights under your local data protection law, and we will honour them.

# Children

The site is meant for a general audience and is not directed at children under 13. We do not knowingly collect information from children.

# Changes to this policy

If we change how the site handles information, we will update this page and the date at the top. Please check back from time to time.

# Contact

Questions about privacy? Email ${mail}.`;

export const TERMS_PAGE = `Last updated: ${LEGAL_UPDATED}

By using OEWER Tools you agree to these terms. If you do not agree, please do not use the site.

# Using the site

OEWER Tools is free to use. You may use the tools and read the guides for personal or business purposes. Please do not misuse the site: do not try to break it, overload it, or interfere with how it works for others.

# Results are for information only

Our calculators and tools use standard formulas and we test them, but results are estimates for general information. They are not financial, tax, legal or professional advice. A real loan, deposit or tax figure may differ because of fees, rounding, rate changes and rules that apply to you. Check important numbers with your bank or a qualified professional before you rely on them.

# Your content stays yours

The files and text you use in a tool stay on your device. We do not receive them and we claim no rights over them. You are responsible for having the right to use anything you process with the tools.

# Our content

The site, its design, the guides and the tool descriptions belong to OEWER Tools. You may link to our pages and quote short extracts with a link back to the source. Please do not copy whole pages or republish our guides without asking us first.

# Availability and changes

We work to keep the site available and accurate, but we provide it as it is, without a promise that it will always be available, error-free or suited to a particular purpose. We may change, add or remove tools and pages at any time.

# Limits of our responsibility

To the extent the law allows, we are not responsible for losses that come from using, or being unable to use, the site or its results. Nothing in these terms limits any right you have by law that cannot be limited.

# Ads and links to other sites

The site may show ads and may link to other sites. We do not control those sites or their content and are not responsible for them. Their own terms and privacy policies apply.

# Privacy

How we handle information is explained in our [Privacy Policy](/privacy-policy).

# Changes to these terms

We may update these terms. The date at the top shows when they last changed. If you keep using the site after a change, you accept the updated terms.

# Contact

Questions about these terms? Email ${mail}.`;
