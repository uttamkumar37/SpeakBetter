export interface GuideStep {
	label: string;
	prompt: string;
}

export interface PracticeCategory {
	title: string;
	shortCode: string;
	description: string;
	exampleTopic: string;
	expectedDuration: string;
}

export const PRACTICE_CATEGORIES: PracticeCategory[] = [
	{
		title: "Daily Stand-up",
		shortCode: "DS",
		description: "Give crisp yesterday, today, and blocker updates.",
		exampleTopic: "Share today's stand-up for your current project.",
		expectedDuration: "1-2 minutes",
	},
	{
		title: "Technical Explanation",
		shortCode: "TE",
		description: "Explain a system, pattern, tool, or concept clearly.",
		exampleTopic: "Explain Kafka to a junior developer.",
		expectedDuration: "2-3 minutes",
	},
	{
		title: "Project Update",
		shortCode: "PU",
		description: "Summarize status, progress, risks, and next steps.",
		exampleTopic: "Update your manager on a delayed feature rollout.",
		expectedDuration: "1-3 minutes",
	},
	{
		title: "Self Introduction",
		shortCode: "SI",
		description: "Introduce your background, skills, and direction.",
		exampleTopic: "Introduce yourself in a backend engineer interview.",
		expectedDuration: "1-2 minutes",
	},
	{
		title: "Interview Answer",
		shortCode: "IA",
		description: "Practice concise answers for hiring conversations.",
		exampleTopic: "Tell me about a challenging project you delivered.",
		expectedDuration: "1-3 minutes",
	},
	{
		title: "Explain a Problem",
		shortCode: "EP",
		description: "Turn a confusing issue into an actionable explanation.",
		exampleTopic: "Explain why API latency increased after deployment.",
		expectedDuration: "1-3 minutes",
	},
	{
		title: "Behavioral Interview",
		shortCode: "BI",
		description: "Use STAR to tell evidence-backed work stories.",
		exampleTopic: "Describe a time you handled conflict on a team.",
		expectedDuration: "2-3 minutes",
	},
	{
		title: "Tell a Story",
		shortCode: "TS",
		description: "Practice a memorable narrative with a clear point.",
		exampleTopic: "Tell the story of a mistake that changed how you work.",
		expectedDuration: "2-3 minutes",
	},
	{
		title: "Presentation Practice",
		shortCode: "PR",
		description: "Rehearse an opening, transition, or closing section.",
		exampleTopic: "Open a presentation about improving release quality.",
		expectedDuration: "2-3 minutes",
	},
	{
		title: "Meeting Update",
		shortCode: "MU",
		description: "Share context and decisions in a live meeting style.",
		exampleTopic: "Give a quick update before sprint planning.",
		expectedDuration: "1-2 minutes",
	},
	{
		title: "Explain Code",
		shortCode: "EC",
		description: "Walk through implementation choices and trade-offs.",
		exampleTopic: "Explain a caching layer you recently implemented.",
		expectedDuration: "2-3 minutes",
	},
	{
		title: "Custom Topic",
		shortCode: "CT",
		description: "Create your own prompt for today's practice.",
		exampleTopic: "Pitch an idea you want to communicate better.",
		expectedDuration: "1-3 minutes",
	},
];

export const SUGGESTED_TOPICS = PRACTICE_CATEGORIES.map((category) => category.title);

