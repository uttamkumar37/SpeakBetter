import { useSessions } from "../state/useSessions";
import { formatDurationLong, formatRelativeDate } from "../utils/format";
import { groupByTopic } from "../utils/groupByTopic";
import {
	averageScore,
	communicationLevel,
	currentStreak,
	dailyFocus,
	quickImprovementInsight,
	sessionsThisWeek,
} from "../utils/sessionInsights";
import { PRACTICE_CATEGORIES } from "../utils/topicGuides";
import "./PracticeHome.css";

interface PracticeHomeProps {
	onStartNewPractice: () => void;
	onSelectTopic: (topic: string) => void;
}

export function PracticeHome({ onStartNewPractice, onSelectTopic }: PracticeHomeProps) {
	const { sessions, loading } = useSessions();
	const recentGroup = groupByTopic(sessions)[0];
	const score = averageScore(sessions);
	const streak = currentStreak(sessions);
	const weeklySessions = sessionsThisWeek(sessions);
	const recommended = PRACTICE_CATEGORIES.find((category) => category.title === "Technical Explanation") ?? PRACTICE_CATEGORIES[0];
	const recentSessions = sessions.slice(0, 3);
	const weekDays = weekActivity(sessions);
	const weeklyGoal = 5;

	return (
		<div className="practice-home">
			<div className="practice-dashboard-grid">
				<div className="practice-main-column">
					<section className="hero hero-coach">
						<div className="hero-copy">
							<p className="hero-kicker">Practice Today</p>
							<h1>Become a clearer, more confident communicator.</h1>
							<p className="hero-subtitle">
								Practice real conversations, review your recordings, and build the communication habits that
								move your work forward.
							</p>
							<div className="hero-actions">
								<button type="button" className="btn btn-primary btn-hero" onClick={() => onSelectTopic(recommended.title)}>
									Start 2-minute practice
								</button>
								<button type="button" className="btn btn-secondary btn-hero-secondary" onClick={onStartNewPractice}>
									Browse practice types
								</button>
							</div>
						</div>
						<div className="hero-visual" aria-hidden="true">
							<div className="speech-orbit speech-orbit-one" />
							<div className="speech-orbit speech-orbit-two" />
							<div className="conversation-card conversation-card-primary">
								<span />
								<strong>Context</strong>
								<em>Progress</em>
							</div>
							<div className="conversation-card conversation-card-secondary">
								<span />
								<strong>Pause</strong>
								<em>Then clarify</em>
							</div>
						</div>
					</section>

					<section className="home-metrics" aria-label="Practice summary">
						<MetricCard icon="S" value={streak} label="Day streak" />
						<MetricCard icon="W" value={weeklySessions} label="Practice this week" />
						<MetricCard icon="H" value={score ?? "--"} label="Avg heuristic score" />
					</section>

					<section className="daily-practice-card">
						<div className="daily-practice-main">
							<p className="home-insight-label">Today's focus</p>
							<h2>{recommended.title}</h2>
							<p>{recommended.exampleTopic}</p>
						</div>
						<div className="daily-practice-side">
							<span>{recommended.expectedDuration}</span>
							<strong>{dailyFocus(sessions)}</strong>
							<button type="button" className="btn btn-primary btn-sm" onClick={() => onSelectTopic(recommended.title)}>
								Start Practice
							</button>
						</div>
					</section>

					<section className="home-insight">
						<p className="home-insight-label">Quick improvement insight</p>
						<p>{quickImprovementInsight(sessions)}</p>
					</section>

					<section className="home-section">
						<div className="section-heading-row">
							<div>
								<h2>Browse practice types</h2>
								<p className="home-section-hint">Choose a realistic communication scenario and start with structure.</p>
							</div>
						</div>
						<div className="home-topic-grid">
							{PRACTICE_CATEGORIES.map((category) => (
								<button
									key={category.title}
									type="button"
									className="topic-card topic-card-rich"
									aria-label={category.title}
									onClick={() => onSelectTopic(category.title)}
								>
									<i aria-hidden="true">{category.shortCode}</i>
									<span>{category.title}</span>
									<small>{category.description}</small>
									<em>{category.expectedDuration} <b aria-hidden="true">-&gt;</b></em>
								</button>
							))}
						</div>
					</section>
				</div>

				<aside className="practice-sidebar" aria-label="Practice dashboard sidebar">
					<section className="sidebar-card progress-card">
						<p className="sidebar-eyebrow">Your progress</p>
						<h2>{communicationLevel(sessions)}</h2>
						<div className="sidebar-stat-grid">
							<div><strong>{sessions.length}</strong><span>Total sessions</span></div>
							<div><strong>{score ?? "--"}</strong><span>Avg score</span></div>
							<div><strong>{streak}</strong><span>Day streak</span></div>
						</div>
					</section>

					<section className="sidebar-card">
						<div className="sidebar-card-header">
							<div>
								<p className="sidebar-eyebrow">This week</p>
								<h2>{weeklySessions} of {weeklyGoal} sessions</h2>
							</div>
							<span className="goal-pill">{Math.min(100, Math.round((weeklySessions / weeklyGoal) * 100))}%</span>
						</div>
						<div className="weekly-progress-track">
							<span style={{ width: `${Math.min(100, (weeklySessions / weeklyGoal) * 100)}%` }} />
						</div>
						<div className="weekday-row" aria-label="Weekly practice activity">
							{weekDays.map((day, index) => (
								<span key={`${day.label}-${index}`} className={day.active ? "weekday-dot active" : "weekday-dot"}>
									{day.label}
								</span>
							))}
						</div>
						<p className="sidebar-note">
							{weeklySessions >= weeklyGoal ? "Weekly goal complete. Keep the next session light and focused." : "One concise practice session is enough to build momentum today."}
						</p>
					</section>

					<section className="sidebar-card">
						<div className="sidebar-card-header">
							<div>
								<p className="sidebar-eyebrow">Recent sessions</p>
								<h2>Latest practice</h2>
							</div>
							<a className="sidebar-link" href="#/history">History</a>
						</div>
						{!loading && recentSessions.length > 0 ? (
							<div className="recent-session-list">
								{recentSessions.map((session) => (
									<button
										key={session.id}
										type="button"
										className="recent-session-item"
										onClick={() => onSelectTopic(session.topic)}
									>
										<span>{session.topic}</span>
										<small>{formatRelativeDate(session.createdAt)} &bull; {formatDurationLong(session.durationSeconds)}</small>
									</button>
								))}
							</div>
						) : (
							<p className="sidebar-note">Your recent practice will appear here after your first recording.</p>
						)}
					</section>

					<section className="sidebar-card why-card">
						<p className="sidebar-eyebrow">Why it matters</p>
						<ul>
							<li><span>01</span> Speak with clarity in high-stakes moments.</li>
							<li><span>02</span> Build confidence through repeated review.</li>
							<li><span>03</span> Turn communication practice into career momentum.</li>
						</ul>
					</section>

					{!loading && recentGroup && (
						<section className="sidebar-card continue-card">
							<p className="sidebar-eyebrow">Continue recent practice</p>
							<h2>{recentGroup.topic}</h2>
							<p>{recentGroup.attempts.length} attempt{recentGroup.attempts.length === 1 ? "" : "s"} so far</p>
							<button type="button" className="btn btn-secondary btn-sm" onClick={() => onSelectTopic(recentGroup.topic)}>
								Continue
							</button>
						</section>
					)}
				</aside>
			</div>
		</div>
	);
}

function MetricCard({ icon, value, label }: { icon: string; value: number | string; label: string }) {
	return (
		<div className="home-metric">
			<i aria-hidden="true">{icon}</i>
			<span className="home-metric-value">{value}</span>
			<span className="home-metric-label">{label}</span>
		</div>
	);
}

function weekActivity(sessions: { createdAt: string }[]) {
	const now = new Date();
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() - start.getDay());
	const activeDays = new Set(sessions.map((session) => new Date(session.createdAt).toISOString().slice(0, 10)));
	return ["S", "M", "T", "W", "T", "F", "S"].map((label, index) => {
		const date = new Date(start);
		date.setDate(start.getDate() + index);
		return { label, active: activeDays.has(date.toISOString().slice(0, 10)) };
	});
}
