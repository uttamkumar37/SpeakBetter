import type { PracticeSession } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_IDEAL_SECONDS = 60;
const MAX_IDEAL_SECONDS = 180;

export interface SessionInsight {
	score: number | null;
	scoreStatus: string;
	methodology: string;
	paceLabel: string;
	durationFeedback: string;
	fillerFeedback: string;
	fillerRatePerMinute: number | null;
	fillerControlScore: number | null;
	durationScore: number | null;
	strengths: string[];
	improvements: string[];
	strongestArea: string;
	focusArea: string;
}

export function analyzeSession(session: PracticeSession): SessionInsight {
	const durationScore = session.durationSeconds >= 30 ? scoreDuration(session.durationSeconds) : null;
	const fillerControlScore = scoreFillers(session.fillerWordCount, session.durationSeconds);
	const reviewScore = session.wentWell || session.needsImprovement || session.notes ? 8 : 0;
	const score =
		durationScore === null
			? null
			: Math.max(
					35,
					Math.min(
						96,
						Math.round(durationScore * (fillerControlScore === null ? 0.88 : 0.62)
							+ (fillerControlScore ?? 0) * (fillerControlScore === null ? 0 : 0.3)
							+ reviewScore),
					),
				);
	const fillerRatePerMinute =
		session.fillerWordCount === null ? null : session.fillerWordCount / Math.max(1, session.durationSeconds / 60);

	const strengths = [
		session.durationSeconds >= MIN_IDEAL_SECONDS ? "You gave the answer enough room to develop." : "You kept the attempt concise.",
		session.wentWell ? `Self-noted strength: ${session.wentWell}` : "You completed a full record-review loop.",
	];

	const improvements = [
		session.durationSeconds < MIN_IDEAL_SECONDS
			? "Add one example or trade-off so the answer feels complete."
			: session.durationSeconds > MAX_IDEAL_SECONDS
				? "Tighten the opening and remove repeated context."
				: "Keep the same length, but make each section more intentional.",
	];
	if (session.fillerWordCount !== null && session.fillerWordCount > 6) {
		improvements.push("Pause silently when thinking instead of filling the gap.");
	}
	if (session.needsImprovement) {
		improvements.push(`Your focus area: ${session.needsImprovement}`);
	}

	return {
		score,
		scoreStatus:
			score === null
				? "Complete a recording of at least 30 seconds to calculate this heuristic score."
				: "Heuristic score based on recorded duration, optional filler count, and saved self-review.",
		methodology:
			"Scoring is deterministic: duration fit contributes most, self-entered filler count is included only when present, and self-review completion adds a small coaching-loop credit. No eye contact, posture, transcript, or confidence scores are estimated.",
		paceLabel: paceLabel(session.durationSeconds),
		durationFeedback: durationFeedback(session.durationSeconds),
		fillerFeedback: fillerFeedback(session.fillerWordCount, session.durationSeconds),
		fillerRatePerMinute,
		fillerControlScore,
		durationScore,
		strengths,
		improvements,
		strongestArea: strongestArea(durationScore, fillerControlScore),
		focusArea: focusArea(session, durationScore, fillerControlScore),
	};
}

export function averageScore(sessions: PracticeSession[]): number | null {
	const scored = sessions.map(analyzeSession).filter((insight) => insight.score !== null);
	if (scored.length === 0) {
		return null;
	}
	return Math.round(scored.reduce((sum, insight) => sum + (insight.score ?? 0), 0) / scored.length);
}

export function sessionsThisWeek(sessions: PracticeSession[], now = new Date()): number {
	const weekStart = new Date(now);
	weekStart.setHours(0, 0, 0, 0);
	weekStart.setDate(weekStart.getDate() - weekStart.getDay());
	return sessions.filter((session) => new Date(session.createdAt) >= weekStart).length;
}

export function currentStreak(sessions: PracticeSession[], now = new Date()): number {
	const practicedDays = new Set(sessions.map((session) => dayKey(new Date(session.createdAt))));
	let cursor = new Date(now);
	cursor.setHours(0, 0, 0, 0);
	let streak = 0;
	while (practicedDays.has(dayKey(cursor))) {
		streak++;
		cursor = new Date(cursor.getTime() - DAY_MS);
	}
	return streak;
}

export function quickImprovementInsight(sessions: PracticeSession[]): string {
	const withFillers = [...sessions]
		.filter((session) => session.fillerWordCount !== null)
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
	if (withFillers.length >= 2) {
		const first = withFillers[0].fillerWordCount ?? 0;
		const last = withFillers[withFillers.length - 1].fillerWordCount ?? 0;
		if (first > 0 && last < first) {
			return `Your filler words decreased ${Math.round(((first - last) / first) * 100)}% since tracking began.`;
		}
		if (last > first) {
			return "Your filler count is trending up; slow down and let pauses do the work.";
		}
	}
	const scored = sessions.map(analyzeSession).filter((insight) => insight.score !== null);
	if (scored.length >= 2 && (scored[0].score ?? 0) > (scored[scored.length - 1].score ?? 0)) {
		return "Your recent score dipped; review your structure before the next attempt.";
	}
	return "Record two reviewed attempts on one topic to unlock clearer improvement signals.";
}