const GUIDES_BY_TOPIC: Record<string, GuideStep[]> = {
	"daily stand-up": [
		{ label: "Yesterday", prompt: "What did you finish or move forward?" },
		{ label: "Today", prompt: "What will you work on next?" },
		{ label: "Blockers", prompt: "What needs help, a decision, or follow-up?" },
	],
	"technical explanation": [
		{ label: "What it is", prompt: "Define it in one plain sentence." },
		{ label: "Why we need it", prompt: "Name the problem it solves." },
		{ label: "How it works", prompt: "Explain the moving parts at a high level." },
		{ label: "Example", prompt: "Give one concrete example." },
		{ label: "Trade-offs", prompt: "Mention limitations or when not to use it." },
		{ label: "Conclusion", prompt: "End with the key takeaway." },
	],
	"project update": [
		{ label: "Context", prompt: "What is the project and current goal?" },
		{ label: "Progress", prompt: "What changed since the last update?" },
		{ label: "Problem", prompt: "What issue or decision needs attention?" },
		{ label: "Next Step", prompt: "What will happen next?" },
		{ label: "Risk / Blocker", prompt: "What could slow things down?" },
	],
	"self introduction": [
		{ label: "Who I am", prompt: "Introduce your role or identity briefly." },
		{ label: "Experience", prompt: "Summarize relevant work or learning." },
		{ label: "Current work", prompt: "Say what you are focused on now." },
		{ label: "Core skills", prompt: "Name two or three strengths." },
		{ label: "Strength", prompt: "Share what makes you effective." },
		{ label: "Goal", prompt: "Close with what you want next." },
	],
	"interview answer": [
		{ label: "Situation", prompt: "What was the context?" },
		{ label: "Task", prompt: "What was your responsibility?" },
		{ label: "Action", prompt: "What did you do?" },
		{ label: "Result", prompt: "What was the outcome?" },
	],
	"behavioral interview": [
		{ label: "Situation", prompt: "What was the context?" },
		{ label: "Task", prompt: "What responsibility or goal did you own?" },
		{ label: "Action", prompt: "What specific steps did you take?" },
		{ label: "Result", prompt: "What changed, and what did you learn?" },
	],
	"explain a problem": [
		{ label: "Problem", prompt: "What's the issue?" },
		{ label: "Impact", prompt: "Who or what does it affect?" },
		{ label: "Cause", prompt: "What's causing it?" },
		{ label: "Solution", prompt: "What's your proposed fix?" },
	],
	"tell a story": [
		{ label: "Hook", prompt: "Start with the moment or tension." },
		{ label: "Context", prompt: "Give only the background people need." },
		{ label: "Turning point", prompt: "What changed or surprised you?" },
		{ label: "Meaning", prompt: "What should the listener take away?" },
	],
	"presentation practice": [
		{ label: "Opening", prompt: "State the theme and why it matters." },
		{ label: "Map", prompt: "Preview the points you will cover." },
		{ label: "Evidence", prompt: "Use one specific example or data point." },
		{ label: "Transition", prompt: "Move cleanly to the next idea." },
		{ label: "Close", prompt: "End with a clear message or ask." },
	],
	"meeting update": [
		{ label: "Context", prompt: "Remind the group what this is about." },
		{ label: "Status", prompt: "Say what changed and where things stand." },
		{ label: "Decision", prompt: "Name any input or decision needed." },
		{ label: "Next", prompt: "Close with owner and next action." },
	],
	"explain code": [
		{ label: "Purpose", prompt: "What problem does this code solve?" },
		{ label: "Flow", prompt: "Walk through the main path." },
		{ label: "Choices", prompt: "Explain important trade-offs." },
		{ label: "Edge cases", prompt: "Mention failure modes or limits." },
		{ label: "Test", prompt: "Say how you know it works." },
	],
};

const DEFAULT_GUIDE: GuideStep[] = [
	{ label: "Open", prompt: "State your main point first." },
	{ label: "Detail", prompt: "Explain the key details." },
	{ label: "Example", prompt: "Give a concrete example." },
	{ label: "Close", prompt: "Summarize and wrap up." },
];

/** Coaching structure for a topic - falls back to a generic open/detail/example/close guide for custom topics. */
export function guideForTopic(topic: string): GuideStep[] {
	return GUIDES_BY_TOPIC[topic.trim().toLowerCase()] ?? DEFAULT_GUIDE;
}

export function categoryForTopic(topic: string): PracticeCategory {
	return (
		PRACTICE_CATEGORIES.find((category) => category.title.toLowerCase() === topic.trim().toLowerCase()) ?? {
			title: topic.trim() || "Custom Topic",
			shortCode: "CT",
			description: "Practice a topic you want to communicate more clearly.",
			exampleTopic: topic.trim() || "Explain the topic clearly to a specific audience.",
			expectedDuration: "1-3 minutes",
		}
	);
}

export function nextTopicVariant(topic: string): string {
	const category = categoryForTopic(topic);
	if (category.title === "Custom Topic") {
		return "Explain a recent challenge, the decision you made, and what you learned.";
	}
	return category.exampleTopic;
}
