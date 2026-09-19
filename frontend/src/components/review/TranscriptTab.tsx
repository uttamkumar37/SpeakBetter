import { EmptyAnalysisState } from "./EmptyAnalysisState";

export function TranscriptTab() {
	return (
		<EmptyAnalysisState
			title="Transcript not available"
			message="Automatic transcription isn't enabled yet. Once it is, your spoken words will appear here, broken into readable sections."
		/>
	);
}
