import { guideForTopic } from "../utils/topicGuides";
import "./SpeakingGuide.css";

interface SpeakingGuideProps {
	topic: string;
	onHide: () => void;
}

export function SpeakingGuide({ topic, onHide }: SpeakingGuideProps) {
	const steps = guideForTopic(topic);

	return (
		<div className="speaking-guide">
			<div className="speaking-guide-header">
				<p className="speaking-guide-eyebrow">How to approach this topic</p>
				<h3>{topic}</h3>
			</div>
			<ol className="speaking-guide-steps">
				{steps.map((step, index) => (
					<li className="speaking-guide-step" key={step.label}>
						<div className="speaking-guide-step-marker">
							<span className="speaking-guide-step-number">{index + 1}</span>
							{index < steps.length - 1 && <span className="speaking-guide-step-connector" aria-hidden="true" />}
						</div>
						<div>
							<p className="speaking-guide-step-label">{step.label}</p>
							<p className="speaking-guide-step-prompt">{step.prompt}</p>
						</div>
					</li>
				))}
			</ol>
			<button type="button" className="btn btn-secondary btn-sm" onClick={onHide}>
				Hide Guide
			</button>
		</div>
	);
}
