import { NavLink } from "react-router-dom";
import "./NavBar.css";

const LINKS = [
	{ to: "/practice", label: "Practice" },
	{ to: "/history", label: "History" },
	{ to: "/progress", label: "Progress" },
];

export function NavBar() {
	return (
		<header className="nav-bar">
			<div className="nav-bar-inner">
				<NavLink to="/practice" className="nav-brand">
					<span className="nav-brand-mark">SB</span>
					<span>SpeakBetter</span>
				</NavLink>
				<nav className="nav-links">
					{LINKS.map((link) => (
						<NavLink
							key={link.to}
							to={link.to}
							className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}
						>
							{link.label}
						</NavLink>
					))}
				</nav>
				<div className="nav-avatar" aria-label="User initials">
					UK
				</div>
			</div>
		</header>
	);
}
