import "react-native-url-polyfill/auto";
import React, { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, Pressable, View, ActivityIndicator, Image, ImageBackground, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, Session } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ecldmphkqxqicwirbbsy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tCZycVv4PUIle0Q_Cc9lHQ_RU95tWWn";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
});

type Role = "customer" | "staff" | "owner";
type Service = { image: string; title: string; category: string; subtitle: string };
const services: Service[] = [
  { image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=700&auto=format&fit=crop", title: "الطيران", category: "flight", subtitle: "ابحث عن رحلتك" },
  { image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=700&auto=format&fit=crop", title: "الحج والعمرة", category: "umrah", subtitle: "برامج الحج والعمرة" },
  { image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=900&auto=format&fit=crop", title: "السياحة", category: "tourism", subtitle: "اكتشف وجهات جديدة" },
  { image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&auto=format&fit=crop", title: "الفنادق", category: "hotel", subtitle: "إقامة تناسبك" },
  { image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&auto=format&fit=crop", title: "التأشيرات", category: "visa", subtitle: "خدمات التأشيرات" },
  { image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=900&auto=format&fit=crop", title: "النقل", category: "transport", subtitle: "تنقل براحة" }
];
const C = { navy:"#073F43", blue:"#167C73", sky:"#E5F2EE", pale:"#F5F8F5", white:"#FFFFFF", text:"#123A3B", muted:"#718784", border:"#DCE9E4", green:"#21856E", gold:"#C6A15B" };
const heroSlides = [
  { image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&auto=format&fit=crop", title: "اكتشف رحلتك مع تسنيم", subtitle: "وجهات مختارة وتجارب لا تُنسى" },
  { image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop", title: "إجازتك القادمة تبدأ هنا", subtitle: "اختر وجهتك ودع تفاصيل الرحلة علينا" },
  { image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1200&auto=format&fit=crop", title: "العالم أقرب مما تتخيل", subtitle: "برامج سفر تناسب وقتك وميزانيتك" }
];

function BrandEmblem({ size=92 }: { size?: number }) {
  return <View accessibilityLabel="شعار تسنيم للسياحة والسفريات" style={{width:size,height:size,borderRadius:size*0.3,backgroundColor:C.navy,borderWidth:2,borderColor:C.gold,alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
    <Image source={require("./assets/tasnim-icon.png")} style={{width:"100%",height:"100%"}} resizeMode="contain"/>
  </View>;
}
function Field({ value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline=false, error=false }: any) {
  const isEmail = keyboardType === "email-address";
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} secureTextEntry={secureTextEntry} keyboardType={keyboardType} multiline={multiline} textAlign={isEmail ? "left" : "right"} textAlignVertical={multiline ? "top" : "center"} autoCapitalize={isEmail ? "none" : "sentences"} autoCorrect={!isEmail} autoComplete={isEmail ? "email" : "off"} importantForAutofill={isEmail ? "yes" : "auto"} accessibilityLabel={placeholder} style={[s.input,multiline&&s.multilineInput,isEmail&&s.emailInput,error&&s.inputError]} />;
}
function Button({ title, onPress, secondary=false, disabled=false, loading=false }: any) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:disabled||loading,busy:loading}} disabled={disabled||loading} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,(disabled||loading)&&{opacity:0.55},pressed&&!(disabled||loading)&&{opacity:0.82,transform:[{scale:0.99}]}]}>{loading?<ActivityIndicator color={secondary?C.blue:C.white}/>:<Text style={[s.buttonText,secondary&&{color:C.blue}]}>{title}</Text>}</Pressable>;
}
function msg(error: any) { return error?.message ?? "حدث خطأ غير متوقع. حاول مرة أخرى."; }
function categoryLabel(category: string) { if (category==="hajj" || category==="umrah") return "الحج والعمرة"; return services.find(item=>item.category===category)?.title ?? "خدمة سفر"; }
function statusLabel(status: string) { return ({pending:"بانتظار المراجعة",under_review:"قيد المراجعة",confirmed:"تم التأكيد",rejected:"مرفوض",cancelled:"ملغي",completed:"مكتمل"} as Record<string,string>)[status] ?? status; }
function formatPrice(price: any, currency="YER") { return price===null||price===undefined ? "السعر عند الاستفسار" : `${Number(price).toLocaleString("ar-YE")} ${currency==="YER"?"ر.ي":currency}`; }

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const [authMode, setAuthMode] = useState<"login"|"signup">("login");
  const [entry, setEntry] = useState<"customer"|"staff"|null>(null);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [passwordError,setPasswordError]=useState(""); const [fullName, setFullName] = useState("");
  const [heroTitle,setHeroTitle]=useState(heroSlides[0].title); const [heroSubtitle,setHeroSubtitle]=useState(heroSlides[0].subtitle); const [heroTitleDraft,setHeroTitleDraft]=useState(""); const [heroSubtitleDraft,setHeroSubtitleDraft]=useState("");
  const [profileEditOpen,setProfileEditOpen]=useState(false); const [profileNameDraft,setProfileNameDraft]=useState(""); const [editingServiceId,setEditingServiceId]=useState<string|null>(null);
  const [phone, setPhone] = useState(""); const [selected, setSelected] = useState<Service>(services[0]); const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false); const [bookingNotes, setBookingNotes] = useState("");
  const [serviceOpen, setServiceOpen] = useState(false); const [serviceTitle, setServiceTitle] = useState(""); const [serviceDescription, setServiceDescription] = useState(""); const [servicePrice, setServicePrice] = useState(""); const [serviceCategory, setServiceCategory] = useState("umrah");
  const [serviceDestination,setServiceDestination]=useState(""); const [serviceStartDate,setServiceStartDate]=useState(""); const [serviceEndDate,setServiceEndDate]=useState("");
  const [bookings, setBookings] = useState<any[]>([]); const [staffOpen, setStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState(""); const [staffEmail, setStaffEmail] = useState(""); const [staffPassword, setStaffPassword] = useState("");
  const allPermissions = ["bookings.read","bookings.update","services.read","services.manage","customers.read","reports.read"];
  const permissionLabels: Record<string,string> = {"bookings.read":"عرض الحجوزات","bookings.update":"تحديث الحجوزات","services.read":"عرض الخدمات","services.manage":"إدارة الخدمات والأسعار","customers.read":"عرض بيانات العملاء","reports.read":"عرض التقارير"};
  const [staffPermissions, setStaffPermissions] = useState<string[]>(["bookings.read","bookings.update","services.read"]);
  const [busy, setBusy] = useState(false); const [isOnline,setIsOnline]=useState(true); const [chatMessages,setChatMessages]=useState<any[]>([]); const [chatInput,setChatInput]=useState(""); const [chatBusy,setChatBusy]=useState(false); const [catalog, setCatalog] = useState<any[]>([]); const [tab,setTab]=useState<"home"|"bookings"|"inquiries"|"assistant"|"account">("home"); const [detail,setDetail]=useState<Service|null>(null);
  const [adminPage,setAdminPage]=useState<"home"|"bookings"|"offers"|"addOffer"|"staff"|"homeContent">("home");
  const [catalogLoading,setCatalogLoading]=useState(false); const [catalogError,setCatalogError]=useState("");
  const [bookingsLoading,setBookingsLoading]=useState(false); const [bookingsError,setBookingsError]=useState("");
  const [heroIndex,setHeroIndex]=useState(0);
  const heroRef=useRef<ScrollView|null>(null);
  const chatHistoryRef=useRef<ScrollView|null>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const heroWidth = Math.max(260,windowWidth-36);

  useEffect(() => {
    const timer = setTimeout(() => setSplashVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active=true;
    const checkConnection=async()=>{
      try { const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),5000); await fetch(`${SUPABASE_URL}/rest/v1/`,{method:"GET",headers:{apikey:SUPABASE_PUBLISHABLE_KEY},signal:controller.signal}); clearTimeout(timer); if(active)setIsOnline(true); }
      catch { if(active)setIsOnline(false); }
    };
    checkConnection(); const timer=setInterval(checkConnection,10000);
    return ()=>{active=false;clearInterval(timer);};
  },[]);

  // Automatically rotate the scenic hero photos every five seconds.
  useEffect(() => {
    if (!session || tab!=="home" || detail) return;
    const timer=setInterval(() => {
      setHeroIndex(current => {
        const next=(current+1)%heroSlides.length;
        heroRef.current?.scrollTo({x:next*heroWidth,animated:true});
        return next;
      });
    },5000);
    return () => clearInterval(timer);
  },[session,tab,detail,heroWidth]);

  useEffect(() => {
    let mounted = true;
    let authEventReceived = false;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      authEventReceived = true;
      if (mounted) { setSession(next); setLoading(false); }
    });
    supabase.auth.getSession().then(({data,error}) => {
      if (!mounted) return;
      if (!authEventReceived) setSession(data.session);
      if (error) Alert.alert("تعذر استعادة الجلسة",msg(error));
      setLoading(false);
    }).catch((error:any) => {
      if (mounted) { setLoading(false); Alert.alert("تعذر الاتصال",msg(error)); }
    });
    return () => { mounted=false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session || !isOnline) { if(!session)setCatalog([]); return; }
    refreshCatalog();
    if (session.user.app_metadata?.role !== "owner" && session.user.app_metadata?.role !== "staff") {
      supabase.from("customer_notifications").select("id,title,message").eq("customer_id",session.user.id).eq("is_read",false).order("created_at",{ascending:true}).limit(10).then(async ({data,error})=>{
        if(error || !data?.length) return;
        await supabase.from("customer_notifications").update({is_read:true}).in("id",data.map((item:any)=>item.id));
        Alert.alert("إشعار من تسنيم",data.map((item:any)=>`${item.title}\n${item.message}`).join("\n\n"));
      });
    }
    const userRole = session.user.app_metadata?.role;
    const userPermissions: string[] = session.user.app_metadata?.permissions ?? [];
    if (["owner","staff"].includes(userRole) && (userRole==="owner" || userPermissions.includes("bookings.read"))) loadBookings();
    // Restore saved contact details for faster repeat bookings.
    supabase.from("profiles").select("full_name,phone").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
        if (data?.phone) setPhone(data.phone);
      });
  }, [session]);

  async function loadHomeSettings() {
    try {
      const {data,error}=await supabase.from("app_settings").select("value").eq("key","home_hero").maybeSingle();
      if(error) throw error;
      if(data?.value?.title) setHeroTitle(String(data.value.title));
      if(data?.value?.subtitle) setHeroSubtitle(String(data.value.subtitle));
    } catch(error:any) { console.warn("Could not load home settings",msg(error)); }
  }
  async function saveHomeSettings() {
    if(!heroTitleDraft.trim() || !heroSubtitleDraft.trim()) { Alert.alert("بيانات الواجهة","اكتب العنوان والوصف قبل الحفظ."); return; }
    setBusy(true);
    try {
      const {error}=await supabase.from("app_settings").upsert({key:"home_hero",value:{title:heroTitleDraft.trim(),subtitle:heroSubtitleDraft.trim()},updated_at:new Date().toISOString()},{onConflict:"key"});
      if(error) throw error;
      setHeroTitle(heroTitleDraft.trim()); setHeroSubtitle(heroSubtitleDraft.trim());
      Alert.alert("تم حفظ الواجهة","تم تحديث العنوان والوصف وسيظهران لجميع العملاء.");
      setAdminPage("home");
    } catch(error:any) { Alert.alert("تعذر حفظ الواجهة",msg(error)); }
    finally { setBusy(false); }
  }
  useEffect(()=>{ if(isOnline) loadHomeSettings(); },[isOnline]);

  async function refreshCatalog() {
    setCatalogLoading(true); setCatalogError("");
    try {
      const { data, error } = await supabase.from("travel_services")
        .select("id,category,title,description,destination,price,currency,starts_at,ends_at,is_active,created_at")
        .eq("is_active", true).order("created_at", {ascending:false});
      if (error) throw error;
      setCatalog(data ?? []);
    } catch (error:any) { setCatalogError(msg(error)); }
    finally { setCatalogLoading(false); }
  }

  const role = (session?.user.app_metadata?.role as Role | undefined) ?? "customer";
  const isStaff = role === "staff" || role === "owner";
  const permissions: string[] = session?.user.app_metadata?.permissions ?? [];
  const canReadBookings = role === "owner" || permissions.includes("bookings.read");
  const canUpdateBookings = role === "owner" || permissions.includes("bookings.update");
  const canManageServices = role === "owner" || permissions.includes("services.manage");

  async function authenticate() {
    if (!isOnline) { Alert.alert("لا يوجد اتصال بالإنترنت","يرجى إعادة الاتصال بالإنترنت ثم المحاولة."); return; }
    if (!email.trim() || password.length < 8) { setPasswordError(password.length<8?"أدخل كلمة المرور (8 أحرف على الأقل).":""); Alert.alert("تحقق من البيانات", "أدخل البريد وكلمة المرور (8 أحرف على الأقل)."); return; }
    setPasswordError("");
    setBusy(true);
    try {
      if (authMode === "signup") {
        if (!fullName.trim()) throw new Error("اكتب الاسم الكامل.");
        const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: fullName.trim(), phone: phone.trim() || null } } });
        if (error) throw error;
        Alert.alert("تم إنشاء الحساب", data.session ? "أهلاً بك في تسنيم." : "تحقق من بريدك الإلكتروني لتأكيد الحساب، ثم سجل الدخول.");
        setAuthMode("login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        const actualRole = data.user.app_metadata?.role;
        if (entry === "staff" && !["owner","staff"].includes(actualRole)) {
          await supabase.auth.signOut();
          throw new Error("هذا الحساب ليس حساب موظف معتمداً. اطلب من المدير إنشاء حساب الموظف.");
        }
        if (entry === "customer" && ["owner","staff"].includes(actualRole)) {
          await supabase.auth.signOut();
          throw new Error("هذا حساب موظف. اختر دخول الموظفين.");
        }
      }
    } catch (e:any) {
      const errorMessage=msg(e);
      if(authMode==="login" && /invalid login credentials|invalid email or password/i.test(errorMessage)) {
        setPasswordError("كلمة المرور خاطئة. تأكد منها وحاول مرة أخرى.");
        setPassword("");
      } else Alert.alert("تعذر إكمال العملية", errorMessage);
    }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (session) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (entry) { setEntry(null); setAuthMode("login"); return true; }
      Alert.alert("تسنيم للسياحة والسفريات","أنت في شاشة البداية. استخدم زر الرجوع داخل التطبيق للتنقل.");
      return true;
    });
    return () => subscription.remove();
  }, [session, entry]);

  useEffect(() => {
    if (!session) return;
    const onHardwareBack = () => {
      if (tab==="assistant") { setTab("home"); return true; }
      if (bookingOpen) { setBookingOpen(false); return true; }
      if (serviceOpen) { setServiceOpen(false); return true; }
      if (staffOpen) { setStaffOpen(false); return true; }
      if (isStaff && adminPage!=="home") { setAdminPage("home"); return true; }
      if (!isStaff && detail) { setDetail(null); return true; }
      if (!isStaff && tab !== "home") { setTab("home"); setDetail(null); return true; }
      Alert.alert("تسنيم للسياحة والسفريات", "أنت في الصفحة الرئيسية. استخدم زر تسجيل الخروج إذا أردت الخروج من حسابك.", [{ text: "حسنًا", style: "cancel" }]);
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
    return () => subscription.remove();
  }, [session, bookingOpen, serviceOpen, staffOpen, isStaff, detail, tab]);

  async function saveProfileName() {
    const nextName=profileNameDraft.trim();
    if(!nextName) { Alert.alert("الاسم مطلوب","اكتب اسمك قبل الحفظ."); return; }
    if(!session) return;
    setBusy(true);
    try {
      const {error:authError}=await supabase.auth.updateUser({data:{full_name:nextName}});
      if(authError) throw authError;
      const {error:profileError}=await supabase.from("profiles").update({full_name:nextName,updated_at:new Date().toISOString()}).eq("id",session.user.id);
      if(profileError) throw profileError;
      setFullName(nextName); setProfileEditOpen(false);
      Alert.alert("تم تحديث الاسم","تم حفظ اسمك الجديد في حسابك.");
    } catch(error:any) { Alert.alert("تعذر تحديث الاسم",msg(error)); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    const {error}=await supabase.auth.signOut();
    setBusy(false);
    if(error){Alert.alert("تعذر تسجيل الخروج",msg(error));return;}
    setEntry(null); setBookingOpen(false); setStaffOpen(false); setBookings([]); setCatalog([]); setTab("home"); setDetail(null); setAdminPage("home"); setProfileEditOpen(false); setEditingServiceId(null);
  }
  async function createBooking() {
    if (!session) return;
    if (!fullName.trim() || !phone.trim()) { Alert.alert("بيانات الحجز", "أدخل الاسم ورقم الهاتف."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("bookings").insert({
        customer_id: session.user.id, service_id: selectedServiceId, service_category: selected.category,
        customer_name: fullName.trim(), customer_phone: phone.trim(),
        details: { service_title: selected.title, notes: bookingNotes.trim() }, status: "pending"
      });
      if (error) throw error;
      Alert.alert("تم استلام طلبك", "وصل طلب الحجز إلى مكتب تسنيم، وسيقوم الفريق بمراجعته والتواصل معك.");
      setBookingOpen(false); setBookingNotes("");
      if (tab === "bookings") loadBookings();
    } catch(error:any) { Alert.alert("تعذر إرسال الطلب",msg(error)); }
    finally { setBusy(false); }
  }
  async function changeBookingStatus(id: string, status: string) {
    setBusy(true);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    setBusy(false);
    if (error) Alert.alert("تعذر تحديث الحجز",msg(error)); else { Alert.alert("تم تحديث حالة الطلب",status==="confirmed"?"تم تأكيد الحجز وإرسال إشعار إلى العميل.":status==="rejected"?"تم رفض الطلب وإرسال إشعار إلى العميل.":"تم تحديث حالة الطلب."); loadBookings(); }
  }
  async function loadBookings() {
    if (!session) return;
    setBookingsLoading(true); setBookingsError("");
    try {
      let query = supabase.from("bookings").select("id,customer_name,customer_phone,service_category,status,created_at,details").order("created_at", {ascending:false}).limit(50);
      if (role === "customer") query = query.eq("customer_id", session.user.id);
      const { data, error } = await query;
      if (error) throw error;
      setBookings(data ?? []);
    } catch(error:any) { setBookingsError(msg(error)); }
    finally { setBookingsLoading(false); }
  }
  async function sendAssistantMessage(textOverride?:string) {
    const prompt=(textOverride ?? chatInput).trim(); if(!prompt || chatBusy) return;
    const now=new Date().toISOString();
    const next=[...chatMessages,{role:"user",content:prompt,createdAt:now}]; setChatMessages(next); setChatInput(""); setChatBusy(true);
    requestAnimationFrame(()=>chatHistoryRef.current?.scrollToEnd({animated:true}));
    try {
      const {data,error}=await supabase.functions.invoke("tasnim-assistant",{body:{messages:next.slice(-12).map((m:any)=>({role:m.role,content:m.content}))}});
      if(error || data?.error) throw new Error(data?.error||msg(error));
      setChatMessages(old=>[...old,{role:"assistant",content:data.reply||"وصلتني رسالتك. كيف أقدر أساعدك في رحلتك؟",createdAt:new Date().toISOString()}]);
    } catch(e:any) {
      setChatMessages(old=>[...old,{role:"assistant",content:e?.message||"تعذر الاتصال بالمساعد حالياً. حاول مرة أخرى.",createdAt:new Date().toISOString(),isError:true}]);
    } finally { setChatBusy(false); requestAnimationFrame(()=>chatHistoryRef.current?.scrollToEnd({animated:true})); }
  }

  async function createTravelService() {
    if (!serviceTitle.trim()) { Alert.alert("بيانات الخدمة", "اكتب اسم الخدمة أو البرنامج."); return; }
    const price = servicePrice.trim() ? Number(servicePrice) : null;
    if (price !== null && (!Number.isFinite(price) || price < 0)) { Alert.alert("السعر غير صحيح", "أدخل سعراً صحيحاً أو اتركه فارغاً."); return; }
    const validDate = (value:string) => !value.trim() || /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
    if (!validDate(serviceStartDate) || !validDate(serviceEndDate)) { Alert.alert("صيغة التاريخ", "اكتب التاريخ بصيغة YYYY-MM-DD أو اتركه فارغاً."); return; }
    if (serviceStartDate && serviceEndDate && serviceEndDate < serviceStartDate) { Alert.alert("التواريخ غير صحيحة", "تاريخ النهاية يجب أن يكون بعد تاريخ البداية."); return; }
    setBusy(true);
    try {
      const servicePayload = {
        category: serviceCategory, title: serviceTitle.trim(), description: serviceDescription.trim(),
        destination: serviceDestination.trim() || null, starts_at: serviceStartDate.trim() || null, ends_at: serviceEndDate.trim() || null,
        price, currency: "YER", is_active: true
      };
      const { error } = editingServiceId
        ? await supabase.from("travel_services").update(servicePayload).eq("id",editingServiceId)
        : await supabase.from("travel_services").insert({...servicePayload,created_by:session?.user.id});
      if (error) throw error;
      Alert.alert(editingServiceId?"تم تعديل العرض":"تمت إضافة العرض", "تم حفظ التغييرات وأصبحت ظاهرة للعملاء.");
      setServiceTitle(""); setServiceDescription(""); setServiceDestination(""); setServiceStartDate(""); setServiceEndDate(""); setServicePrice(""); setEditingServiceId(null);
      await refreshCatalog();
    } catch(error:any) { Alert.alert("تعذر حفظ العرض",msg(error)); }
    finally { setBusy(false); }
  }
  async function archiveTravelService(id:string) {
    Alert.alert("إخفاء العرض","سيختفي العرض من واجهة العملاء مع الاحتفاظ بسجل الحجوزات. هل تريد المتابعة؟",[
      {text:"إلغاء",style:"cancel"},
      {text:"إخفاء العرض",style:"destructive",onPress:async()=>{
        const {error}=await supabase.from("travel_services").update({is_active:false}).eq("id",id);
        if(error) Alert.alert("تعذر إخفاء العرض",msg(error));
        else {setCatalog(old=>old.filter(x=>x.id!==id));}
      }}
    ]);
  }

  async function createStaff() {
    if (!staffName.trim() || !staffEmail.trim() || staffPassword.length < 10) { Alert.alert("بيانات الموظف", "أدخل الاسم والبريد وكلمة مرور من 10 أحرف على الأقل."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-staff", { body: {
        full_name: staffName.trim(), email: staffEmail.trim().toLowerCase(), password: staffPassword,
        permissions: staffPermissions
      }});
      if (error || data?.error) throw new Error(data?.error ?? msg(error));
      Alert.alert("تم إنشاء حساب الموظف", "تم إنشاء الحساب وتأكيد بريده. أرسل للموظف بيانات الدخول بشكل آمن.");
      setStaffName(""); setStaffEmail(""); setStaffPassword(""); setStaffPermissions(["bookings.read","bookings.update","services.read"]); setStaffOpen(false);
    } catch(error:any) { Alert.alert("تعذر إنشاء الحساب",msg(error)); }
    finally { setBusy(false); }
  }

  if (splashVisible) return <SafeAreaView style={[s.safe,s.splash]}><StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/><Image source={require("./assets/tasnim-logo.png")} style={{width:"88%",height:390}} resizeMode="contain"/></SafeAreaView>;
  if (loading) return <SafeAreaView style={[s.safe,s.center]}><ActivityIndicator size="large" color={C.blue}/><Text style={s.muted}>جارٍ الاتصال بالخادم...</Text></SafeAreaView>;

  if (!session || !isOnline) return <SafeAreaView style={s.safe}>
    <StatusBar barStyle="light-content" backgroundColor={C.navy}/>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}><ScrollView contentContainerStyle={s.authPage} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <ImageBackground source={{uri:"https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1400&auto=format&fit=crop"}} style={s.authHero} imageStyle={s.authHeroImage}>
        <View style={s.authHeroShade}/>
        <Image source={require("./assets/tasnim-logo.png")} style={{width:"88%",height:330,backgroundColor:"#FFFFFF",borderRadius:18}} resizeMode="contain"/>
        <Text style={s.authSlogan}>نأخذك إلى وجهتك… بثقة واهتمام</Text>
      </ImageBackground>
      <View style={s.authContent}>
        {!isOnline && <View style={s.offlineNotice}><Text style={s.offlineTitle}>لا يوجد اتصال بالإنترنت</Text><Text style={s.offlineText}>يرجى إعادة الاتصال بالإنترنت. لن تتمكن من تسجيل الدخول أو استخدام الخدمات حتى يعود الاتصال.</Text></View>}
        {!entry ? <View style={s.authPanel}>
          <Text style={s.authTitle}>أهلاً بك في عالم تسنيم</Text>
          <Text style={s.authDescription}>اختر بوابتك للوصول إلى خدماتنا وبرامج السفر.</Text>
          <Pressable style={s.authChoice} onPress={()=>{setEntry("customer");setAuthMode("login");}}>
            <View style={s.authChoiceIcon}><Text style={s.authChoiceGlyph}>✈</Text></View>
            <View style={{flex:1}}><Text style={s.authChoiceTitle}>أنا عميل</Text><Text style={s.authChoiceSub}>استكشف الرحلات واحجز وتابع طلباتك</Text></View><Text style={s.authArrow}>‹</Text>
          </Pressable>
          <Pressable style={s.authChoice} onPress={()=>{setEntry("staff");setAuthMode("login");}}>
            <View style={s.authChoiceIcon}><Text style={s.authChoiceGlyph}>▣</Text></View>
            <View style={{flex:1}}><Text style={s.authChoiceTitle}>دخول فريق تسنيم</Text><Text style={s.authChoiceSub}>بوابة الموظفين وإدارة المكتب</Text></View><Text style={s.authArrow}>‹</Text>
          </Pressable>
          <Text style={s.authFoot}>تجربة سفر تبدأ بالثقة، وتكتمل براحة البال</Text>
        </View> : <View style={s.authPanel}>
          <Pressable onPress={()=>setEntry(null)} style={s.authBack}><Text style={s.authBackText}>← رجوع</Text></Pressable>
          <Text style={s.authTitle}>{entry==="customer"?"مرحباً بك، لنبدأ رحلتك":"بوابة فريق تسنيم"}</Text>
          <Text style={s.authDescription}>{authMode==="signup"?"أنشئ حسابك لتتمكن من متابعة حجوزاتك.":"سجّل الدخول للوصول إلى حسابك وخدمات تسنيم."}</Text>
          {authMode==="signup" && <><Field value={fullName} onChangeText={setFullName} placeholder="الاسم الكامل"/><Field value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad"/></>}
          <Field value={email} onChangeText={setEmail} placeholder="البريد الإلكتروني" keyboardType="email-address"/>
          <Field value={password} onChangeText={(value:string)=>{setPassword(value);setPasswordError("");}} placeholder="كلمة المرور" secureTextEntry error={!!passwordError}/>{!!passwordError&&<Text style={s.inputErrorText}>{passwordError}</Text>}
          <Button title={authMode==="signup"?"إنشاء حساب العميل":"تسجيل الدخول"} onPress={authenticate} disabled={busy||!isOnline} loading={busy}/>
          {entry==="customer" && <Button secondary title={authMode==="login"?"إنشاء حساب جديد":"لدي حساب بالفعل"} onPress={()=>setAuthMode(authMode==="login"?"signup":"login")}/>}
          <Text style={s.authFoot}>بياناتك تُستخدم لإدارة حسابك وطلبات السفر.</Text>
        </View>}
        <Text style={s.authCopyright}>TASNIM TRAVEL · YOUR JOURNEY, OUR CARE</Text>
      </View>
    </ScrollView></KeyboardAvoidingView>
  </SafeAreaView>;

  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.pale}/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}><ScrollView style={{flex:1}} contentContainerStyle={[s.page,tab==="assistant"&&{paddingTop:8,paddingBottom:8,flexGrow:1}]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    {tab!=="assistant" && <View style={s.top}><View style={s.brandHeader}><BrandEmblem size={46}/><View><Text style={s.brandSmall}>TASNIM TRAVEL</Text><Text style={s.muted}>أهلاً {session.user.user_metadata?.full_name || session.user.email}</Text></View></View><View style={s.avatar}><Text style={s.avatarLetter}>{(session.user.user_metadata?.full_name||"ت").slice(0,1)}</Text></View></View>}
    {isStaff ? <>
      {adminPage==="home" && <>
        <View style={s.adminHero}><Text style={s.adminEyebrow}>TASNIM TRAVEL · CONTROL CENTER</Text><Text style={s.adminTitle}>{role==="owner"?"لوحة تحكم المالك":"لوحة إدارة المكتب"}</Text><Text style={s.adminSubtitle}>إدارة الحجوزات والعروض والموظفين من صفحات مستقلة وواضحة.</Text><View style={s.ownerBadge}><Text style={s.ownerBadgeText}>{role==="owner"?"المالك الرئيسي":"حساب موظف"}</Text></View></View>
        {canReadBookings && <View style={s.stats}><View style={s.stat}><Text style={s.statNum}>{bookings.length}</Text><Text style={s.statLabel}>الحجوزات</Text></View><View style={s.stat}><Text style={s.statNum}>{catalog.length}</Text><Text style={s.statLabel}>العروض النشطة</Text></View></View>}
        <View style={s.adminSection}><Text style={s.section}>أقسام الإدارة</Text><View style={s.adminActions}>
          {canReadBookings && <Pressable style={s.adminAction} onPress={()=>{setAdminPage("bookings");loadBookings();}}><Text style={s.adminActionIcon}>▤</Text><Text style={s.adminActionTitle}>الحجوزات</Text><Text style={s.adminActionHint}>عرض ومتابعة الطلبات</Text></Pressable>}
          {canManageServices && <Pressable style={s.adminAction} onPress={()=>setAdminPage("offers")}><Text style={s.adminActionIcon}>▣</Text><Text style={s.adminActionTitle}>إدارة العروض</Text><Text style={s.adminActionHint}>تعديل وإخفاء البرامج</Text></Pressable>}
          {canManageServices && <Pressable style={s.adminAction} onPress={()=>setAdminPage("addOffer")}><Text style={s.adminActionIcon}>＋</Text><Text style={s.adminActionTitle}>إضافة عرض</Text><Text style={s.adminActionHint}>نشر برنامج جديد</Text></Pressable>}
          {role==="owner" && <Pressable style={s.adminAction} onPress={()=>{setHeroTitleDraft(heroTitle);setHeroSubtitleDraft(heroSubtitle);setAdminPage("homeContent");}}><Text style={s.adminActionIcon}>✎</Text><Text style={s.adminActionTitle}>تخصيص الواجهة</Text><Text style={s.adminActionHint}>تعديل عنوان الترحيب ووصفه</Text></Pressable>}
          {role==="owner" && <Pressable style={s.adminAction} onPress={()=>setAdminPage("staff")}><Text style={s.adminActionIcon}>♙</Text><Text style={s.adminActionTitle}>الموظفون</Text><Text style={s.adminActionHint}>إنشاء حساب وتحديد الصلاحيات</Text></Pressable>}
        </View></View>
        <Button secondary title="تسجيل الخروج" onPress={signOut} loading={busy}/>
      </>}
      {adminPage!=="home" && <View style={s.panel}>
        <Pressable onPress={()=>{setAdminPage("home");setServiceOpen(false);setStaffOpen(false);}} style={s.detailBack}><Text style={s.detailBackArrow}>↶</Text><Text style={s.detailBackText}>العودة للوحة المالك</Text></Pressable>
        {adminPage==="bookings" && <>
          <Text style={s.heading}>إدارة الحجوزات</Text><Text style={s.muted}>راجع الطلبات وحدّث حالتها؛ تبقى محفوظة في السجل.</Text>
          <Button secondary title="تحديث الحجوزات" onPress={loadBookings} loading={bookingsLoading}/>
          {bookingsLoading?<ActivityIndicator color={C.blue}/>:bookingsError?<Text style={s.muted}>{bookingsError}</Text>:bookings.map(b=><View key={b.id} style={s.booking}><Text style={s.choiceTitle}>{b.customer_name} · {b.customer_phone}</Text><Text style={s.muted}>الخدمة: {categoryLabel(b.service_category)} · الحالة: {statusLabel(b.status)}</Text><Text style={s.muted}>{b.details?.notes||"بدون ملاحظات"}</Text>{canUpdateBookings&&<View style={s.statusActions}><Pressable onPress={()=>changeBookingStatus(b.id,"confirmed")}><Text style={s.statusText}>تأكيد</Text></Pressable><Pressable onPress={()=>changeBookingStatus(b.id,"under_review")}><Text style={s.statusText}>قيد المراجعة</Text></Pressable><Pressable onPress={()=>changeBookingStatus(b.id,"rejected")}><Text style={s.statusText}>رفض</Text></Pressable></View>}</View>)}
          {!bookingsLoading&&!bookingsError&&!bookings.length&&<Text style={s.note}>لا توجد حجوزات حالياً.</Text>}
        </>}
        {adminPage==="offers" && <>
          <Text style={s.heading}>إدارة العروض المنشورة</Text><Button title="إضافة عرض جديد" onPress={()=>setAdminPage("addOffer")}/>
          {catalogLoading?<ActivityIndicator color={C.blue}/>:catalogError?<Text style={s.muted}>{catalogError}</Text>:catalog.map(item=><View key={item.id} style={s.booking}><Text style={s.offerCategory}>{categoryLabel(item.category)}</Text><Text style={s.choiceTitle}>{item.title}</Text><Text style={s.muted}>{item.destination||"الوجهة غير محددة"} · {formatPrice(item.price,item.currency)}</Text><Text style={s.muted}>{item.description||"لا يوجد وصف إضافي"}</Text>
            <View style={s.statusActions}>
              <Pressable onPress={()=>{setEditingServiceId(item.id);setServiceCategory(item.category);setServiceTitle(item.title);setServiceDescription(item.description||"");setServiceDestination(item.destination||"");setServicePrice(item.price===null?"":String(item.price));setServiceStartDate(item.starts_at||"");setServiceEndDate(item.ends_at||"");setAdminPage("addOffer");}}><Text style={s.statusText}>تعديل العرض</Text></Pressable>
              <Pressable onPress={()=>archiveTravelService(item.id)}><Text style={[s.statusText,{color:"#B34B45"}]}>إخفاء العرض</Text></Pressable>
            </View></View>)}
          {!catalogLoading&&!catalogError&&!catalog.length&&<Text style={s.note}>لا توجد عروض منشورة.</Text>}
        </>}
        {adminPage==="addOffer" && <>
          <Text style={s.heading}>{editingServiceId?"تعديل العرض":"إضافة عرض جديد"}</Text><Text style={s.muted}>أدخل تفاصيل البرنامج ليظهر لجميع العملاء.</Text>
          <Text style={s.section}>نوع الخدمة</Text>
          {services.map(item=><Pressable key={item.category} onPress={()=>setServiceCategory(item.category)} style={s.permissionRow}><Text style={{color:serviceCategory===item.category?C.green:C.muted,fontWeight:"900"}}>{serviceCategory===item.category?"✓":"○"}</Text><Text style={s.choiceTitle}>{item.title}</Text></Pressable>)}
          <Field value={serviceTitle} onChangeText={setServiceTitle} placeholder="اسم البرنامج أو العرض"/>
          <Field value={serviceDestination} onChangeText={setServiceDestination} placeholder="الوجهة أو المدينة"/>
          <Field value={serviceDescription} onChangeText={setServiceDescription} placeholder="وصف العرض والتفاصيل" multiline/>
          <Field value={servicePrice} onChangeText={setServicePrice} placeholder="السعر بالريال اليمني" keyboardType="numeric"/>
          <Text style={s.formHint}>التواريخ اختيارية بصيغة YYYY-MM-DD</Text>
          <Field value={serviceStartDate} onChangeText={setServiceStartDate} placeholder="تاريخ البداية"/>
          <Field value={serviceEndDate} onChangeText={setServiceEndDate} placeholder="تاريخ النهاية"/>
          <Button title={editingServiceId?"حفظ تعديل العرض":"حفظ ونشر العرض"} onPress={createTravelService} disabled={busy} loading={busy}/>
        </>}
        {adminPage==="homeContent" && role==="owner" && <>
          <Text style={s.heading}>تخصيص واجهة العملاء</Text>
          <Text style={s.muted}>غيّر العنوان والوصف اللذين يظهران في أول الصفحة الرئيسية. ستظهر التغييرات لجميع العملاء بعد الحفظ.</Text>
          <Field value={heroTitleDraft} onChangeText={setHeroTitleDraft} placeholder="عنوان الواجهة"/>
          <Field value={heroSubtitleDraft} onChangeText={setHeroSubtitleDraft} placeholder="الوصف أسفل العنوان" multiline/>
          <Button title="حفظ تغييرات الواجهة" onPress={saveHomeSettings} loading={busy}/>
        </>}
        {adminPage==="staff" && role==="owner" && <>
          <Text style={s.heading}>إدارة حسابات الموظفين</Text><Text style={s.muted}>أنشئ حساباً وحدد الصلاحيات التي يحتاجها الموظف فقط.</Text>
          <Field value={staffName} onChangeText={setStaffName} placeholder="اسم الموظف"/>
          <Field value={staffEmail} onChangeText={setStaffEmail} placeholder="بريد الموظف" keyboardType="email-address"/>
          <Field value={staffPassword} onChangeText={setStaffPassword} placeholder="كلمة مرور مؤقتة (10 أحرف فأكثر)" secureTextEntry/>
          <Text style={s.section}>صلاحيات الموظف</Text>
          {allPermissions.map(p=><Pressable key={p} onPress={()=>setStaffPermissions(old=>old.includes(p)?old.filter(x=>x!==p):[...old,p])} style={s.permissionRow}><Text style={{color:staffPermissions.includes(p)?C.green:C.muted,fontWeight:"900"}}>{staffPermissions.includes(p)?"✓":"○"}</Text><Text style={s.choiceTitle}>{permissionLabels[p]}</Text></Pressable>)}
          <Button title="إنشاء حساب الموظف" onPress={createStaff} disabled={busy} loading={busy}/>
        </>}
      </View>}
    </> : <>
      {tab==="home" && !detail && <><View style={s.heroWrap}><ScrollView ref={heroRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={s.heroCarousel} contentContainerStyle={s.heroCarouselContent} onMomentumScrollEnd={event=>setHeroIndex(Math.round(event.nativeEvent.contentOffset.x/heroWidth))}>{heroSlides.map((slide,index)=><ImageBackground key={index} source={{uri:slide.image}} imageStyle={s.heroImage} style={[s.hero,{width:heroWidth}]}><View style={s.heroShade}/><Text style={s.heroEyebrow}>TASNIM TRAVEL · أهلاً بك</Text><Text style={s.heroTitle}>{index===0?heroTitle:slide.title}</Text><Text style={s.heroSub}>{index===0?heroSubtitle:slide.subtitle}</Text><View style={s.heroPill}><Text style={s.heroPillText}>اكتشف عروضنا</Text></View></ImageBackground>)}</ScrollView><View style={s.heroDots}>{heroSlides.map((_,i)=><View key={i} style={[s.heroDot,i===heroIndex&&s.heroDotActive]}/>)}</View></View><View style={s.homeIntro}><Text style={s.homeIntroTitle}>إلى أين تحب أن تسافر؟</Text><Text style={s.homeIntroSub}>اختر الخدمة المناسبة، وشاهد البرامج المتاحة من تسنيم.</Text></View><Text style={s.section}>استكشف خدماتنا</Text><View style={s.grid}>{services.map(item=><Pressable key={item.category} style={s.service} onPress={()=>setDetail(item)}><Image source={{uri:item.image}} style={s.serviceImage} resizeMode="cover"/><Text style={s.choiceTitle}>{item.title}</Text><Text style={s.muted}>{item.subtitle}</Text><Text style={s.price}>عرض التفاصيل ←</Text></Pressable>)}</View></>}
      {tab==="home" && detail && <View style={s.detailPage}>
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع إلى الخدمات السابقة" onPress={()=>setDetail(null)} style={s.detailBack}><Text style={s.detailBackArrow}>↶</Text><Text style={s.detailBackText}>رجوع</Text></Pressable>
        <Image source={{uri:detail.image}} style={s.detailImage} resizeMode="cover"/>
        <Text style={s.heading}>{detail.title}</Text>
        <Text style={s.muted}>{detail.subtitle} · البرامج والأسعار المعتمدة من مكتب تسنيم</Text>
        {catalog.filter(x=>detail.category==="umrah" ? ["umrah","hajj"].includes(x.category) : x.category===detail.category).map(item=><View key={item.id} style={s.booking}>
          <Text style={s.choiceTitle}>{item.title}</Text>
          {item.destination?<Text style={s.muted}>الوجهة: {item.destination}</Text>:null}
          <Text style={s.muted}>{item.description||"لا توجد تفاصيل إضافية حالياً"}</Text>
          <Text style={s.price}>{formatPrice(item.price,item.currency)}</Text>
          {item.starts_at||item.ends_at?<Text style={s.muted}>الموعد: {item.starts_at||"غير محدد"} – {item.ends_at||"غير محدد"}</Text>:null}
          <Button title="اطلب الحجز" onPress={()=>{setSelected({...detail,title:item.title});setSelectedServiceId(item.id);setBookingOpen(true);}}/>
        </View>)}
        {!catalog.some(x=>detail.category==="umrah" ? ["umrah","hajj"].includes(x.category) : x.category===detail.category)&&<View style={s.emptyState}><Text style={s.emptyTitle}>لا توجد عروض منشورة لهذا القسم حالياً</Text><Text style={s.muted}>يمكنك إرسال استفسار للفريق وسيتم التواصل معك.</Text><Button title="إرسال استفسار" onPress={()=>{setSelected(detail);setSelectedServiceId(null);setBookingOpen(true);}}/></View>}
      </View>}
      {tab==="bookings" && <View><Text style={s.heading}>حجوزاتي</Text><Text style={s.muted}>تابع حالة طلبات السفر من هنا.</Text><Button title="تحديث الحجوزات" onPress={loadBookings} loading={bookingsLoading}/>{bookingsLoading?<ActivityIndicator color={C.blue}/>:bookingsError?<View style={s.panel}><Text style={s.muted}>{bookingsError}</Text><Button secondary title="إعادة المحاولة" onPress={loadBookings}/></View>:bookings.map(b=><View key={b.id} style={s.booking}><View style={s.offerTopLine}><Text style={s.statusBadge}>{statusLabel(b.status)}</Text><Text style={s.offerCategory}>{categoryLabel(b.service_category)}</Text></View><Text style={s.choiceTitle}>{b.details?.service_title||categoryLabel(b.service_category)}</Text><Text style={s.muted}>{new Date(b.created_at).toLocaleDateString("ar-YE")}</Text>{b.details?.notes?<Text style={s.muted}>ملاحظاتك: {b.details.notes}</Text>:null}</View>)}{!bookingsLoading&&!bookingsError&&!bookings.length&&<Text style={s.note}>لا توجد حجوزات حتى الآن. ابدأ باختيار خدمة وأرسل طلبك.</Text>}</View>}
      {tab==="assistant" && <View style={[s.assistantScreen,{minHeight:windowHeight-110}]}>
        <View style={s.assistantHeader}>
          <View style={s.assistantHeaderActions}><Pressable onPress={()=>setTab("home")} style={s.assistantHeaderButton}><Text style={s.assistantHeaderButtonText}>←</Text></Pressable><Pressable onPress={()=>{setChatMessages([]);setChatInput("");}} style={s.assistantHeaderButton}><Text style={s.assistantHeaderButtonText}>＋</Text></Pressable></View>
          <View style={s.assistantIdentity}><View style={s.assistantAvatar}><Text style={s.assistantAvatarText}>🤖</Text><View style={s.assistantOnlineDot}/></View><View style={{flex:1}}><Text style={s.assistantTitle}>مساعد تسنيم</Text><Text style={s.assistantOnline}>متاح لمساعدتك في السفر</Text></View></View>
        </View>
        <ScrollView ref={chatHistoryRef} style={s.chatHistory} contentContainerStyle={s.chatHistoryContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled onContentSizeChange={()=>chatHistoryRef.current?.scrollToEnd({animated:true})}>
          {chatMessages.length===0?<View style={s.chatWelcome}>
            <View style={s.chatWelcomeIcon}><Text style={s.chatWelcomeGlyph}>✈</Text></View>
            <Text style={s.welcomeTitle}>{new Date().getHours()<12?"صباح النور":new Date().getHours()<18?"مساء الخير":"مساء النور"}، {session.user.user_metadata?.full_name?.split(" ")[0]||"أهلاً بك"}</Text>
            <Text style={s.chatWelcomeText}>أنا هنا لمساعدتك في اختيار وجهتك وترتيب رحلتك. اسألني عن العروض أو الحج والعمرة أو التأشيرات.</Text>
            <Text style={s.chatSuggestionsLabel}>ابدأ بسؤال</Text>
            <Pressable style={s.suggestionChip} onPress={()=>sendAssistantMessage("ما هي العروض المتاحة حالياً؟")}><Text style={s.suggestionText}>ما هي العروض المتاحة حالياً؟</Text><Text style={s.suggestionArrow}>‹</Text></Pressable>
            <Pressable style={s.suggestionChip} onPress={()=>sendAssistantMessage("أريد الاستفسار عن الحج والعمرة")}><Text style={s.suggestionText}>أريد الاستفسار عن الحج والعمرة</Text><Text style={s.suggestionArrow}>‹</Text></Pressable>
            <Pressable style={s.suggestionChip} onPress={()=>sendAssistantMessage("ما متطلبات التأشيرة؟")}><Text style={s.suggestionText}>ما متطلبات التأشيرة؟</Text><Text style={s.suggestionArrow}>‹</Text></Pressable>
          </View>:<View style={s.chatDay}><Text style={s.chatDayText}>محادثتك مع تسنيم</Text></View>}
          {chatMessages.map((m:any,i:number)=><View key={i} style={[s.messageRow,m.role==="user"?s.messageUser:s.messageAssistant]}>
            {m.role==="assistant"&&<View style={s.messageMiniAvatar}><Text style={s.messageMiniAvatarText}>🤖</Text></View>}
            <View style={[s.chatBubble,m.role==="user"?s.chatUser:s.chatAssistant,m.isError&&s.chatError]}>
              <Text style={[s.chatText,m.role==="assistant"?s.chatAssistantText:s.chatUserText]}>{m.content}</Text>
              <Text style={[s.chatTime,m.role==="user"?s.chatTimeUser:s.chatTimeAssistant]}>{m.createdAt?new Date(m.createdAt).toLocaleTimeString("ar-YE",{hour:"2-digit",minute:"2-digit"}):""}</Text>
            </View>
          </View>)}
          {chatBusy&&<View style={[s.messageRow,s.messageAssistant]}><View style={s.messageMiniAvatar}><Text style={s.messageMiniAvatarText}>ت</Text></View><View style={s.typingBubble}><ActivityIndicator size="small" color={C.blue}/><Text style={s.typingText}>مساعد تسنيم يكتب الآن...</Text></View></View>}
        </ScrollView>
        <View style={s.chatComposer}>
          <TextInput value={chatInput} onChangeText={setChatInput} placeholder="اكتب رسالتك هنا..." placeholderTextColor={C.muted} multiline maxLength={1200} textAlign="right" textAlignVertical="center" returnKeyType="send" blurOnSubmit={false} onSubmitEditing={()=>sendAssistantMessage()} style={s.chatComposerInput}/>
          <Pressable accessibilityRole="button" accessibilityLabel="إرسال الرسالة" onPress={()=>sendAssistantMessage()} disabled={chatBusy||!chatInput.trim()||!isOnline} style={[s.chatSend,(chatBusy||!chatInput.trim()||!isOnline)&&{opacity:0.45}]}><Text style={s.chatSendText}>➤</Text></Pressable>
        </View>
        <Text style={s.chatDisclaimer}>معلومات الأسعار والمواعيد النهائية يؤكدها فريق تسنيم.</Text>
      </View>}
      {tab==="inquiries" && <View style={s.panel}><Text style={s.heading}>استفساراتك</Text><Text style={s.muted}>للاستفسار عن الأسعار والمواعيد، اختر الخدمة وأرسل طلباً للمكتب وسيتواصل معك الفريق.</Text>{services.map(item=><Pressable key={item.category} style={s.choice} onPress={()=>{setSelected(item);setSelectedServiceId(null);setBookingOpen(true);}}><Text style={s.choiceTitle}>{item.title}</Text><Text style={s.arrow}>‹</Text></Pressable>)}</View>}
      {tab==="account" && <View style={s.panel}>
        <Text style={s.heading}>حسابي</Text>
        <View style={s.accountProfile}><View style={s.accountAvatar}><Text style={s.accountAvatarText}>{(session.user.user_metadata?.full_name||"ت").slice(0,1)}</Text></View><Text style={s.accountName}>{session.user.user_metadata?.full_name||"عميل تسنيم"}</Text><Text style={s.muted}>{session.user.email}</Text><Text style={s.muted}>رقم الهاتف: {phone||session.user.user_metadata?.phone||"غير مضاف"}</Text></View>
        <Text style={s.section}>إدارة حسابك</Text>
        <Pressable style={s.accountRow} onPress={()=>setTab("bookings")}><Text style={s.accountRowArrow}>‹</Text><Text style={s.accountRowText}>حجوزاتي ومتابعة الطلبات</Text><Text style={s.accountRowIcon}>▣</Text></Pressable>
        <Pressable style={s.accountRow} onPress={()=>setTab("inquiries")}><Text style={s.accountRowArrow}>‹</Text><Text style={s.accountRowText}>استفساراتي وخدمات تسنيم</Text><Text style={s.accountRowIcon}>?</Text></Pressable>
        <Pressable style={s.accountRow} onPress={()=>{setProfileNameDraft(session.user.user_metadata?.full_name||fullName||"");setProfileEditOpen(v=>!v);}}><Text style={s.accountRowArrow}>‹</Text><Text style={s.accountRowText}>تعديل بياناتي الشخصية</Text><Text style={s.accountRowIcon}>♙</Text></Pressable>
        {profileEditOpen&&<View style={s.profileEditBox}><Text style={s.choiceTitle}>تعديل الاسم الظاهر</Text><Field value={profileNameDraft} onChangeText={setProfileNameDraft} placeholder="اكتب اسمك الجديد"/><Button title="حفظ الاسم الجديد" onPress={saveProfileName} loading={busy}/><Button secondary title="إلغاء" onPress={()=>setProfileEditOpen(false)}/></View>}
        <Button secondary title="تسجيل الخروج" onPress={signOut} loading={busy}/>
      </View>}
      {tab==="home" && !detail && <View style={s.adminSection}><Text style={s.section}>أحدث عروض تسنيم</Text>{catalogLoading?<ActivityIndicator color={C.blue}/>:catalogError?<View style={s.panel}><Text style={s.muted}>تعذر تحميل العروض حالياً.</Text><Button secondary title="إعادة المحاولة" onPress={refreshCatalog}/></View>:catalog.slice(0,4).map(item=><Pressable key={item.id} style={s.offerCard} onPress={()=>{setSelected({image:(services.find(x=>x.category===item.category)|| (item.category==="hajj"?services.find(x=>x.category==="umrah"):undefined))?.image||services[2].image,title:item.title,category:item.category,subtitle:item.description});setSelectedServiceId(item.id);setBookingOpen(true);}}><Image source={{uri:(services.find(x=>x.category===item.category)||(item.category==="hajj"?services.find(x=>x.category==="umrah"):undefined))?.image||services[2].image}} style={s.offerImage}/><View style={s.offerContent}><Text style={s.offerCategory}>{categoryLabel(item.category)}</Text><Text style={s.offerTitle}>{item.title}</Text>{item.destination?<Text style={s.muted}>{item.destination}</Text>:null}<Text style={s.offerPrice}>{formatPrice(item.price,item.currency)}</Text><Text style={s.offerAction}>اطلب الحجز ←</Text></View></Pressable>)}{!catalogLoading&&!catalogError&&!catalog.length?<View style={s.emptyState}><Text style={s.emptyTitle}>العروض الجديدة قريباً</Text><Text style={s.muted}>نعمل على تجهيز برامج سفر مميزة. يمكنك إرسال استفسارك الآن.</Text></View>:null}</View>}
      {bookingOpen && <View style={s.panel}><Text style={s.heading}>طلب حجز · {selected.title}</Text><Text style={s.muted}>أدخل بيانات التواصل وسيصل طلبك إلى فريق تسنيم.</Text><Field value={fullName} onChangeText={setFullName} placeholder="الاسم الكامل"/><Field value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad"/><Field value={bookingNotes} onChangeText={setBookingNotes} placeholder="تفاصيل الرحلة أو الوجهة (اختياري)" multiline/><Button title="إرسال طلب الحجز" onPress={createBooking} disabled={busy} loading={busy}/><Button secondary title="إلغاء" onPress={()=>setBookingOpen(false)}/></View>}
      {tab==="home" && !detail && <View style={s.promo}><Text style={s.promoTitle}>رحلتك تبدأ بخطوة</Text><Text style={s.muted}>أرسل طلبك وسيقوم فريق تسنيم بمراجعته والتواصل معك بكل عناية.</Text></View>}
    </>}
    </ScrollView>{!isStaff && <View style={s.bottomNav}>{([{id:"home",label:"الرئيسية",icon:"⌂"},{id:"bookings",label:"حجوزاتي",icon:"▣"},{id:"inquiries",label:"استفساراتي",icon:"?"},{id:"assistant",label:"مساعد تسنيم",icon:"🤖"},{id:"account",label:"حسابي",icon:"♙"}] as const).map(item=><Pressable key={item.id} onPress={()=>{setTab(item.id);setDetail(null);if(item.id==="bookings")loadBookings();}} style={s.navItem}><Text style={[s.navIcon,tab===item.id&&s.navActive]}>{item.icon}</Text><Text style={[s.navLabel,tab===item.id&&s.navActive]}>{item.label}</Text></Pressable>)}</View>}
  </KeyboardAvoidingView></SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.pale},assistantFloating:{position:"absolute",width:62,height:62,borderRadius:29,backgroundColor:C.navy,borderWidth:3,borderColor:C.white,alignItems:"center",justifyContent:"center",elevation:8,shadowColor:"#000",shadowOpacity:0.2,shadowRadius:8,shadowOffset:{width:0,height:3}},assistantFloatingText:{color:C.white,fontSize:31,fontWeight:"900"},assistantFloatingDot:{position:"absolute",width:12,height:12,borderRadius:6,backgroundColor:"#32B889",right:2,bottom:3,borderWidth:2,borderColor:C.white},formClose:{width:34,height:34,borderRadius:17,backgroundColor:C.sky,alignItems:"center",justifyContent:"center",marginBottom:8},formCloseText:{fontSize:27,color:C.blue,fontWeight:"500",lineHeight:30},center:{alignItems:"center",justifyContent:"center",gap:12},assistantScreen:{backgroundColor:C.white,borderRadius:22,borderWidth:1,borderColor:C.border,padding:12,marginTop:4,flex:1},assistantHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:5,paddingBottom:13,borderBottomWidth:1,borderBottomColor:C.border},assistantIdentity:{flex:1,flexDirection:"row-reverse",alignItems:"center",gap:11},assistantHeaderActions:{flexDirection:"row",alignItems:"center"},assistantHeaderButton:{width:38,height:38,borderRadius:19,backgroundColor:C.sky,alignItems:"center",justifyContent:"center"},assistantHeaderButtonText:{fontSize:25,color:C.blue,fontWeight:"500",lineHeight:28},assistantAvatar:{width:46,height:46,borderRadius:23,backgroundColor:C.navy,alignItems:"center",justifyContent:"center",position:"relative"},assistantAvatarText:{color:C.white,fontSize:22,fontWeight:"900"},assistantOnlineDot:{position:"absolute",width:11,height:11,borderRadius:6,backgroundColor:"#32B889",borderWidth:2,borderColor:C.white,bottom:0,left:0},assistantTitle:{color:C.navy,fontSize:17,fontWeight:"900",textAlign:"right"},assistantOnline:{color:C.green,fontSize:10,textAlign:"right",marginTop:3},chatHistory:{flex:1,minHeight:220,maxHeight:460,backgroundColor:"#F7FAF8",borderRadius:17,marginTop:12},chatHistoryContent:{padding:12,gap:13,flexGrow:1,justifyContent:"flex-end",width:"100%"},chatWelcome:{alignSelf:"stretch",alignItems:"center",backgroundColor:C.white,borderRadius:18,padding:16,borderWidth:1,borderColor:C.border,gap:9,marginTop:10},chatWelcomeIcon:{width:54,height:54,borderRadius:27,backgroundColor:C.sky,alignItems:"center",justifyContent:"center"},chatWelcomeGlyph:{fontSize:27,color:C.blue},welcomeTitle:{fontSize:17,fontWeight:"900",color:C.navy,textAlign:"center"},chatWelcomeText:{fontSize:12,color:C.muted,textAlign:"center",lineHeight:21},chatSuggestionsLabel:{fontSize:11,color:C.navy,fontWeight:"900",alignSelf:"flex-end",marginTop:8},suggestionChip:{alignSelf:"stretch",flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",borderWidth:1,borderColor:C.border,backgroundColor:"#F8FBF9",borderRadius:13,paddingHorizontal:12,paddingVertical:12,marginTop:1},suggestionText:{fontSize:12,color:C.blue,textAlign:"right",fontWeight:"700"},suggestionArrow:{fontSize:22,color:C.gold},chatDay:{alignSelf:"center",backgroundColor:C.sky,borderRadius:20,paddingHorizontal:13,paddingVertical:6,marginVertical:5},chatDayText:{fontSize:10,color:C.muted,fontWeight:"700"},messageRow:{width:"100%",flexDirection:"row",alignItems:"flex-end",gap:6},messageUser:{justifyContent:"flex-start"},messageAssistant:{justifyContent:"flex-end"},messageMiniAvatar:{width:25,height:25,borderRadius:13,backgroundColor:C.navy,alignItems:"center",justifyContent:"center",marginBottom:3},messageMiniAvatarText:{fontSize:12,color:C.white,fontWeight:"900"},chatBubble:{maxWidth:"88%",paddingHorizontal:13,paddingVertical:10,borderRadius:17,flexShrink:1,minWidth:0},chatUser:{alignSelf:"flex-start",backgroundColor:"#DDF2EC",borderBottomLeftRadius:5},chatAssistant:{alignSelf:"flex-end",backgroundColor:C.navy,borderBottomRightRadius:5},chatError:{backgroundColor:"#FFF2F0",borderWidth:1,borderColor:"#F1C5BE"},chatText:{fontSize:14,lineHeight:24,textAlign:"right",writingDirection:"rtl",flexShrink:1,includeFontPadding:false,flexWrap:"wrap"},chatUserText:{color:C.text},chatAssistantText:{color:C.white},chatTime:{fontSize:9,marginTop:5,textAlign:"left"},chatTimeUser:{color:"#65877E"},chatTimeAssistant:{color:"#C8E0DA"},typingBubble:{flexDirection:"row-reverse",alignItems:"center",gap:8,backgroundColor:C.white,borderRadius:16,paddingHorizontal:13,paddingVertical:11,borderWidth:1,borderColor:C.border},typingText:{fontSize:11,color:C.muted},chatComposer:{flexDirection:"row-reverse",alignItems:"center",gap:8,borderWidth:1,borderColor:C.border,borderRadius:24,padding:7,backgroundColor:C.white,marginTop:11,minHeight:58},chatComposerInput:{flex:1,minHeight:42,maxHeight:108,paddingHorizontal:12,paddingVertical:8,color:C.text,textAlign:"right",fontSize:14,writingDirection:"rtl"},chatSend:{width:44,height:44,borderRadius:22,backgroundColor:C.blue,alignItems:"center",justifyContent:"center"},chatSendText:{fontSize:22,color:C.white,fontWeight:"900"},chatDisclaimer:{fontSize:9,color:C.muted,textAlign:"center",marginTop:7},emailInput:{textAlign:"left",writingDirection:"ltr"},inputError:{borderColor:"#D93025",borderWidth:1.7,backgroundColor:"#FFF5F5"},inputErrorText:{color:"#C62828",textAlign:"right",fontSize:11,fontWeight:"800",marginTop:6},profileEditBox:{backgroundColor:"#F7FAF8",borderWidth:1,borderColor:C.border,borderRadius:15,padding:13,marginTop:12},offlineNotice:{backgroundColor:"#FFF4E5",borderColor:"#E7B86A",borderWidth:1,borderRadius:14,padding:13,marginBottom:14},offlineTitle:{color:"#8A4B08",fontWeight:"900",textAlign:"right",fontSize:14},offlineText:{color:"#8A4B08",textAlign:"right",fontSize:12,lineHeight:19,marginTop:5},authPage:{flexGrow:1,backgroundColor:C.pale},authHero:{minHeight:390,alignItems:"center",justifyContent:"center",paddingTop:34,paddingBottom:42,overflow:"hidden"},authHeroImage:{resizeMode:"cover"},authHeroShade:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(4,39,43,0.72)"},authBrand:{color:C.white,fontSize:40,fontWeight:"900",marginTop:15},authEnglish:{color:"#E6D3A3",fontSize:14,fontWeight:"900",letterSpacing:4,marginTop:3},authGoldLine:{width:76,height:2,backgroundColor:C.gold,marginTop:14},authSlogan:{color:C.white,fontSize:17,fontWeight:"800",marginTop:14},authSubSlogan:{color:"#E1EBE7",fontSize:11,marginTop:7},authContent:{paddingHorizontal:18,marginTop:-24,paddingBottom:30},authPanel:{backgroundColor:C.white,borderRadius:25,padding:20,borderWidth:1,borderColor:C.border,elevation:5,shadowColor:"#123A3B",shadowOpacity:0.1,shadowRadius:16,shadowOffset:{width:0,height:7}},authTitle:{fontSize:22,fontWeight:"900",color:C.navy,textAlign:"right"},authDescription:{fontSize:12,color:C.muted,textAlign:"right",marginTop:7,marginBottom:13,lineHeight:20},authChoice:{flexDirection:"row-reverse",alignItems:"center",backgroundColor:"#F5F8F5",borderRadius:17,padding:14,marginTop:11,borderWidth:1,borderColor:C.border,minHeight:76},authChoiceIcon:{width:46,height:46,borderRadius:15,backgroundColor:"#E5F2EE",alignItems:"center",justifyContent:"center",marginLeft:12},authChoiceGlyph:{fontSize:23,color:C.blue,fontWeight:"900"},authChoiceTitle:{fontSize:15,color:C.navy,fontWeight:"900",textAlign:"right"},authChoiceSub:{fontSize:11,color:C.muted,textAlign:"right",marginTop:4},authArrow:{fontSize:27,color:C.gold,marginLeft:7},authFoot:{fontSize:10,color:C.muted,textAlign:"center",marginTop:17},authBack:{alignSelf:"flex-start",paddingVertical:8,paddingHorizontal:12,backgroundColor:C.sky,borderRadius:12,marginBottom:12},authBackText:{fontSize:12,fontWeight:"800",color:C.blue},authCopyright:{textAlign:"center",color:"#82938D",fontSize:9,fontWeight:"800",letterSpacing:1,marginTop:18},
 welcome:{flexGrow:1,justifyContent:"center",padding:22,backgroundColor:C.sky},
 splash:{backgroundColor:C.navy,alignItems:"center",justifyContent:"center"},
 splashArabic:{color:C.white,fontSize:42,fontWeight:"900",marginTop:22,letterSpacing:1},
 splashDivider:{width:176,height:2,backgroundColor:C.gold,marginTop:12,marginBottom:12},
 splashEnglish:{color:C.gold,fontSize:17,fontWeight:"900",letterSpacing:3},
 splashTagline:{color:"#D9E8E3",fontSize:13,marginTop:14},
 logo:{alignSelf:"center",width:74,height:74,borderRadius:24,backgroundColor:C.white,alignItems:"center",justifyContent:"center",marginBottom:12},
 loginBrandMark:{alignSelf:"center",width:104,height:104,borderRadius:32,backgroundColor:C.navy,alignItems:"center",justifyContent:"center",marginBottom:18,borderWidth:5,borderColor:C.gold},loginBrandLetter:{color:C.gold,fontSize:58,fontWeight:"900",fontStyle:"italic"},headerLogo:{width:48,height:48,borderRadius:15,backgroundColor:C.navy,alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:C.gold},headerLogoText:{color:C.gold,fontSize:28,fontWeight:"900",fontStyle:"italic"},brandHeader:{flexDirection:"row",alignItems:"center",gap:9},avatarLetter:{color:C.navy,fontWeight:"900",fontSize:17},
 brand:{textAlign:"center",fontSize:25,fontWeight:"900",letterSpacing:2,color:C.navy},brandAr:{textAlign:"center",fontSize:18,fontWeight:"800",color:C.text,marginTop:7},tagline:{textAlign:"center",color:C.muted,marginTop:7,marginBottom:25},
 panel:{backgroundColor:C.white,padding:19,borderRadius:22,marginTop:16,borderWidth:1,borderColor:C.border},
 heading:{fontSize:22,fontWeight:"900",color:C.text,textAlign:"right",marginBottom:7},adminTitle:{fontSize:25,fontWeight:"900",color:C.white,textAlign:"right",marginBottom:8},adminSubtitle:{fontSize:12,color:"#D7E6EF",textAlign:"right",lineHeight:20},muted:{color:C.muted,textAlign:"right",fontSize:12,lineHeight:19},
 choice:{flexDirection:"row-reverse",alignItems:"center",backgroundColor:C.pale,borderRadius:15,padding:15,marginTop:13,borderWidth:1,borderColor:C.border},choiceIcon:{fontSize:26,marginLeft:12},choiceTitle:{textAlign:"right",color:C.text,fontSize:15,fontWeight:"800",marginBottom:4},arrow:{color:C.blue,fontSize:28,marginLeft:5},
 input:{borderWidth:1,borderColor:C.border,borderRadius:14,paddingHorizontal:15,paddingVertical:14,marginTop:12,textAlign:"right",color:C.text,backgroundColor:C.pale,minHeight:54,flexShrink:0},multilineInput:{minHeight:96},formHint:{color:C.muted,fontSize:11,textAlign:"right",marginTop:12},
 button:{backgroundColor:C.blue,borderRadius:13,padding:15,alignItems:"center",marginTop:13},secondary:{backgroundColor:C.sky,borderWidth:1,borderColor:"#CDE3F0"},buttonText:{color:C.white,fontWeight:"800",fontSize:14},
 note:{color:C.muted,fontSize:11,textAlign:"center",lineHeight:18,marginTop:14},
 adminHero:{backgroundColor:C.navy,padding:22,borderRadius:22,marginBottom:14,overflow:"hidden"},adminEyebrow:{color:"#A9D8F0",textAlign:"right",fontSize:10,fontWeight:"900",letterSpacing:1,marginBottom:10},ownerBadge:{alignSelf:"flex-end",backgroundColor:"#2C83B9",paddingHorizontal:13,paddingVertical:7,borderRadius:20,marginTop:14},ownerBadgeText:{color:C.white,fontSize:11,fontWeight:"900"},adminSection:{marginTop:8,marginBottom:8},adminActions:{flexDirection:"row-reverse",flexWrap:"wrap",gap:9},adminAction:{width:"31%",minHeight:116,backgroundColor:C.white,borderRadius:16,padding:10,borderWidth:1,borderColor:C.border,alignItems:"center",justifyContent:"center"},adminActionIcon:{fontSize:25,color:C.blue,marginBottom:7},adminActionTitle:{color:C.text,fontWeight:"900",fontSize:12,textAlign:"center"},adminActionHint:{color:C.muted,fontSize:9,textAlign:"center",marginTop:5}, page:{padding:18,paddingBottom:120},top:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",marginBottom:22},brandSmall:{color:C.navy,fontWeight:"900",letterSpacing:1,fontSize:16},avatar:{width:42,height:42,borderRadius:21,backgroundColor:C.white,alignItems:"center",justifyContent:"center"},
 heroWrap:{marginBottom:18},heroCarousel:{height:212,marginBottom:8},heroCarouselContent:{gap:0},heroDots:{flexDirection:"row",justifyContent:"center",alignItems:"center",gap:7,marginTop:2},heroDot:{width:7,height:7,borderRadius:5,backgroundColor:"#C5D8D1"},heroDotActive:{width:22,backgroundColor:C.green},heroImage:{borderRadius:22,opacity:0.9},hero:{backgroundColor:C.navy,borderRadius:24,padding:22,minHeight:204,marginBottom:0,overflow:"hidden",justifyContent:"center"},heroEyebrow:{color:"#F0D99E",textAlign:"right",fontSize:10,fontWeight:"800"},heroTitle:{color:C.white,textAlign:"right",fontSize:25,fontWeight:"900",marginTop:12,maxWidth:"88%"},heroSub:{color:"#E3EDF3",textAlign:"right",marginTop:9,fontSize:13,lineHeight:21},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(10,39,60,0.54)",borderRadius:22},heroPill:{alignSelf:"flex-end",backgroundColor:"#D8B56D",paddingHorizontal:15,paddingVertical:8,borderRadius:18,marginTop:16},heroPillText:{color:C.navy,fontWeight:"900",fontSize:11},
 section:{color:C.text,textAlign:"right",fontWeight:"900",fontSize:19,marginTop:18,marginBottom:12},homeIntro:{paddingTop:2,paddingBottom:4},homeIntroTitle:{fontSize:21,fontWeight:"900",color:C.navy,textAlign:"right"},homeIntroSub:{fontSize:12,color:C.muted,textAlign:"right",marginTop:5,lineHeight:19},
 grid:{flexDirection:"row-reverse",flexWrap:"wrap",justifyContent:"space-between"},service:{width:"48%",backgroundColor:C.white,padding:15,borderRadius:17,marginBottom:11,borderWidth:1,borderColor:C.border},serviceSelected:{borderColor:C.blue,backgroundColor:C.sky},serviceImage:{width:"100%",height:104,borderRadius:12,marginBottom:10,backgroundColor:C.sky},
 detailPage:{backgroundColor:C.white,padding:16,borderRadius:20,borderWidth:1,borderColor:C.border,marginBottom:18},detailBack:{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:6,minWidth:76,minHeight:44,paddingHorizontal:12,borderRadius:14,backgroundColor:C.sky,borderWidth:1,borderColor:C.border},detailBackArrow:{fontSize:25,fontWeight:"900",color:C.green,transform:[{rotate:"-18deg"}]},detailBackText:{fontSize:13,fontWeight:"800",color:C.navy},detailImage:{width:"100%",height:190,borderRadius:16,marginTop:14,marginBottom:16,backgroundColor:C.sky},
 promo:{backgroundColor:"#E8F1F4",padding:19,borderRadius:18,marginTop:18,borderWidth:1,borderColor:"#D7E5EA"},promoTitle:{fontSize:17,fontWeight:"900",color:C.navy,textAlign:"right",marginBottom:5},stats:{flexDirection:"row",gap:10,marginVertical:15},stat:{flex:1,backgroundColor:C.white,padding:16,borderRadius:17,alignItems:"center",borderWidth:1,borderColor:C.border},statNum:{color:C.blue,fontSize:26,fontWeight:"900",marginBottom:4},statLabel:{color:C.muted,fontSize:10,fontWeight:"700",textAlign:"center"},
 booking:{backgroundColor:C.white,padding:15,borderRadius:16,marginTop:9,borderWidth:1,borderColor:C.border},offerTopLine:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",marginBottom:7},offerCategory:{fontSize:10,color:C.blue,fontWeight:"900",textAlign:"right"},offerPrice:{fontSize:12,color:C.green,fontWeight:"900",textAlign:"right"},statusBadge:{fontSize:10,color:C.green,fontWeight:"900",backgroundColor:"#E7F5EF",paddingHorizontal:10,paddingVertical:5,borderRadius:12,overflow:"hidden"},offerCard:{backgroundColor:C.white,borderRadius:18,overflow:"hidden",borderWidth:1,borderColor:C.border,marginTop:10,flexDirection:"row-reverse",minHeight:118},offerImage:{width:112,height:118,backgroundColor:C.sky},offerContent:{flex:1,padding:13,justifyContent:"center",alignItems:"flex-end"},offerTitle:{fontSize:15,fontWeight:"900",color:C.text,textAlign:"right",marginTop:4},offerAction:{fontSize:11,color:C.blue,fontWeight:"900",marginTop:7},emptyState:{padding:20,backgroundColor:C.white,borderRadius:16,borderWidth:1,borderColor:C.border,marginTop:10},emptyTitle:{fontSize:15,color:C.navy,fontWeight:"900",textAlign:"right",marginBottom:5},permissionRow:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.border},statusActions:{flexDirection:"row-reverse",justifyContent:"space-around",marginTop:12},statusText:{color:C.blue,fontWeight:"800",fontSize:12},price:{color:C.green,textAlign:"right",fontWeight:"900",marginTop:5},bottomNav:{position:"absolute",bottom:0,left:0,right:0,backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.border,flexDirection:"row-reverse",justifyContent:"space-around",paddingTop:10,paddingBottom:12},navItem:{alignItems:"center",minWidth:65,paddingVertical:3},navIcon:{fontSize:21,color:C.muted,fontWeight:"900"},navLabel:{fontSize:10,color:C.muted,marginTop:3},accountProfile:{alignItems:"center",backgroundColor:C.pale,borderRadius:18,padding:18,borderWidth:1,borderColor:C.border,marginTop:10},accountAvatar:{width:66,height:66,borderRadius:33,backgroundColor:C.navy,alignItems:"center",justifyContent:"center",marginBottom:10},accountAvatarText:{fontSize:28,color:C.white,fontWeight:"900"},accountName:{fontSize:18,color:C.navy,fontWeight:"900",marginBottom:5},accountRow:{flexDirection:"row-reverse",alignItems:"center",backgroundColor:C.pale,borderWidth:1,borderColor:C.border,borderRadius:14,padding:15,marginTop:10,minHeight:58},accountRowIcon:{fontSize:20,color:C.blue,width:32,textAlign:"center"},accountRowText:{flex:1,textAlign:"right",color:C.text,fontSize:13,fontWeight:"800"},accountRowArrow:{fontSize:26,color:C.gold,marginLeft:8},navActive:{color:C.blue,fontWeight:"900"}
});