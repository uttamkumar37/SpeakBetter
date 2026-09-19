/** "20 Sep 2026" */
export function formatDate(isoDateTime: string): string {
	return new Date(isoDateTime).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

/** "2m 14s" / "45s" - used on history cards, distinct from the mm:ss REC timer format. */
export function formatDurationLong(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/** Whole days left before expiresAt, floored at 0 so an overdue-for-cleanup row never shows negative. */
export function daysRemaining(expiresAt: string): number {
	const msRemaining = new Date(expiresAt).getTime() - Date.now();
	return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
}

/** "Today" / "Yesterday" / "20 Sept 2026" - used on dashboard-style summaries. */
export function formatRelativeDate(isoDateTime: string): string {
	const date = new Date(isoDateTime);
	const now = new Date();
	const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24));

	if (dayDiff === 0) return "Today";
	if (dayDiff === 1) return "Yesterday";
	return formatDate(isoDateTime);
}

/** "2h 14m" / "45m" / "2m" - total practice time, coarser than a single attempt's duration. */
export function formatTotalDuration(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.round((totalSeconds % 3600) / 60);
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
}
