import "./EmptyAnalysisState.css";

interface EmptyAnalysisStateProps {
	title: string;
	message: string;
}

/** Honest "not built yet" state - never fabricates transcript/analysis content. */
export function EmptyAnalysisState({ title, message }: EmptyAnalysisStateProps) {
	return (
		<div className="empty-analysis-state">
			<div className="empty-analysis-icon" aria-hidden="true">
				&#9675;
			</div>
			<h3>{title}</h3>
			<p>{message}</p>
		</div>
	);
}
