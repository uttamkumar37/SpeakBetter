import { Navigate, Outlet, Route, HashRouter, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { HistoryPage } from "./pages/HistoryPage";
import { PracticePage } from "./pages/PracticePage";
import { ProgressPage } from "./pages/ProgressPage";
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
			<HashRouter>
				<Routes>
					<Route element={<Layout />}>
						<Route path="/" element={<Navigate to="/practice" replace />} />
						<Route path="/practice" element={<PracticePage />} />
						<Route path="/history" element={<HistoryPage />} />
						<Route path="/progress" element={<ProgressPage />} />
					</Route>
				</Routes>
			</HashRouter>
		</SessionsProvider>
	);
}

export default App;
