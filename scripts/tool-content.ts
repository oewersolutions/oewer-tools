/** Seed help, examples, FAQ and related tools for each tool. Becomes `tool_settings` rows (keys help, examples, faq, related). */

export interface SeedToolContent {
  help: string;
  examples: { title: string; text: string }[];
  faq: { q: string; a: string }[];
  related: string[];
  guides: string[];
}

export const TOOL_CONTENT: Record<string, SeedToolContent> = {
  TOOL0001: {
    help: "Follow these steps:\n\n- Choose a JPG, PNG or WebP image.\n- Pick the output format. JPG and WebP make the smallest files.\n- Move the quality slider. Lower quality means a smaller file.\n- Check the preview and the size saved, then download the result.",
    examples: [
      { title: "Photo for a website", text: "A 4 MB phone photo saved as WebP at 75% quality is often under 500 KB and looks the same on screen." },
      { title: "Email attachment", text: "Choose JPG at 60% quality to bring a scanned page well under typical email size limits." },
    ],
    faq: [
      { q: "Is my image uploaded anywhere?", a: "No. The image is processed in your browser on your own device and is never sent to a server." },
      { q: "Why is my PNG not getting smaller?", a: "PNG is lossless, so the quality slider has no effect on it. Choose JPG or WebP as the output format for a much smaller file." },
      { q: "What is the largest image I can use?", a: "Files up to 25 MB and about 50 megapixels. Very large photos can be slow on older phones." },
    ],
    related: ["TOOL0002", "TOOL0003"],
    guides: ["POST0002", "POST0006"],
  },
  TOOL0002: {
    help: "Follow these steps:\n\n- Choose a JPG, PNG or WebP image. Its current size is filled in for you.\n- Either type a new width or height in pixels, or switch to a percentage of the original.\n- Leave **Keep the original proportions** ticked so the picture is not stretched.\n- Download the resized image.",
    examples: [
      { title: "Profile picture", text: "Set the width to 400 with proportions kept. A 2000 × 1500 photo becomes 400 × 300." },
      { title: "Half size", text: "Switch to percentage and enter 50 to halve both width and height." },
    ],
    faq: [
      { q: "Does resizing reduce quality?", a: "Making an image smaller keeps it sharp. Making it larger cannot add detail, so enlarged images look soft." },
      { q: "Which format is the result?", a: "The same format as the image you chose. Use the image converter to change format." },
      { q: "Is my image uploaded anywhere?", a: "No. Everything happens in your browser on your own device." },
    ],
    related: ["TOOL0001", "TOOL0003"],
    guides: ["POST0002"],
  },
  TOOL0003: {
    help: "Follow these steps:\n\n- Choose a JPG, PNG or WebP image.\n- Pick the format to convert to.\n- For JPG and WebP, set the quality. Higher quality means a larger file.\n- Download the converted image.",
    examples: [
      { title: "PNG to JPG", text: "Convert a PNG screenshot to JPG for a smaller file. Transparent areas turn white." },
      { title: "JPG to WebP", text: "Convert a JPG to WebP at 90% quality for a smaller file with similar looks." },
    ],
    faq: [
      { q: "What happens to transparency?", a: "PNG and WebP keep transparent areas. JPG cannot, so transparent areas become white." },
      { q: "Can it convert GIF, HEIC or other types?", a: "Not yet. Only JPG, PNG and WebP are supported." },
      { q: "Is my image uploaded anywhere?", a: "No. Everything happens in your browser on your own device." },
    ],
    related: ["TOOL0001", "TOOL0002"],
    guides: ["POST0002"],
  },
  TOOL0004: {
    help: "Follow these steps:\n\n- Enter the loan amount, the yearly interest rate and the tenure.\n- Choose whether the tenure is in years or months.\n- The monthly EMI, total interest and total payment update as you type.\n\n## How it is calculated\n\nEMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), where P is the loan amount, r is the monthly rate (yearly rate ÷ 12 ÷ 100) and n is the number of months.",
    examples: [
      { title: "Home loan", text: "₹50,00,000 at 8.5% for 20 years gives a monthly EMI of about ₹43,391." },
      { title: "Car loan", text: "₹8,00,000 at 9% for 5 years gives a monthly EMI of about ₹16,607." },
    ],
    faq: [
      { q: "Does this match my bank's figure?", a: "It uses the standard reducing-balance formula. Banks may differ slightly because of rounding, processing fees or the day the first instalment falls." },
      { q: "Does it include processing fees or insurance?", a: "No. It only calculates principal and interest." },
      { q: "Is the information I type saved?", a: "No. The calculation runs in your browser and nothing is sent or stored." },
    ],
    related: ["TOOL0005", "TOOL0007"],
    guides: ["POST0001"],
  },
  TOOL0005: {
    help: "Follow these steps:\n\n- Enter the deposit amount, the yearly interest rate and the tenure.\n- Choose how often the interest is compounded. Most banks compound fixed deposits quarterly.\n- See the maturity amount and the interest earned.\n\n## How it is calculated\n\nMaturity = P × (1 + r ÷ n)^(n × t), where P is the deposit, r the yearly rate, n the compounding periods per year and t the years. With simple interest, maturity = P × (1 + r × t).",
    examples: [
      { title: "Three-year deposit", text: "₹1,00,000 at 7% compounded quarterly for 3 years matures to about ₹1,23,144." },
      { title: "Simple interest", text: "₹1,00,000 at 7% simple interest for 2 years earns ₹14,000." },
    ],
    faq: [
      { q: "Is the interest taxable?", a: "Interest on fixed deposits is usually taxable. This calculator does not include tax or TDS." },
      { q: "Why is my bank's maturity amount a little different?", a: "Banks round each period and may count days exactly. Use this as a close estimate." },
      { q: "Is the information I type saved?", a: "No. The calculation runs in your browser and nothing is sent or stored." },
    ],
    related: ["TOOL0004", "TOOL0007"],
    guides: ["POST0004"],
  },
  TOOL0006: {
    help: "Follow these steps:\n\n- Choose whether to add GST to an amount or remove it from an amount that already includes GST.\n- Enter the amount and the GST rate. Common rates are 0, 5, 12, 18 and 28.\n- See the amount without GST, the GST, and the CGST and SGST halves.",
    examples: [
      { title: "Add GST", text: "₹1,000 plus 18% GST gives ₹180 of GST and a total of ₹1,180." },
      { title: "Remove GST", text: "A bill of ₹1,180 that includes 18% GST is ₹1,000 before tax, with ₹180 of GST." },
    ],
    faq: [
      { q: "What are CGST and SGST?", a: "For a sale within one state, GST is split equally between the central (CGST) and state (SGST) governments. For a sale between states, the whole amount is IGST." },
      { q: "Does it check the correct rate for my goods?", a: "No. Enter the rate that applies to your goods or services. Check the official GST rate schedule if you are unsure." },
      { q: "Is the information I type saved?", a: "No. The calculation runs in your browser and nothing is sent or stored." },
    ],
    related: ["TOOL0007", "TOOL0004"],
    guides: ["POST0003"],
  },
  TOOL0007: {
    help: "Pick the kind of calculation, then enter two numbers:\n\n- **X% of Y**: for example, 20% of 150.\n- **X is what % of Y**: for example, 25 out of 200.\n- **% change from X to Y**: how much a value went up or down.\n- **Increase or decrease X by Y%**: for example, a price rise of 10%.",
    examples: [
      { title: "Discount", text: "Decrease 2,000 by 25% to get 1,500." },
      { title: "Marks", text: "42 out of 60 is 70%." },
      { title: "Price change", text: "From 80 to 100 is a 25% increase." },
    ],
    faq: [
      { q: "Why can't the old value be 0 for a % change?", a: "A change from zero cannot be shown as a percentage because dividing by zero is undefined." },
      { q: "Can I use decimals and negative numbers?", a: "Yes for most modes. Commas in numbers such as 1,00,000 are fine." },
      { q: "Is the information I type saved?", a: "No. The calculation runs in your browser and nothing is sent or stored." },
    ],
    related: ["TOOL0006", "TOOL0004"],
    guides: ["POST0003"],
  },
  TOOL0008: {
    help: "Follow these steps:\n\n- Paste your JSON on the left. It is checked as you type.\n- Choose **Format** to make it easy to read, or **Minify** to make it as small as possible.\n- Pick the indentation and, if you like, sort the keys A to Z.\n- Copy the result.\n\nIf the JSON is invalid, the message says what is wrong and, where your browser gives it, the line and column.",
    examples: [
      { title: "Tidy a response", text: "Paste {\"name\":\"OEWER\",\"tools\":[1,2]} and choose Format to see it spread over several indented lines." },
      { title: "Find a mistake", text: "A trailing comma such as {\"a\": 1,} is not valid JSON. The error message points to where it goes wrong." },
    ],
    faq: [
      { q: "Is my JSON sent to a server?", a: "No. It is checked and formatted in your browser and never leaves your device." },
      { q: "Why is my JSON invalid when it works in my code?", a: "JSON is stricter than JavaScript: keys need double quotes, single quotes are not allowed, and trailing commas and comments are not allowed." },
      { q: "How large can the input be?", a: "Up to 5 million characters." },
    ],
    related: ["TOOL0010", "TOOL0009"],
    guides: ["POST0006"],
  },
  TOOL0009: {
    help: "Follow these steps:\n\n- Type or paste a link or any text.\n- Choose the error correction. Medium suits most uses; High lets the code still scan if part of it is damaged.\n- Pick the image size and colour.\n- Download the code as a PNG or SVG.\n\nAlways test the code with a phone before you print it.",
    examples: [
      { title: "Website link", text: "Enter https://example.com to make a code that opens the site when scanned." },
      { title: "Wi-Fi details", text: "Enter WIFI:T:WPA;S:MyNetwork;P:mypassword;; and phones can join the network by scanning." },
    ],
    faq: [
      { q: "Do the codes expire?", a: "No. The text is stored in the code itself, so it works as long as it is readable." },
      { q: "Is my text sent to a server?", a: "No. The code is generated in your browser and your text never leaves your device." },
      { q: "PNG or SVG?", a: "Use PNG for screens and documents. Use SVG when you need it to stay sharp at any size, for example for print." },
    ],
    related: ["TOOL0010", "TOOL0008"],
    guides: ["POST0005", "POST0006"],
  },
  TOOL0010: {
    help: "Follow these steps:\n\n- Type or paste your text.\n- The counts update as you type: words, characters, sentences, paragraphs and lines.\n- Reading and speaking time are estimates based on average speeds.",
    examples: [
      { title: "Essay limit", text: "Paste your essay to check it is within a 500-word limit." },
      { title: "Social post", text: "Check a post stays under a character limit, counting spaces." },
    ],
    faq: [
      { q: "How are words counted?", a: "A word is a run of letters or numbers separated by spaces or punctuation. Hyphenated words and numbers each count as words." },
      { q: "How are reading and speaking time worked out?", a: "Reading time assumes 200 words a minute and speaking time 130 words a minute." },
      { q: "Is my text sent to a server?", a: "No. The count happens in your browser and your text never leaves your device." },
    ],
    related: ["TOOL0008", "TOOL0009"],
    guides: ["POST0006"],
  },
};
