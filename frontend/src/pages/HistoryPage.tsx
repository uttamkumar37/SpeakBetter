import { useNavigate } from "react-router-dom";
import { RecordingHistory } from "../components/RecordingHistory";

export function HistoryPage() {
	const navigate = useNavigate();

	function handlePracticeAgain(topic: string) {
		navigate("/practice", { state: { topic } });
	}

	return <RecordingHistory onPracticeAgain={handlePracticeAgain} title="Practice History" />;
}
