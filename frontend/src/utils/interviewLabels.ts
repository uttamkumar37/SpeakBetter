import type { InterviewCategory, InterviewLevel, InterviewRole } from "../types";

export const INTERVIEW_ROLES: InterviewRole[] = [
	"BACKEND_ENGINEER",
	"FRONTEND_ENGINEER",
	"FULL_STACK_ENGINEER",
	"PRODUCT_MANAGER",
	"DATA_ANALYST",
	"GENERAL",
];

export const INTERVIEW_LEVELS: InterviewLevel[] = ["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD"];

export const INTERVIEW_CATEGORIES: InterviewCategory[] = [
	"BEHAVIORAL",
	"TECHNICAL",
	"SITUATIONAL",
	"SYSTEM_DESIGN",
	"COMMUNICATION",
	"LEADERSHIP",
	"ROLE_SPECIFIC",
];

export function interviewLabel(value: string): string {
	return value
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}
