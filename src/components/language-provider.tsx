import React, { createContext, useContext, useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { locale } from "@tauri-apps/plugin-os";
import { load } from "@tauri-apps/plugin-store";
import i18n from "@/i18n/i18n";
import { type SupportedLanguage } from "@/i18n/resources";

interface SupportedLanguageOption {
	code: SupportedLanguage;
	label: string;
}

interface LanguageContextValue {
	language: SupportedLanguage;
	setLanguage: (language: SupportedLanguage) => void;
	supportedLanguages: SupportedLanguageOption[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const SUPPORTED_LANGUAGES: SupportedLanguageOption[] = [
	{ code: "es", label: "Español" },
	{ code: "en", label: "English" },
];

function parseSupportedLanguage(
	value: string | undefined | null,
): SupportedLanguage | null {
	if (!value) return null;
	if (value.startsWith("es")) return "es";
	if (value.startsWith("en")) return "en";
	return null;
}

async function saveLanguage(language: SupportedLanguage): Promise<void> {
	try {
		const store = await load("settings.json");
		await store.set("language", language);
		await store.save();
	} catch {
		// ignore persistence errors
	}
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
	const [language, setLanguageState] = useState<SupportedLanguage>("es");

	useEffect(() => {
		async function bootstrap() {
			let resolved: SupportedLanguage | null = null;

			// 1. Try saved preference
			try {
				const store = await load("settings.json");
				const saved = await store.get<SupportedLanguage>("language");
				resolved = parseSupportedLanguage(saved ?? null);
			} catch {
				// ignore
			}

			// 2. Try OS locale (Tauri desktop context)
			if (!resolved) {
				try {
					const osLocale = await locale();
					resolved = parseSupportedLanguage(osLocale);
				} catch {
					// not in Tauri context or plugin unavailable
				}
			}

			// 3. Try browser locale
			if (!resolved) {
				const browserLocale =
					navigator.language || navigator.languages?.[0];
				resolved = parseSupportedLanguage(browserLocale);
			}

			// 4. Default to Spanish
			const nextLanguage = resolved ?? "es";
			await i18n.changeLanguage(nextLanguage);
			setLanguageState(nextLanguage);
		}

		bootstrap();
	}, []);

	const setLanguage = async (nextLanguage: SupportedLanguage) => {
		await i18n.changeLanguage(nextLanguage);
		setLanguageState(nextLanguage);
		await saveLanguage(nextLanguage);
	};

	return (
		<LanguageContext.Provider
			value={{
				language,
				setLanguage,
				supportedLanguages: SUPPORTED_LANGUAGES,
			}}
		>
			<I18nextProvider i18n={i18n}>{children}</I18nextProvider>
		</LanguageContext.Provider>
	);
}

export function useLanguage(): LanguageContextValue {
	const ctx = useContext(LanguageContext);
	if (!ctx)
		throw new Error("useLanguage must be used within LanguageProvider");
	return ctx;
}
