import { videoUrlFor } from "../../api/practiceSessionsApi";
import type { PracticeSession } from "../../types";
import "./MediaTabs.css";

export function OriginalTab({ session }: { session: PracticeSession }) {
	return (
		<div className="media-tab">
			<video src={videoUrlFor(session)} controls className="media-tab-video" />
		</div>
	);
}
