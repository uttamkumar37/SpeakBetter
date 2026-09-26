import { categoryForTopic, guideForTopic, nextTopicVariant } from "../utils/topicGuides";
import "./PracticePreparation.css";

interface PracticePreparationProps {
	topic: string;
	onTopicChange: (topic: string) => void;
	onStartRecording: () => void;
	onSkip: () => void;
}

export function PracticePreparation({ topic, onTopicChange, onStartRecording, onSkip }: PracticePreparationProps) {
	const category = categoryForTopic(topic);
	const steps = guideForTopic(topic);

	function generateAnotherTopic() {
		onTopicChange(nextTopicVariant(topic));
	}

	return (
		<div className="practice-preparation">
			<div className="prep-header">
				<p className="prep-eyebrow">Preparation</p>
				<h2>{topic}</h2>
				<p>{category.description}</p>
			</div>

			<div className="prep-panel">
				<div>
					<span className="prep-label">Example prompt</span>
					<p className="prep-example">{category.exampleTopic}</p>
				</div>
				<div>
					<span className="prep-label">Expected duration</span>
					<p className="prep-duration">{category.expectedDuration}</p>
				</div>
			</div>

			<section className="prep-structure">
				<h3>Recommended speaking structure</h3>
				<ol>
					{steps.map((step) => (
						<li key={step.label}>
							<strong>{step.label}</strong>
							<span>{step.prompt}</span>
						</li>
					))}
				</ol>
			</section>

			<div className="prep-actions">
				<button type="button" className="btn btn-primary" onClick={onStartRecording}>
					Start Recording
				</button>
				<button type="button" className="btn btn-secondary" onClick={onSkip}>
					Skip Preparation
				</button>
				<button type="button" className="btn btn-secondary" onClick={generateAnotherTopic}>
					Generate Another Topic
				</button>
			</div>
		</div>
	);
}
