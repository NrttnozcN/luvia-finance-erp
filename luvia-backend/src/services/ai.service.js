const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db'); // veritabanı erişimi

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

// --- Tanımlanan Fonksiyonlar (Backend Tools) ---
// DİKKAT: company_id parametresi model tarafından değil, servisin içinden (güvenli bir şekilde auth üzerinden) gönderilir.
const toolsFunctions = {
  get_expenses_summary: async ({ month, year }, company_id) => {
    try {
      // Özet giderleri getirir. Güvenlik: Sadece ilgili company_id'ye ait veriler.
      const query = `
        SELECT category, SUM(amount) as total
        FROM expenses
        WHERE company_id = $1 
          AND EXTRACT(MONTH FROM date) = $2 
          AND EXTRACT(YEAR FROM date) = $3
        GROUP BY category
      `;
      const result = await db.query(query, [company_id, month, year]);
      return result.rows.length ? result.rows : { message: "Bu aya ait gider bulunamadı." };
    } catch (e) {
       console.error("Tool Error (get_expenses_summary):", e);
       return { error: "Veritabanından veri çekilirken bir hata oluştu." };
    }
  }
};

// --- Model İçin Fonksiyon Tanımlamaları (Declarations) ---
// Yapay zeka sadece bu listeyi bilir, arka planda hangi SQL'in çalıştığını veya company_id'yi görmez.
const toolsDeclaration = {
    functionDeclarations: [
      {
        name: "get_expenses_summary",
        description: "Belirtilen ay ve yıla ait giderlerin kategorik özetini (toplamlarını) getirir.",
        parameters: {
          type: "OBJECT",
          properties: {
            month: {
              type: "INTEGER",
              description: "İstenen ay (1-12 arası)",
            },
            year: {
              type: "INTEGER",
              description: "İstenen yıl (örnek: 2026)",
            },
          },
          required: ["month", "year"],
        },
      },
    ],
};

const handleChat = async (userMessage, company_id) => {
  if (!process.env.GEMINI_API_KEY) {
      return "Gemini API anahtarı (.env dosyasında GEMINI_API_KEY) bulunamadı. Lütfen backend tarafında ayarlayın. Bu hizmet ücretsiz katmandadır.";
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: [toolsDeclaration],
    systemInstruction: "Sen Luvia ERP'nin resmi finansal asistanısın. Kullanıcıya kibar, net ve profesyonel bir finansal dille cevap vermelisin. Sana sağlanan araçları (tools) kullanarak veritabanından bilgileri çek ve bunları markdown formatında, okunaklı listeler veya tablolar kullanarak kullanıcıya sun.",
  });

  const chat = model.startChat();

  try {
    let result = await chat.sendMessage(userMessage);
    let response = result.response;

    // Model bir fonksiyon çağırmak istiyorsa (Örn: "Evet giderleri getirmeliyim"):
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      
      if (toolsFunctions[call.name]) {
        // Fonksiyonu çalıştır (company_id GÜVENLİ şekilde backend tarafından enjekte ediliyor!)
        const apiResponse = await toolsFunctions[call.name](call.args, company_id);

        // Veritabanından gelen sonucu modele geri gönder, o da bunu yorumlayıp kullanıcıya yazsın.
        result = await chat.sendMessage([{
          functionResponse: {
            name: call.name,
            response: apiResponse
          }
        }]);
        
        response = result.response;
      }
    }

    return response.text();
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Üzgünüm, şu anda isteğinizi işlerken teknik bir hata oluştu.";
  }
};

module.exports = { handleChat };
