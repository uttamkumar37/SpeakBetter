import { useSessions } from "../state/useSessions";
import { formatRelativeDate } from "../utils/format";
import { groupByTopic } from "../utils/groupByTopic";
import { SUGGESTED_TOPICS } from "../utils/topicGuides";
import "./PracticeHome.css";

interface PracticeHomeProps {
	onStartNewPractice: () => void;
	onSelectTopic: (topic: string) => void;
}

export function PracticeHome({ onStartNewPractice, onSelectTopic }: PracticeHomeProps) {
	const { sessions, loading } = useSessions();
	const recentGroup = groupByTopic(sessions)[0];

	return (
		<div className="practice-home">
			<section className="hero">
				<h1>Speak with more clarity and confidence.</h1>
				<p className="hero-subtitle">Record. Review. Improve. Repeat.</p>
				<button type="button" className="btn btn-primary btn-hero" onClick={onStartNewPractice}>
					Start New Practice
				</button>
			</section>

			<section className="home-section">
				<h2>Today's Practice</h2>
				<p className="home-section-hint">Pick a topic to jump straight into recording.</p>
				<div className="home-topic-grid">
					{SUGGESTED_TOPICS.map((topic) => (
						<button key={topic} type="button" className="topic-card" onClick={() => onSelectTopic(topic)}>
							{topic}
						</button>
					))}
				</div>
			</section>

			{!loading && recentGroup && (
				<section className="home-section">
					<h2>Recent Practice</h2>
					<div className="recent-practice-card">
						<div>
							<p className="recent-practice-topic">{recentGroup.topic}</p>
							<p className="recent-practice-meta">
								{formatRelativeDate(recentGroup.attempts[recentGroup.attempts.length - 1].createdAt)} &bull;{" "}
								{recentGroup.attempts.length} attempt{recentGroup.attempts.length === 1 ? "" : "s"}
							</p>
						</div>
						<button type="button" className="btn btn-secondary" onClick={() => onSelectTopic(recentGroup.topic)}>
							Continue
						</button>
					</div>
				</section>
			)}
		</div>
	);
}
