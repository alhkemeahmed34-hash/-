import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")!;
  const key=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const auth=req.headers.get("Authorization")??"";
  if(!auth.startsWith("Bearer ")) return json({error:"سجّل الدخول أولاً لاستخدام مساعد تسنيم."},401);
  const user=await fetch(url+"/auth/v1/user",{headers:{apikey:key,Authorization:auth}});
  if(!user.ok) return json({error:"انتهت جلستك. سجّل الدخول من جديد."},401);
  const body=await req.json();
  const messages=Array.isArray(body.messages)?body.messages.slice(-16):[];
  if(!messages.length||messages.some((m:any)=>!["user","assistant"].includes(m.role)||typeof m.content!=="string"||m.content.length>3000)) return json({error:"لم أستطع قراءة الرسالة. حاول إرسالها مرة ثانية."},400);
  const apiKey=Deno.env.get("OPENAI_API_KEY");
  if(!apiKey) return json({error:"مساعد تسنيم الذكي لم يُفعّل بعد على الخادم. يلزم ضبط مفتاح OpenAI السري في إعدادات Supabase؛ لن أستبدل الذكاء الاصطناعي بردود محفوظة."},503);
  const catalogRes=await fetch(url+"/rest/v1/travel_services?select=category,title,description,destination,price,currency,starts_at,ends_at&is_active=eq.true&order=created_at.desc&limit=40",{headers:{apikey:key,Authorization:auth}});
  const catalog=catalogRes.ok?await catalogRes.json():[];
  const system=`أنت مساعد تسنيم للسياحة والسفريات، مساعد ذكاء اصطناعي حقيقي لمكتب سفر في اليمن. تحدث باللهجة العربية اليمنية اللطيفة أو العربية الواضحة بحسب أسلوب العميل. افهم الأخطاء الإملائية والكتابة العامية والرسائل القصيرة، ولا تتعامل معها ككلمات مفتاحية فقط. تابع سياق المحادثة وارجع لما قاله العميل سابقاً، واسأل سؤالاً واحداً واضحاً عند نقص معلومة. كن طبيعياً وودوداً ومهنياً، ولا تكرر المقدمة في كل رد. ساعد في مقارنة الوجهات وتخطيط الرحلات وشرح إجراءات السفر والحج والعمرة والتأشيرات والفنادق. هذه عروض المكتب الحقيقية: ${JSON.stringify(catalog)}. استخدمها عند سؤال العميل عن عروض تسنيم، ولا تخترع أسعاراً أو مواعيد أو توافراً. إذا كانت البيانات ناقصة فقل ذلك بوضوح واعرض تحويل الاستفسار لفريق المكتب. لا تقل إنك حجزت أو أكدت شيئاً ما لم يحدث ذلك فعلاً. لا تطلب كلمات مرور أو بيانات بطاقات أو صور جوازات.`;
  const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+apiKey},body:JSON.stringify({model:"gpt-4o-mini",temperature:0.55,max_tokens:700,messages:[{role:"system",content:system},...messages]})});
  if(!response.ok){const details=await response.text();console.error("OpenAI request failed",response.status,details.slice(0,500));return json({error:"تعذر على المساعد الذكي الرد الآن. حاول بعد قليل."},502);}
  const data=await response.json();const reply=data.choices?.[0]?.message?.content;
  if(typeof reply!=="string"||!reply.trim()) return json({error:"لم يصل رد واضح من المساعد. أعد إرسال رسالتك."},502);
  return json({reply,mode:"ai"});
 }catch(error){console.error("assistant error",error);return json({error:"حدث خلل مؤقت أثناء معالجة رسالتك. حاول مرة أخرى."},500);}
});