import { useEffect, useRef, useState } from "react";
import "./RecordingCountdown.css";

interface RecordingCountdownProps {
	seconds?: number;
	onFinished: () => void;
}

export function RecordingCountdown({ seconds = 3, onFinished }: RecordingCountdownProps) {
	const [count, setCount] = useState(seconds);
	const onFinishedRef = useRef(onFinished);

	useEffect(() => {
		onFinishedRef.current = onFinished;
	});

	useEffect(() => {
		if (count === 0) {
			onFinishedRef.current();
			return;
		}
		const timeout = window.setTimeout(() => setCount((c) => c - 1), 1000);
		return () => window.clearTimeout(timeout);
	}, [count]);

	return (
		<div className="recording-countdown">
			<span className="recording-countdown-number" key={count}>
				{count}
			</span>
		</div>
	);
}
