import { defineUnlighthouseConfig } from "unlighthouse/config";

export default defineUnlighthouseConfig({
    site: "http://localhost:4000",
    lighthouseOptions: {
        locale: "es", // 👈 idioma del reporte Lighthouse
    },
});
