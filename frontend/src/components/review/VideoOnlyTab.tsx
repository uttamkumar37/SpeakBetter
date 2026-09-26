import { videoUrlFor } from "../../api/practiceSessionsApi";
import type { PracticeSession } from "../../types";
import "./MediaTabs.css";

const FOCUS_POINTS = ["Framing", "Camera engagement", "Gesture clarity", "Movement consistency"];

export function VideoOnlyTab({ session }: { session: PracticeSession }) {
	return (
		<div className="media-tab">
			<h3>
				Video Only <span className="media-tab-badge">Audio muted</span>
			</h3>
			<p className="media-tab-instruction">
				Watch without sound and focus on presentation. Exact eye contact and posture are not measured reliably.
			</p>
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
