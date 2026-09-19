import { useRef, useState } from "react";
import { SUGGESTED_TOPICS } from "../utils/topicGuides";
import "./TopicSelector.css";

interface TopicSelectorProps {
	onSelect: (topic: string) => void;
}

export function TopicSelector({ onSelect }: TopicSelectorProps) {
	const [customTopic, setCustomTopic] = useState("");
	const inputRef = useRef<HTMLInputElement | null>(null);

	function handleCustomSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = customTopic.trim();
		if (trimmed) {
			onSelect(trimmed);
		}
	}

	function focusCustomInput() {
		inputRef.current?.focus();
		inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
	}

	return (
		<div className="topic-selector">
			<h2>What would you like to practice?</h2>

			<form className="topic-selector-custom" onSubmit={handleCustomSubmit}>
				<input
					ref={inputRef}
					type="text"
					placeholder="Enter your own topic..."
					value={customTopic}
					onChange={(e) => setCustomTopic(e.target.value)}
				/>
				<button type="submit" className="btn btn-primary" disabled={!customTopic.trim()}>
					Continue
				</button>
			</form>

			<div className="topic-selector-grid">
				{SUGGESTED_TOPICS.map((topic) => (
					<button
						key={topic}
						type="button"
						className="topic-card"
						onClick={() => onSelect(topic)}
					>
						{topic}
					</button>
				))}
				<button type="button" className="topic-card topic-card-custom" onClick={focusCustomInput}>
					+ Custom Topic
				</button>
			</div>
		</div>
	);
}
