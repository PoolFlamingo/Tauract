import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/language-provider";
import { UpdateProvider } from "@/components/update-provider";
import App from "./App";
import "@/i18n/i18n";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<LanguageProvider>
			<ThemeProvider defaultTheme="system" storageKey="tauract-ui-theme">
				<UpdateProvider>
					<TooltipProvider>
						<App />
					</TooltipProvider>
				</UpdateProvider>
			</ThemeProvider>
		</LanguageProvider>
	</React.StrictMode>,
);
