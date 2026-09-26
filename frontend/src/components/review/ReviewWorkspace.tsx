import { useState } from "react";
import type { PracticeSession } from "../../types";
import { formatDate, formatDurationLong } from "../../utils/format";
import { groupByTopic } from "../../utils/groupByTopic";
import { analyzeSession } from "../../utils/sessionInsights";
import { useSessions } from "../../state/useSessions";
import { AudioOnlyTab } from "./AudioOnlyTab";
import { BetterWayTab } from "./BetterWayTab";
import { CompareTab } from "./CompareTab";
import { OriginalTab } from "./OriginalTab";
import { OverviewTab } from "./OverviewTab";
import { TranscriptTab } from "./TranscriptTab";
import { VideoOnlyTab } from "./VideoOnlyTab";
import "./ReviewWorkspace.css";

type TabKey = "overview" | "original" | "audio" | "video" | "transcript" | "better-way" | "compare";

const TABS: { key: TabKey; label: string }[] = [
	{ key: "overview", label: "Overview" },
	{ key: "original", label: "Original" },
	{ key: "audio", label: "Audio Only" },
	{ key: "video", label: "Video Only" },
	{ key: "transcript", label: "Transcript" },
	{ key: "better-way", label: "Better Way" },
	{ key: "compare", label: "Compare" },
];

interface ReviewWorkspaceProps {
	session: PracticeSession;
	onDone: () => void;
	onPracticeAgain?: (topic: string) => void;
}

export function ReviewWorkspace({ session, onDone, onPracticeAgain }: ReviewWorkspaceProps) {
	const { sessions, updateSession } = useSessions();
	const [activeTab, setActiveTab] = useState<TabKey>("overview");

	// Prefer the live copy from context (reflects review edits) over the possibly-stale prop.
	const current = sessions.find((s) => s.id === session.id) ?? session;

	const group = groupByTopic(sessions).find((g) => g.attempts.some((a) => a.id === current.id));
	const attemptIndex = group ? group.attempts.findIndex((a) => a.id === current.id) : 0;
	const attemptCount = group?.attempts.length ?? 1;
	const previousAttempt = group && attemptIndex > 0 ? group.attempts[attemptIndex - 1] : undefined;
	const insight = analyzeSession(current);

	return (
		<div className="review-workspace">
			<div className="review-workspace-header">
				<div>
					<h2>{current.topic}</h2>
					<p className="review-workspace-meta">
						Attempt {attemptIndex + 1} of {attemptCount} &bull; {formatDate(current.createdAt)} &bull;{" "}
						{formatDurationLong(current.durationSeconds)}
					</p>
				</div>
				<div className="review-score-card">
					<span>{insight.score ?? "--"}</span>
					<small>Heuristic score</small>
				</div>
			</div>

			<div className="result-summary">
				<div>
					<span>Strongest area</span>
					<strong>{insight.strongestArea}</strong>
				</div>
				<div>
					<span>Focus next</span>
					<strong>{insight.focusArea}</strong>
				</div>
			</div>

			<div className="review-tab-bar" role="tablist">
				{TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.key}
						className={`review-tab${activeTab === tab.key ? " review-tab-active" : ""}`}
						onClick={() => setActiveTab(tab.key)}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="review-tab-content">
				{activeTab === "overview" && <OverviewTab session={current} onReviewSaved={updateSession} />}
				{activeTab === "original" && <OriginalTab session={current} />}
				{activeTab === "audio" && <AudioOnlyTab session={current} />}
				{activeTab === "video" && <VideoOnlyTab session={current} />}
				{activeTab === "transcript" && <TranscriptTab session={current} />}
				{activeTab === "better-way" && <BetterWayTab session={current} />}
				{activeTab === "compare" && <CompareTab current={current} previous={previousAttempt} />}
			</div>

			<div className="review-actions">
				{onPracticeAgain && (
					<button type="button" className="btn btn-primary" onClick={() => onPracticeAgain(current.topic)}>
						Record Again
					</button>
				)}
				<button type="button" className="btn btn-secondary" onClick={onDone}>
					Done
				</button>
			</div>
		</div>
	);
}
