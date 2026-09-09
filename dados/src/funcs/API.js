import fs from "fs";

const config = JSON.parse(
  fs.readFileSync(new URL("../config.json", import.meta.url), "utf8")
);

// Nossa API local
const LOCAL_API = "http://127.0.0.1:3000";

async function verificarAPI(responseData = null) {

    // ==========================================
    // RESPOSTA DE ENDPOINT
    // ==========================================
    if (responseData) {

        if (responseData?.error) {
            return `⚠️ ${responseData.error}`;
        }

        return true;
    }

    // ==========================================
    // VERIFICAR NOSSA API LOCAL
    // ==========================================
    try {

        const res = await fetch(`${LOCAL_API}/`);

        if (!res.ok) {
            console.log("[API] Nossa API respondeu:", res.status);
            return "⚠️ Nossa API local não está disponível.";
        }

        const data = await res.json();

        if (data?.status === true) {
            return true;
        }

        return "⚠️ Nossa API local não respondeu corretamente.";

    } catch (err) {

        console.log("[API] Erro ao conectar à API local:", err.message);

        return (
            "⚠️ *Nossa API local está desligada!*\n\n" +
            "Inicie a API com:\n" +
            "`node dados/api/server.mjs`"
        );
    }
}

export default verificarAPI;
