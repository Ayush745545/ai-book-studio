export const FORMAT_IDS = [
  "book",
  "ebook",
  "guide",
  "workbook",
  "audiobook",
] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export interface BookFormat {
  id: FormatId;
  name: string;
  credits: number;
  pages: string;
  description: string;
  icon: string;
  targetPages: number;
  color: string;
  unit: string;
  outcome: string;
  structure: string[];
  instruction: string;
}

export const BOOK_FORMATS: BookFormat[] = [
  {
    id: "book",
    name: "Book",
    credits: 1,
    pages: "120 pages",
    description: "Full-length authority builder",
    icon: "BookOpen",
    targetPages: 120,
    color: "green",
    unit: "Chapter",
    outcome: "A complete manuscript, ready for print",
    structure: [
      "Introduction",
      "The big idea",
      "Understanding the foundations",
      "A fresh perspective",
      "Putting ideas into practice",
      "Overcoming obstacles",
      "Lessons from experience",
      "Building momentum",
      "Going deeper",
      "Making it your own",
      "The road ahead",
      "Conclusion",
    ],
    instruction:
      "Write a cohesive full-length book chapter with developed arguments or scenes, concrete examples, transitions and an original voice. Maintain continuity with the supplied context.",
  },
  {
    id: "ebook",
    name: "E-Book",
    credits: 1,
    pages: "50 pages",
    description: "Digital-optimized content",
    icon: "Tablet",
    targetPages: 50,
    color: "blue",
    unit: "Chapter",
    outcome: "A reflowable EPUB for digital reading",
    structure: [
      "Welcome & what you will learn",
      "The essentials",
      "A practical framework",
      "Real-world applications",
      "Your next steps",
      "Resources & further reading",
    ],
    instruction:
      "Write for digital readers: concise paragraphs, descriptive subheadings, actionable takeaways and readable lists. Use plain-text headings, not markdown symbols.",
  },
  {
    id: "guide",
    name: "Guide",
    credits: 1,
    pages: "30 pages",
    description: "Focused how-to content",
    icon: "Compass",
    targetPages: 30,
    color: "amber",
    unit: "Section",
    outcome: "A practical guide readers can follow",
    structure: [
      "Start here: the goal & what you need",
      "Step 1: lay the foundation",
      "Step 2: put the method to work",
      "Step 3: refine your results",
      "Troubleshooting & common mistakes",
      "Quick-reference checklist",
    ],
    instruction:
      "Write a practical how-to section with a clear objective, prerequisites, numbered steps, an example, troubleshooting advice and a completion checklist.",
  },
  {
    id: "workbook",
    name: "Workbook",
    credits: 1,
    pages: "10–20 pages",
    description: "Interactive exercises",
    icon: "ClipboardList",
    targetPages: 15,
    color: "rose",
    unit: "Exercise",
    outcome: "A printable workbook with room to respond",
    structure: [
      "How to use this workbook",
      "Exercise 1: your starting point",
      "Exercise 2: explore the idea",
      "Exercise 3: practice the skill",
      "Exercise 4: apply it to your life",
      "Exercise 5: reflect & plan",
      "Answer key & facilitator notes",
    ],
    instruction:
      "Create an interactive workbook section: a measurable learning objective, brief instructions, a worked example, original exercises, reflection prompts and blank response lines. Include answer guidance when appropriate. Avoid filling in the reader answers.",
  },
  {
    id: "audiobook",
    name: "Audiobook",
    credits: 1,
    pages: "AI Narration",
    description: "Professional voice narration from any book",
    icon: "Headphones",
    targetPages: 50,
    color: "violet",
    unit: "Track",
    outcome: "A narration script with listening preview",
    structure: [
      "Opening & introduction",
      "Track 1: set the scene",
      "Track 2: explore the story",
      "Track 3: the turning point",
      "Track 4: bring it together",
      "Closing & acknowledgments",
    ],
    instruction:
      "Write a natural spoken narration script with short sentences, clear transitions and listener-friendly explanations. Spell out abbreviations, avoid visual-only references and tables, and do not include stage directions that would be spoken aloud.",
  },
];

export function getFormatById(id: string): BookFormat | undefined {
  return BOOK_FORMATS.find((f) => f.id === id);
}

export function chapterNotes(
  format: BookFormat,
  title: string,
  topic: string,
): string {
  if (format.id === "workbook")
    return `Learning objective: ${topic || "What should the reader be able to do?"}\nInstructions: explain the task.\nExercise: ${title}\nInclude a worked example, space for answers, and a reflection prompt.`;
  if (format.id === "guide")
    return `Reader goal: ${topic || "What will this section help them accomplish?"}\nPrerequisites:\nSteps to follow:\nExample:\nCommon mistakes:\nCompletion checklist:`;
  if (format.id === "audiobook")
    return `Listener takeaway: ${topic || "What should the listener remember?"}\nOpening hook:\nKey story or ideas:\nTransition to the next track:\nRead the draft aloud to check pacing.`;
  return `Purpose: ${topic || "What does this chapter add to the book?"}\nOpening:\nKey points or scenes:\nExamples and supporting details:\nClosing takeaway:`;
}
