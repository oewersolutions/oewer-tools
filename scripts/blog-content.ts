/** Seed articles. `blocks` are [block_type, content] pairs in reading order. */
export interface SeedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string;
  publishedAt: string;
  tags: string[];
  seo: { title: string; description: string };
  blocks: [type: string, content: string][];
}

export const SEED_POSTS: SeedPost[] = [
  {
    id: "POST0002",
    title: "How to Compress Images Without Losing Quality",
    slug: "compress-images-without-losing-quality",
    excerpt: "Big photos slow down websites and fill up inboxes. Learn which format and quality setting to choose so images get smaller without looking worse.",
    categoryId: "BCAT0002",
    publishedAt: "2026-10-12T09:00:00Z",
    tags: ["TAG0003", "TAG0006"],
    seo: {
      title: "How to Compress Images Without Losing Quality",
      description: "Choose the right format and quality setting to shrink JPG, PNG and WebP images while keeping them sharp, using a free in-browser tool.",
    },
    blocks: [
      ["paragraph", "A photo straight from a phone is often 3 to 8 MB. That is far more than a web page, an email or a form upload needs. Compressing the image can cut its size by 70% or more, and when it is done well, you will not see the difference."],
      ["heading", "Lossy and lossless compression"],
      ["paragraph", "**Lossless** compression (used by PNG) makes a file smaller without throwing any detail away. **Lossy** compression (used by JPG and WebP) discards detail your eyes are unlikely to notice. Lossy files are much smaller, which is why photos are almost always saved as JPG or WebP."],
      ["heading", "Pick the right format"],
      ["list", "**JPG** is the safe choice for photographs. It works everywhere.\n**WebP** is usually 25% to 35% smaller than JPG at the same look. Almost all current browsers show it.\n**PNG** is best for screenshots, logos and anything with sharp edges or transparency. It does not shrink with a quality slider."],
      ["heading", "Choose a quality setting"],
      ["paragraph", "Most photos look the same at 70% to 80% quality as at 100%, and the file is a fraction of the size. Start at 75%, check the preview, and only go lower if the picture still looks clean. If you see blocky patches or fuzzy edges around text, raise the quality a little."],
      ["callout", "**Tip:** resize first, then compress. A photo shown at 800 pixels wide does not need to be 4,000 pixels wide. Shrinking the dimensions with the image resizer saves more than any quality setting."],
      ["heading", "Keep your photos private"],
      ["paragraph", "Many online compressors upload your pictures to a server. Our image compressor works inside your browser, so the image never leaves your device. That matters for ID scans, receipts and family photos."],
    ],
  },
  {
    id: "POST0003",
    title: "GST Explained: How to Add and Remove GST",
    slug: "gst-explained-add-and-remove-gst",
    excerpt: "Adding GST to a price is easy. Taking it back out of a total is where people slip. Here are both calculations with worked examples.",
    categoryId: "BCAT0001",
    publishedAt: "2026-10-16T09:00:00Z",
    tags: ["TAG0004", "TAG0002"],
    seo: {
      title: "GST Explained: How to Add and Remove GST",
      description: "Learn how to add GST to a price and remove it from a GST-inclusive total, with the formulas and worked examples for the 5%, 12%, 18% and 28% slabs.",
    },
    blocks: [
      ["paragraph", "Goods and Services Tax (GST) is added to the price of most goods and services in India. Businesses often need to do two things: add GST to a price, and work backwards from a total that already includes it."],
      ["heading", "Adding GST"],
      ["paragraph", "Multiply the price by the rate and add the result. The formula is **GST = price × rate ÷ 100**, and the total is **price + GST**."],
      ["paragraph", "For example, a service costs ₹10,000 before tax and the rate is 18%. GST is ₹1,800, so the customer pays ₹11,800."],
      ["heading", "Removing GST from a total"],
      ["paragraph", "This is where mistakes happen. You cannot just take 18% off ₹11,800, because the 18% was worked out on the smaller, pre-tax price. Instead use **price before GST = total × 100 ÷ (100 + rate)**."],
      ["paragraph", "From ₹11,800 at 18%: 11,800 × 100 ÷ 118 = ₹10,000. The GST part is the difference, ₹1,800. Taking 18% off ₹11,800 would give ₹2,124, which is wrong."],
      ["heading", "CGST, SGST and IGST"],
      ["list", "For a sale within one state, GST is split equally between the central government (CGST) and the state government (SGST). At 18%, that is 9% each.\nFor a sale between states, the whole amount is charged as IGST."],
      ["heading", "Common GST rates"],
      ["paragraph", "GST is charged at 0%, 5%, 12%, 18% or 28% depending on the goods or services. Always check the official rate schedule for what you sell, because rates and classifications change."],
      ["callout", "Our GST calculator does both calculations and shows the CGST and SGST halves. It is a calculator, not tax advice. Confirm the rate that applies to you with an accountant or the official GST portal."],
    ],
  },
  {
    id: "POST0004",
    title: "Fixed Deposit Interest: Simple vs Compound",
    slug: "fixed-deposit-interest-simple-vs-compound",
    excerpt: "Two fixed deposits at the same rate can pay different amounts. The difference is how often the interest is added back and earns interest itself.",
    categoryId: "BCAT0001",
    publishedAt: "2026-10-20T09:00:00Z",
    tags: ["TAG0005", "TAG0002"],
    seo: {
      title: "Fixed Deposit Interest: Simple vs Compound Explained",
      description: "See how simple and compound interest differ on a fixed deposit, with a worked ₹1,00,000 example and how compounding frequency changes the maturity amount.",
    },
    blocks: [
      ["paragraph", "When you open a fixed deposit (FD), the bank pays interest on your money. How that interest is calculated decides how much you get at the end."],
      ["heading", "Simple interest"],
      ["paragraph", "With simple interest, you earn interest only on the amount you put in. The formula is **maturity = principal × (1 + rate × years)**."],
      ["paragraph", "₹1,00,000 at 7% for 3 years earns ₹21,000 of interest, so you receive ₹1,21,000."],
      ["heading", "Compound interest"],
      ["paragraph", "With compound interest, interest is added to the deposit at regular intervals, and then that interest earns interest too. The formula is **maturity = principal × (1 + rate ÷ n)^(n × years)**, where n is how many times a year interest is added."],
      ["paragraph", "The same ₹1,00,000 at 7% for 3 years, compounded quarterly, grows to about ₹1,23,144. That is ₹2,144 more than simple interest."],
      ["heading", "Does compounding frequency matter?"],
      ["paragraph", "A little. For the same ₹1,00,000 at 7% over 3 years:"],
      ["list", "Yearly compounding gives about ₹1,22,504.\nQuarterly compounding gives about ₹1,23,144.\nMonthly compounding gives about ₹1,23,293."],
      ["paragraph", "The more often interest is added, the more you earn, but the gains get smaller each step. Most banks compound fixed deposits quarterly."],
      ["callout", "Interest on fixed deposits is usually taxable, and your bank may deduct tax at source. Our FD calculator does not include tax, so your actual take-home will be lower."],
    ],
  },
  {
    id: "POST0005",
    title: "How to Make a QR Code That Scans Every Time",
    slug: "make-a-qr-code-that-scans-every-time",
    excerpt: "A QR code that will not scan is worse than none at all. Follow these simple rules for size, colour and error correction.",
    categoryId: "BCAT0002",
    publishedAt: "2026-10-24T09:00:00Z",
    tags: ["TAG0006"],
    seo: {
      title: "How to Make a QR Code That Scans Every Time",
      description: "Practical tips for QR codes that scan reliably: size, contrast, quiet zone, error correction and what to test before you print.",
    },
    blocks: [
      ["paragraph", "A QR code stores text, usually a web address, as a pattern of squares. Phone cameras read it in a fraction of a second, as long as the pattern is clear. Most scanning problems come from a few avoidable mistakes."],
      ["heading", "Keep the text short"],
      ["paragraph", "The more you put in a code, the denser and harder to read it becomes. A short link makes a simpler code than a long one. If your address is long, use a shorter page address."],
      ["heading", "Use strong contrast"],
      ["list", "Dark squares on a light background scan best. Black on white is the safest.\nDo not invert the colours (light on dark). Many scanners fail on that.\nA very dark green, like our brand colour, is fine. Pale colours are not."],
      ["heading", "Leave a quiet zone"],
      ["paragraph", "Keep an empty margin of at least four squares around the code. Our generator adds it for you. Do not crop it off, and do not print the code right against other graphics."],
      ["heading", "Pick the error correction level"],
      ["paragraph", "Error correction lets a code still scan when part of it is dirty or damaged. Higher levels survive more damage but make the code denser. **Medium** suits most uses. Choose **High** for codes on stickers or outdoor signs that may get scratched."],
      ["heading", "Size and format"],
      ["list", "For print, download the SVG, which stays sharp at any size, or a large PNG.\nFor screens, a 512 pixel PNG is plenty.\nAs a rule of thumb, a printed code should be at least 2 cm wide, and bigger if people will scan from a distance."],
      ["callout", "**Always test before you print.** Scan the code with two different phones, then print one copy and test that too."],
    ],
  },
  {
    id: "POST0006",
    title: "Why Browser-Based Tools Keep Your Files Private",
    slug: "why-browser-based-tools-keep-your-files-private",
    excerpt: "Some online tools upload your files to a server to process them. Others do the work on your own device. Here is how to tell the difference and why it matters.",
    categoryId: "BCAT0002",
    publishedAt: "2026-10-28T09:00:00Z",
    tags: ["TAG0006"],
    seo: {
      title: "Why Browser-Based Tools Keep Your Files Private",
      description: "Understand the difference between tools that upload your files and tools that run in your browser, and how to check which kind you are using.",
    },
    blocks: [
      ["paragraph", "When you use an online tool, the work has to happen somewhere. Either your file travels to someone else's computer (a server) and comes back, or the work happens on your own device, inside the browser."],
      ["heading", "Server-based tools"],
      ["paragraph", "A server-based tool receives a copy of your file. That is not always a problem, but you have to trust the service to delete it, protect it and not use it for anything else. It also takes longer, because large files must be uploaded and downloaded."],
      ["heading", "Browser-based tools"],
      ["paragraph", "Modern browsers can resize images, format data, generate codes and run calculations directly. A browser-based tool loads once and then does the work locally. Your file never goes anywhere, and it works as fast as your device allows."],
      ["heading", "How to check"],
      ["list", "Open your browser's developer tools and look at the Network tab while you use the tool. If your file is being sent, you will see a large request go out.\nTry turning off your internet connection after the page loads. A browser-based tool will keep working.\nRead the privacy policy. Honest tools say plainly whether files are uploaded."],
      ["heading", "How OEWER Tools works"],
      ["paragraph", "All of our tools run in your browser. We test this: our automated tests watch the network while every tool is used and fail if anything is sent. That is the kind of promise you should be able to verify."],
      ["callout", "Private does not mean unlimited. Very large images can be slow on older phones, because your device is doing the work."],
    ],
  },
];
