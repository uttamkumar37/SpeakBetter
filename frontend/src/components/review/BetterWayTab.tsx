import { EmptyAnalysisState } from "./EmptyAnalysisState";

export function BetterWayTab() {
	return (
		<EmptyAnalysisState
			title="Suggested rewrite not available"
			message="AI-assisted rewrites aren't enabled yet. Once they are, you'll see your original answer next to a clearer, more concise version here."
		/>
	);
}
