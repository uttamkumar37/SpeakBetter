import { Navigate, Outlet, Route, HashRouter, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { HistoryPage } from "./pages/HistoryPage";
import { InterviewHistoryPage } from "./pages/InterviewHistoryPage";
import { InterviewPracticePage } from "./pages/InterviewPracticePage";
import { InterviewReviewPage } from "./pages/InterviewReviewPage";
import { PracticePage } from "./pages/PracticePage";
import { ProgressPage } from "./pages/ProgressPage";
import { InterviewSessionsProvider } from "./state/InterviewSessionsProvider";
import { SessionsProvider } from "./state/SessionsProvider";
import "./App.css";

function Layout() {
	return (
		<div className="app-shell">
			<NavBar />
			<main className="page-shell">
				<Outlet />
			</main>
		</div>
	);
}

function App() {
	return (
		<SessionsProvider>
			<InterviewSessionsProvider>
				<HashRouter>
					<Routes>
						<Route element={<Layout />}>
							<Route path="/" element={<Navigate to="/practice" replace />} />
							<Route path="/practice" element={<PracticePage />} />
							<Route path="/interview" element={<InterviewPracticePage />} />
							<Route path="/interview/history" element={<InterviewHistoryPage />} />
							<Route path="/interview/review/:id" element={<InterviewReviewPage />} />
							<Route path="/history" element={<HistoryPage />} />
							<Route path="/progress" element={<ProgressPage />} />
						</Route>
					</Routes>
				</HashRouter>
			</InterviewSessionsProvider>
		</SessionsProvider>
	);
}

export default App;
