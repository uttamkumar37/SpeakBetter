import { videoUrlFor } from "../../api/practiceSessionsApi";
import type { PracticeSession } from "../../types";
import "./MediaTabs.css";

const FOCUS_POINTS = ["Eye contact", "Posture", "Gestures", "Facial expression", "Distracting movement"];

export function VideoOnlyTab({ session }: { session: PracticeSession }) {
	return (
		<div className="media-tab">
			<h3>
				Video Only <span className="media-tab-badge">Audio muted</span>
			</h3>
			<p className="media-tab-instruction">Ignore what you said. Focus on how you presented it.</p>
			<video src={videoUrlFor(session)} controls muted className="media-tab-video" />
			<div className="focus-points">
				{FOCUS_POINTS.map((point) => (
					<span className="focus-point" key={point}>
						{point}
					</span>
				))}
			</div>
		</div>
	);
}