export function communicationLevel(sessions: PracticeSession[]): string {
	const score = averageScore(sessions);
	if (sessions.length >= 20 && score !== null && score >= 82) {
		return "Confident Communicator";
	}
	if (sessions.length >= 12 && score !== null && score >= 75) {
		return "Structured Communicator";
	}
	if (sessions.length >= 6) {
		return "Improving Clarity";
	}
	if (sessions.length >= 3) {
		return "Building Consistency";
	}
	return "Starting";
}

export function dailyFocus(sessions: PracticeSession[]): string {
	const latest = sessions[0];
	if (!latest) {
		return "Clear structure + calm pacing";
	}
	const insight = analyzeSession(latest);
	if (insight.focusArea === "Filler control") {
		return "Reduce filler words during transitions";
	}
	if (insight.focusArea === "Record a longer attempt") {
		return "Complete a fuller answer with one example";
	}
	if (insight.focusArea === "Tighter pacing") {
		return "Tighten setup and close with one takeaway";
	}
	return "Pause briefly between major points";
}

export function compareAttempts(current: PracticeSession, previous?: PracticeSession): string {
	if (!previous) {
		return "This is your first attempt for this topic. Record again after reviewing the structure to create a comparison.";
	}
	const currentScore = analyzeSession(current).score;
	const previousScore = analyzeSession(previous).score;
	if (currentScore === null || previousScore === null) {
		return "A reliable comparison needs two attempts of at least 30 seconds each.";
	}
	const diff = currentScore - previousScore;
	if (diff > 0) {
		return `Up ${diff} points from the previous attempt. Keep the structure and refine delivery.`;
	}
	if (diff < 0) {
		return `Down ${Math.abs(diff)} points from the previous attempt. Revisit the opening and reduce extra detail.`;
	}
	return "Score is unchanged from the previous attempt. Focus on one visible improvement next time.";
}

function scoreDuration(durationSeconds: number): number {
	if (durationSeconds >= MIN_IDEAL_SECONDS && durationSeconds <= MAX_IDEAL_SECONDS) {
		return 95;
	}
	if (durationSeconds < MIN_IDEAL_SECONDS) {
		return Math.max(45, 95 - (MIN_IDEAL_SECONDS - durationSeconds) * 1.2);
	}
	return Math.max(45, 95 - (durationSeconds - MAX_IDEAL_SECONDS) * 0.45);
}

function scoreFillers(fillerWordCount: number | null, durationSeconds: number): number | null {
	if (fillerWordCount === null) {
		return null;
	}
	const minutes = Math.max(1, durationSeconds / 60);
	const fillersPerMinute = fillerWordCount / minutes;
	return Math.max(35, Math.round(100 - fillersPerMinute * 9));
}

function paceLabel(durationSeconds: number): string {
	if (durationSeconds < MIN_IDEAL_SECONDS) {
		return "Too brief";
	}
	if (durationSeconds > MAX_IDEAL_SECONDS) {
		return "Long";
	}
	return "On target";
}

function durationFeedback(durationSeconds: number): string {
	if (durationSeconds < MIN_IDEAL_SECONDS) {
		return "The answer may feel underdeveloped. Add context, one example, and a clear close.";
	}
	if (durationSeconds > MAX_IDEAL_SECONDS) {
		return "The answer may lose focus. Cut setup time and move faster to the point.";
	}
	return "The attempt sits in the recommended 1-3 minute practice range.";
}

function fillerFeedback(fillerWordCount: number | null, durationSeconds: number): string {
	if (fillerWordCount === null) {
		return "Transcript or self-entered filler count required for filler metrics.";
	}
	const perMinute = fillerWordCount / Math.max(1, durationSeconds / 60);
	if (perMinute <= 3) {
		return "Filler usage looks controlled for this attempt.";
	}
	return "Filler usage is noticeable. Try replacing hesitation words with a short pause.";
}

function strongestArea(durationScore: number | null, fillerControlScore: number | null): string {
	if (durationScore === null && fillerControlScore === null) {
		return "Not enough data";
	}
	if (fillerControlScore !== null && durationScore !== null && fillerControlScore > durationScore) {
		return "Filler control";
	}
	return "Answer length";
}

function focusArea(session: PracticeSession, durationScore: number | null, fillerControlScore: number | null): string {
	if (durationScore === null) {
		return "Record a longer attempt";
	}
	if (session.fillerWordCount === null) {
		return "Add filler count after review";
	}
	if (fillerControlScore !== null && fillerControlScore < durationScore) {
		return "Filler control";
	}
	if (session.durationSeconds > MAX_IDEAL_SECONDS) {
		return "Tighter pacing";
	}
	if (session.durationSeconds < MIN_IDEAL_SECONDS) {
		return "More complete structure";
	}
	return "Transitions";
}

function dayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}
