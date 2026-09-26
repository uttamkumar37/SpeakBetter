import type { PracticeSession } from "../../types";
import { analyzeSession } from "../../utils/sessionInsights";
import { guideForTopic } from "../../utils/topicGuides";
import "./CoachingTabs.css";

interface BetterWayTabProps {
	session: PracticeSession;
}

export function BetterWayTab({ session }: BetterWayTabProps) {
	const insight = analyzeSession(session);
	const steps = guideForTopic(session.topic);

	return (
		<div className="coaching-tab">
			<section className="coaching-panel">
				<h3>What likely went wrong</h3>
				<ul>
					{insight.improvements.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</section>

			<section className="coaching-panel">
				<h3>Better answer structure</h3>
				<ol>
					{steps.map((step) => (
						<li key={step.label}>
							<strong>{step.label}:</strong> {step.prompt}
						</li>
					))}
				</ol>
			</section>

			<section className="coaching-panel">
				<h3>Try this next time</h3>
				<p>
					Open with the point in one sentence, move through the structure without over-explaining setup, add one
					concrete example, then close with the takeaway you want the listener to remember.
				</p>
			</section>
		</div>
	);
}
