export interface GuideStep {
	label: string;
	prompt: string;
}

export const SUGGESTED_TOPICS = [
	"Daily Stand-up",
	"Technical Explanation",
	"Project Update",
	"Self Introduction",
	"Interview Answer",
	"Explain a Problem",
];

const GUIDES_BY_TOPIC: Record<string, GuideStep[]> = {
	"daily stand-up": [
		{ label: "Completed", prompt: "What did you finish?" },
		{ label: "Today", prompt: "What are you working on?" },
		{ label: "Blockers", prompt: "Anything preventing progress?" },
		{ label: "Next", prompt: "What happens next?" },
	],
	"technical explanation": [
		{ label: "Context", prompt: "What problem does this solve?" },
		{ label: "Approach", prompt: "How does it work, at a high level?" },
		{ label: "Example", prompt: "Give one concrete example." },
		{ label: "Takeaway", prompt: "What should someone remember?" },
	],
	"project update": [
		{ label: "Progress", prompt: "What's been completed?" },
		{ label: "Status", prompt: "Are you on track?" },
		{ label: "Risks", prompt: "Any blockers or risks?" },
		{ label: "Next Steps", prompt: "What happens next?" },
	],
	"self introduction": [
		{ label: "Background", prompt: "Who are you, briefly?" },
		{ label: "Experience", prompt: "What's your relevant experience?" },
		{ label: "Strengths", prompt: "What are you good at?" },
		{ label: "Goal", prompt: "What are you looking for?" },
	],
	"interview answer": [
		{ label: "Situation", prompt: "What was the context?" },
		{ label: "Task", prompt: "What was your responsibility?" },
		{ label: "Action", prompt: "What did you do?" },
		{ label: "Result", prompt: "What was the outcome?" },
	],
	"explain a problem": [
		{ label: "Problem", prompt: "What's the issue?" },
		{ label: "Impact", prompt: "Who or what does it affect?" },
		{ label: "Cause", prompt: "What's causing it?" },
		{ label: "Solution", prompt: "What's your proposed fix?" },
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
