import { useRef, useState } from "react";
import { PRACTICE_CATEGORIES } from "../utils/topicGuides";
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
				{PRACTICE_CATEGORIES.filter((category) => category.title !== "Custom Topic").map((category) => (
					<button
						key={category.title}
						type="button"
						className="topic-card topic-card-rich"
						aria-label={category.title}
						onClick={() => onSelect(category.title)}
					>
						<i aria-hidden="true">{category.shortCode}</i>
						<span>{category.title}</span>
						<small>{category.description}</small>
						<em>{category.expectedDuration}</em>
					</button>
				))}
				<button type="button" className="topic-card topic-card-custom" onClick={focusCustomInput}>
					+ Custom Topic
				</button>
			</div>
		</div>
	);
}
