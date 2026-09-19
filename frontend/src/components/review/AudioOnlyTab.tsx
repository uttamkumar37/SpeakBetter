import { videoUrlFor } from "../../api/practiceSessionsApi";
import type { PracticeSession } from "../../types";
import "./MediaTabs.css";

const FOCUS_POINTS = ["Pace", "Pauses", "Clarity", "Fillers", "Repetition"];

export function AudioOnlyTab({ session }: { session: PracticeSession }) {
	return (
		<div className="media-tab">
			<h3>Listen to Your Voice</h3>
			<p className="media-tab-instruction">Ignore the video and focus only on how you sound.</p>
			<audio src={videoUrlFor(session)} controls className="media-tab-audio" />
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
