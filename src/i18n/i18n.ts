import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import esCommon from "./locales/es/common.json";
import esTodo from "./locales/es/todo.json";
import esJournal from "./locales/es/journal.json";
import enCommon from "./locales/en/common.json";
import enTodo from "./locales/en/todo.json";
import enJournal from "./locales/en/journal.json";

i18next.use(initReactI18next).init({
	lng: "en",
	fallbackLng: ["en"],
	ns: ["common", "todo", "journal"],
	defaultNS: "common",
	resources: {
		es: {
			common: esCommon,
			todo: esTodo,
			journal: esJournal,
		},
		en: {
			common: enCommon,
			todo: enTodo,
			journal: enJournal,
		},
	},
	interpolation: {
		escapeValue: false,
	},
	react: {
		useSuspense: false,
	},
});

export default i18next;
