import "./SkeletonCard.css";

export function SkeletonCard() {
	return (
		<div className="skeleton-card">
			<div className="skeleton-line skeleton-line-wide" />
			<div className="skeleton-line skeleton-line-narrow" />
		</div>
	);
}
