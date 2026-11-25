import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
});

function fallbackReply(question: string, catalog: any[]) {
  const q = question.toLowerCase();
  const offers = catalog.slice(0, 6);
  if (/عرض|عروض|سعر|اسعار|الأسعار|الرحلات|المتاح|متاحة/.test(q)) {
    if (!offers.length) return "حالياً لا توجد عروض منشورة في قائمة تسنيم. أخبرني بالخدمة أو الوجهة التي تبحث عنها، ويمكنك إرسال استفسار لفريق المكتب من قسم «استفساراتي».";
    const lines = offers.map((x: any, i: number) => {
      const price = x.price == null ? "السعر عند الاستفسار" : `${Number(x.price).toLocaleString("ar-YE")} ${x.currency === "YER" ? "ريال يمني" : x.currency}`;
      return `${i + 1}. ${x.title}${x.destination ? ` – ${x.destination}` : ""}\n   ${price}`;
    });
    return "هذه أحدث العروض المنشورة لدى تسنيم حسب البيانات المتاحة:\n\n" + lines.join("\n") + "\n\nهل تريد تفاصيل أحد هذه العروض؟ الأسعار والمواعيد النهائية يؤكدها فريق تسنيم.";
  }
  if (/حج|عمرة|عمره/.test(q)) return "يسعدنا مساعدتك في برامج الحج والعمرة. هل تبحث عن برنامج عمرة أم حج؟ اذكر المدينة وموعد السفر وعدد المسافرين، وسأرشدك إلى الخطوة التالية. تفاصيل التوفر والسعر يؤكدها فريق تسنيم.";
  if (/تأشيرة|فيزا|تاشيرة/.test(q)) return "نساعدك في الاستفسار عن خدمات التأشيرات. ما الدولة التي ترغب بالسفر إليها وما جنسيتك؟ لا ترسل صورة جواز السفر أو بيانات حساسة هنا؛ سيتواصل معك فريق تسنيم عند الحاجة.";
  return "أهلاً بك! أنا مساعد تسنيم للسياحة والسفريات. أقدر أساعدك في الاستفسار عن الرحلات والعروض والحج والعمرة والفنادق والتأشيرات. ما الوجهة أو الخدمة التي تبحث عنها؟";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "يلزم تسجيل الدخول لاستخدام مساعد تسنيم." }, 401);

    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: authorization },
    });
    if (!authRes.ok) return json({ error: "انتهت الجلسة. سجل الدخول من جديد." }, 401);

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (!messages.length || messages.some((m: any) =>
      !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 2000
    )) return json({ error: "صيغة الرسالة غير صحيحة." }, 400);

    const catalogRes = await fetch(
      `${supabaseUrl}/rest/v1/travel_services?select=category,title,description,destination,price,currency,starts_at,ends_at&is_active=eq.true&order=created_at.desc&limit=30`,
      { headers: { apikey: supabaseKey, Authorization: authorization } },
    );
    const catalog = catalogRes.ok ? await catalogRes.json() : [];
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return json({ reply: fallbackReply(messages[messages.length - 1].content, catalog), mode: "catalog_fallback" });
    }

    const system = `أنت مساعد تسنيم للسياحة والسفريات. تحدث بالعربية الواضحة وبأسلوب طبيعي وودود، كموظف خدمة عملاء محترف. أجب بإيجاز مفيد، واسأل سؤال متابعة واحداً عند الحاجة. بيانات العروض الحالية من قاعدة المكتب: ${JSON.stringify(catalog)}. لا تخترع أسعاراً أو مواعيد أو توفر مقاعد. إذا لم تجد معلومة قل إن فريق تسنيم سيؤكدها. لا تدّعِ إنشاء حجز أو تأكيده؛ وجّه العميل إلى قسم الحجوزات. لا تطلب كلمات مرور أو بيانات بطاقات أو صور جوازات. ركّز على خدمات السفر والحج والعمرة والتأشيرات والفنادق.`;
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini", temperature: 0.45, max_tokens: 550,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!aiRes.ok) {
      return json({ reply: fallbackReply(messages[messages.length - 1].content, catalog), mode: "catalog_fallback" });
    }
    const result = await aiRes.json();
    const reply = result.choices?.[0]?.message?.content;
    return json({ reply: typeof reply === "string" && reply.trim() ? reply : fallbackReply(messages[messages.length - 1].content, catalog), mode: "ai" });
  } catch (_error) {
    return json({ reply: "عذراً، واجهت مشكلة مؤقتة أثناء معالجة رسالتك. حاول مرة أخرى بعد قليل، أو أرسل استفسارك لفريق تسنيم من قسم «استفساراتي»." });
  }
});
