import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import { Alert, BackHandler, ScrollView, StatusBar, StyleSheet, Text, TextInput, Pressable, View, ActivityIndicator, Image, ImageBackground, useWindowDimensions } from "react-native";
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
  { image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=700&auto=format&fit=crop", title: "السياحة", category: "tourism", subtitle: "اكتشف وجهات جديدة" },
  { image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&auto=format&fit=crop", title: "الفنادق", category: "hotel", subtitle: "إقامة تناسبك" },
  { image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=700&auto=format&fit=crop", title: "التأشيرات", category: "visa", subtitle: "خدمات التأشيرات" },
  { image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=700&auto=format&fit=crop", title: "النقل", category: "transport", subtitle: "تنقل براحة" }
];
const C = { navy:"#073F43", blue:"#167C73", sky:"#E5F2EE", pale:"#F5F8F5", white:"#FFFFFF", text:"#123A3B", muted:"#718784", border:"#DCE9E4", green:"#21856E", gold:"#C6A15B" };
const heroSlides = [
  { image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&auto=format&fit=crop", title: "اكتشف رحلتك مع تسنيم", subtitle: "وجهات مختارة وتجارب لا تُنسى" },
  { image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop", title: "إجازتك القادمة تبدأ هنا", subtitle: "اختر وجهتك ودع تفاصيل الرحلة علينا" },
  { image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1200&auto=format&fit=crop", title: "العالم أقرب مما تتخيل", subtitle: "برامج سفر تناسب وقتك وميزانيتك" }
];

function BrandEmblem({ size=92 }: { size?: number }) {
  return <View style={{width:size,height:size,borderRadius:size*0.32,backgroundColor:C.navy,borderWidth:2,borderColor:C.gold,alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
    <View style={{position:"absolute",top:size*0.12,width:size*0.64,height:size*0.64,borderRadius:size*0.32,borderWidth:2,borderColor:C.gold,opacity:0.9}}/>
    <Text style={{fontSize:size*0.42,color:C.gold,fontWeight:"900",lineHeight:size*0.5}}>✦</Text>
    <Text style={{fontSize:size*0.16,color:C.white,fontWeight:"900",marginTop:-size*0.02}}>T</Text>
  </View>;
}
function Field({ value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline=false }: any) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} secureTextEntry={secureTextEntry} keyboardType={keyboardType} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"} accessibilityLabel={placeholder} style={[s.input,multiline&&s.multilineInput]} />;
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
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(""); const [selected, setSelected] = useState<Service>(services[0]); const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false); const [bookingNotes, setBookingNotes] = useState("");
  const [serviceOpen, setServiceOpen] = useState(false); const [serviceTitle, setServiceTitle] = useState(""); const [serviceDescription, setServiceDescription] = useState(""); const [servicePrice, setServicePrice] = useState(""); const [serviceCategory, setServiceCategory] = useState("umrah");
  const [serviceDestination,setServiceDestination]=useState(""); const [serviceStartDate,setServiceStartDate]=useState(""); const [serviceEndDate,setServiceEndDate]=useState("");
  const [bookings, setBookings] = useState<any[]>([]); const [staffOpen, setStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState(""); const [staffEmail, setStaffEmail] = useState(""); const [staffPassword, setStaffPassword] = useState("");
  const allPermissions = ["bookings.read","bookings.update","services.read","services.manage","customers.read","reports.read"];
  const permissionLabels: Record<string,string> = {"bookings.read":"عرض الحجوزات","bookings.update":"تحديث الحجوزات","services.read":"عرض الخدمات","services.manage":"إدارة الخدمات والأسعار","customers.read":"عرض بيانات العملاء","reports.read":"عرض التقارير"};
  const [staffPermissions, setStaffPermissions] = useState<string[]>(["bookings.read","bookings.update","services.read"]);
  const [busy, setBusy] = useState(false); const [catalog, setCatalog] = useState<any[]>([]); const [tab,setTab]=useState<"home"|"bookings"|"inquiries"|"account">("home"); const [detail,setDetail]=useState<Service|null>(null);
  const [catalogLoading,setCatalogLoading]=useState(false); const [catalogError,setCatalogError]=useState("");
  const [bookingsLoading,setBookingsLoading]=useState(false); const [bookingsError,setBookingsError]=useState("");
  const { width: windowWidth } = useWindowDimensions();
  const heroWidth = Math.max(260,windowWidth-36);

  useEffect(() => {
    const timer = setTimeout(() => setSplashVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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
    if (!session) { setCatalog([]); return; }
    refreshCatalog();
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
    if (!email.trim() || password.length < 8) { Alert.alert("تحقق من البيانات", "أدخل البريد وكلمة المرور (8 أحرف على الأقل)."); return; }
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
    } catch (e:any) { Alert.alert("تعذر إكمال العملية", msg(e)); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (session) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (entry) { setEntry(null); setAuthMode("login"); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [session, entry]);

  useEffect(() => {
    if (!session) return;
    const onHardwareBack = () => {
      if (bookingOpen) { setBookingOpen(false); return true; }
      if (serviceOpen) { setServiceOpen(false); return true; }
      if (staffOpen) { setStaffOpen(false); return true; }
      if (!isStaff && detail) { setDetail(null); return true; }
      if (!isStaff && tab !== "home") { setTab("home"); setDetail(null); return true; }
      Alert.alert("تسنيم للسياحة والسفريات", "أنت في الصفحة الرئيسية. استخدم زر تسجيل الخروج إذا أردت الخروج من حسابك.", [{ text: "حسنًا", style: "cancel" }]);
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
    return () => subscription.remove();
  }, [session, bookingOpen, serviceOpen, staffOpen, isStaff, detail, tab]);

  async function signOut() {
    setBusy(true);
    const {error}=await supabase.auth.signOut();
    setBusy(false);
    if(error){Alert.alert("تعذر تسجيل الخروج",msg(error));return;}
    setEntry(null); setBookingOpen(false); setStaffOpen(false); setBookings([]); setCatalog([]); setTab("home"); setDetail(null);
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
    if (error) Alert.alert("تعذر تحديث الحجز",msg(error)); else loadBookings();
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
  async function createTravelService() {
    if (!serviceTitle.trim()) { Alert.alert("بيانات الخدمة", "اكتب اسم الخدمة أو البرنامج."); return; }
    const price = servicePrice.trim() ? Number(servicePrice) : null;
    if (price !== null && (!Number.isFinite(price) || price < 0)) { Alert.alert("السعر غير صحيح", "أدخل سعراً صحيحاً أو اتركه فارغاً."); return; }
    const validDate = (value:string) => !value.trim() || /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
    if (!validDate(serviceStartDate) || !validDate(serviceEndDate)) { Alert.alert("صيغة التاريخ", "اكتب التاريخ بصيغة YYYY-MM-DD أو اتركه فارغاً."); return; }
    if (serviceStartDate && serviceEndDate && serviceEndDate < serviceStartDate) { Alert.alert("التواريخ غير صحيحة", "تاريخ النهاية يجب أن يكون بعد تاريخ البداية."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("travel_services").insert({
        category: serviceCategory, title: serviceTitle.trim(), description: serviceDescription.trim(),
        destination: serviceDestination.trim() || null, starts_at: serviceStartDate.trim() || null, ends_at: serviceEndDate.trim() || null,
        price, currency: "YER", is_active: true, created_by: session?.user.id
      });
      if (error) throw error;
      Alert.alert("تمت إضافة العرض", "تم حفظ العرض وأصبح ظاهراً للعملاء.");
      setServiceTitle(""); setServiceDescription(""); setServiceDestination(""); setServiceStartDate(""); setServiceEndDate(""); setServicePrice(""); setServiceOpen(false);
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

  if (splashVisible) return <SafeAreaView style={[s.safe,s.splash]}><StatusBar barStyle="light-content" backgroundColor={C.navy}/><BrandEmblem size={132}/><Text style={s.splashArabic}>تسنيم</Text><View style={s.splashDivider}/><Text style={s.splashEnglish}>TASNIM TRAVEL</Text><Text style={s.splashTagline}>رحلتك تبدأ من هنا</Text></SafeAreaView>;
  if (loading) return <SafeAreaView style={[s.safe,s.center]}><ActivityIndicator size="large" color={C.blue}/><Text style={s.muted}>جارٍ الاتصال بالخادم...</Text></SafeAreaView>;

  if (!session) return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.sky}/><ScrollView contentContainerStyle={s.welcome} keyboardShouldPersistTaps="handled">
    <BrandEmblem size={112}/><Text style={s.brand}>TASNIM TRAVEL</Text><Text style={s.brandAr}>تسنيم للسياحة والسفريات</Text><Text style={s.tagline}>رحلتك تبدأ من هنا</Text>
    {!entry ? <View style={s.panel}><Text style={s.heading}>مرحباً بك</Text><Text style={s.muted}>اختر نوع الدخول للمتابعة</Text>
      <Pressable style={s.choice} onPress={()=>{setEntry("customer");setAuthMode("login");}}><Text style={s.choiceIcon}>👤</Text><View style={{flex:1}}><Text style={s.choiceTitle}>دخول العملاء</Text><Text style={s.muted}>للحجز ومتابعة طلبات السفر</Text></View><Text style={s.arrow}>‹</Text></Pressable>
      <Pressable style={s.choice} onPress={()=>{setEntry("staff");setAuthMode("login");}}><Text style={s.choiceIcon}>💼</Text><View style={{flex:1}}><Text style={s.choiceTitle}>دخول الموظفين</Text><Text style={s.muted}>لإدارة المكتب حسب الصلاحيات</Text></View><Text style={s.arrow}>‹</Text></Pressable>
      <Text style={s.note}>حسابات الموظفين ينشئها المدير فقط.</Text></View>
    : <View style={s.panel}><Text style={s.heading}>{entry==="customer"?"حساب العميل":"دخول الموظفين"}</Text>
      {authMode==="signup" && <><Field value={fullName} onChangeText={setFullName} placeholder="الاسم الكامل"/><Field value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad"/></>}
      <Field value={email} onChangeText={setEmail} placeholder="البريد الإلكتروني" keyboardType="email-address"/><Field value={password} onChangeText={setPassword} placeholder="كلمة المرور" secureTextEntry/>
      <Button title={authMode==="signup"?"إنشاء حساب عميل":"تسجيل الدخول"} onPress={authenticate} disabled={busy} loading={busy}/>
      {entry==="customer" && <Button secondary title={authMode==="login"?"إنشاء حساب جديد":"لدي حساب بالفعل"} onPress={()=>setAuthMode(authMode==="login"?"signup":"login")}/>}
      <Button secondary title="رجوع" onPress={()=>setEntry(null)}/><Text style={s.note}>تسجيل الدخول والحسابات مرتبطة الآن بقاعدة بيانات تسنيم.</Text>
    </View>}
  </ScrollView></SafeAreaView>;

  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.pale}/><ScrollView style={{flex:1}} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.top}><View style={s.brandHeader}><BrandEmblem size={46}/><View><Text style={s.brandSmall}>TASNIM TRAVEL</Text><Text style={s.muted}>أهلاً {session.user.user_metadata?.full_name || session.user.email}</Text></View></View><View style={s.avatar}><Text style={s.avatarLetter}>{(session.user.user_metadata?.full_name||"ت").slice(0,1)}</Text></View></View>
    {isStaff ? <>
      <View style={s.adminHero}><Text style={s.adminEyebrow}>TASNIM TRAVEL · CONTROL CENTER</Text><Text style={s.adminTitle}>{role==="owner"?"لوحة تحكم المالك":"لوحة إدارة المكتب"}</Text><Text style={s.adminSubtitle}>تابع الحجوزات وأدر برامج السفر والعروض من مكان واحد.</Text><View style={s.ownerBadge}><Text style={s.ownerBadgeText}>{role==="owner"?"المالك الرئيسي":"حساب موظف"}</Text></View></View>
      {canReadBookings && <View style={s.stats}><View style={s.stat}><Text style={s.statNum}>{bookings.length}</Text><Text style={s.statLabel}>الحجوزات المحمّلة</Text></View><View style={s.stat}><Text style={s.statNum}>{catalog.length}</Text><Text style={s.statLabel}>العروض النشطة</Text></View></View>}
      <View style={s.adminSection}><Text style={s.section}>الإدارة السريعة</Text><View style={s.adminActions}>
        {canReadBookings && <Pressable style={s.adminAction} onPress={loadBookings}><Text style={s.adminActionIcon}>▤</Text><Text style={s.adminActionTitle}>تحديث الحجوزات</Text><Text style={s.adminActionHint}>عرض أحدث الطلبات</Text></Pressable>}
        {canManageServices && <Pressable style={s.adminAction} onPress={()=>setServiceOpen(!serviceOpen)}><Text style={s.adminActionIcon}>✚</Text><Text style={s.adminActionTitle}>إضافة عرض</Text><Text style={s.adminActionHint}>رحلة أو برنامج جديد</Text></Pressable>}
        {role==="owner" && <Pressable style={s.adminAction} onPress={()=>setStaffOpen(!staffOpen)}><Text style={s.adminActionIcon}>♙</Text><Text style={s.adminActionTitle}>إدارة الموظفين</Text><Text style={s.adminActionHint}>إنشاء حساب موظف</Text></Pressable>}
      </View></View>
      <Button secondary title="تسجيل الخروج" onPress={signOut} loading={busy}/>
      {role==="owner" && <Button secondary title="إنشاء حساب موظف" onPress={()=>setStaffOpen(!staffOpen)}/>}
      {serviceOpen && <View style={s.panel}><Text style={s.section}>إضافة عرض جديد</Text><Text style={s.muted}>اختر نوع الخدمة</Text>
        {services.map(item=><Pressable key={item.category} onPress={()=>setServiceCategory(item.category)} style={s.permissionRow}><Text style={{color:serviceCategory===item.category?C.green:C.muted,fontWeight:"900"}}>{serviceCategory===item.category?"✓":"○"}</Text><Text style={s.choiceTitle}>{item.title}</Text></Pressable>)}
        <Field value={serviceTitle} onChangeText={setServiceTitle} placeholder="اسم البرنامج أو العرض"/>
        <Field value={serviceDestination} onChangeText={setServiceDestination} placeholder="الوجهة أو المدينة (اختياري)"/>
        <Field value={serviceDescription} onChangeText={setServiceDescription} placeholder="وصف العرض والتفاصيل" multiline/>
        <Field value={servicePrice} onChangeText={setServicePrice} placeholder="السعر بالريال اليمني (اختياري)" keyboardType="numeric"/>
        <Text style={s.formHint}>التواريخ اختيارية، واكتبها بصيغة YYYY-MM-DD</Text>
        <Field value={serviceStartDate} onChangeText={setServiceStartDate} placeholder="تاريخ البداية 2026-12-01"/>
        <Field value={serviceEndDate} onChangeText={setServiceEndDate} placeholder="تاريخ النهاية 2026-12-07"/>
        <Button title="حفظ ونشر العرض" onPress={createTravelService} disabled={busy} loading={busy}/>
      </View>}
      {staffOpen && <View style={s.panel}><Text style={s.section}>حساب موظف جديد</Text><Field value={staffName} onChangeText={setStaffName} placeholder="اسم الموظف"/><Field value={staffEmail} onChangeText={setStaffEmail} placeholder="بريد الموظف" keyboardType="email-address"/><Field value={staffPassword} onChangeText={setStaffPassword} placeholder="كلمة مرور مؤقتة (10 أحرف فأكثر)" secureTextEntry/>
        <Text style={s.muted}>حدد صلاحيات الموظف:</Text>
        {allPermissions.map(p=><Pressable key={p} onPress={()=>setStaffPermissions(old=>old.includes(p)?old.filter(x=>x!==p):[...old,p])} style={s.permissionRow}><Text style={{color:staffPermissions.includes(p)?C.green:C.muted,fontWeight:"900"}}>{staffPermissions.includes(p)?"✓":"○"}</Text><Text style={s.choiceTitle}>{permissionLabels[p]}</Text></Pressable>)}
        <Button title="إنشاء الحساب" onPress={createStaff} disabled={busy}/></View>}
      {canManageServices && <View style={s.adminSection}><Text style={s.section}>العروض المنشورة</Text>
        {catalogLoading?<ActivityIndicator color={C.blue}/>:catalogError?<View style={s.panel}><Text style={s.muted}>{catalogError}</Text><Button secondary title="إعادة المحاولة" onPress={refreshCatalog}/></View>:catalog.map(item=><View key={item.id} style={s.booking}><View style={s.offerTopLine}><Text style={s.offerCategory}>{categoryLabel(item.category)}</Text><Text style={s.offerPrice}>{formatPrice(item.price,item.currency)}</Text></View><Text style={s.choiceTitle}>{item.title}</Text>{item.destination?<Text style={s.muted}>الوجهة: {item.destination}</Text>:null}<Text style={s.muted}>{item.description||"لا يوجد وصف إضافي"}</Text><Button secondary title="إخفاء العرض" onPress={()=>archiveTravelService(item.id)}/></View>)}
        {!catalogLoading&&!catalogError&&!catalog.length?<Text style={s.note}>لم تنشر أي عروض حتى الآن. أضف أول عرض من الأعلى.</Text>:null}
      </View>}
      {canReadBookings ? <>
        <View style={s.adminSection}><Text style={s.section}>أحدث الحجوزات</Text>
        {bookingsLoading?<ActivityIndicator color={C.blue}/>:bookingsError?<View style={s.panel}><Text style={s.muted}>{bookingsError}</Text><Button secondary title="إعادة المحاولة" onPress={loadBookings}/></View>:bookings.map(b=><View key={b.id} style={s.booking}><Text style={s.choiceTitle}>{b.customer_name} · {b.customer_phone}</Text><Text style={s.muted}>الخدمة: {categoryLabel(b.service_category)} · الحالة: {statusLabel(b.status)}</Text><Text style={s.muted}>{b.details?.notes || "بدون ملاحظات"}</Text>{canUpdateBookings && <View style={s.statusActions}><Pressable accessibilityRole="button" onPress={()=>changeBookingStatus(b.id,"confirmed")}><Text style={s.statusText}>تأكيد</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>changeBookingStatus(b.id,"under_review")}><Text style={s.statusText}>قيد المراجعة</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>changeBookingStatus(b.id,"rejected")}><Text style={s.statusText}>رفض</Text></Pressable></View>}</View>)}
        {!bookingsLoading&&!bookingsError&&!bookings.length && <Text style={s.note}>لا توجد حجوزات حتى الآن.</Text>}
      </View></> : <Text style={s.note}>ليس لديك صلاحية عرض الحجوزات.</Text>}
    </> : <>
      {tab==="home" && !detail && <><ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={s.heroCarousel} contentContainerStyle={s.heroCarouselContent}>{heroSlides.map((slide,index)=><ImageBackground key={index} source={{uri:slide.image}} imageStyle={s.heroImage} style={[s.hero,{width:heroWidth}]}><View style={s.heroShade}/><Text style={s.heroEyebrow}>TASNIM TRAVEL · أهلاً بك</Text><Text style={s.heroTitle}>{slide.title}</Text><Text style={s.heroSub}>{slide.subtitle}</Text><View style={s.heroPill}><Text style={s.heroPillText}>اكتشف عروضنا</Text></View></ImageBackground>)}</ScrollView><View style={s.homeIntro}><Text style={s.homeIntroTitle}>إلى أين تحب أن تسافر؟</Text><Text style={s.homeIntroSub}>اختر الخدمة المناسبة، وشاهد البرامج المتاحة من تسنيم.</Text></View><Text style={s.section}>استكشف خدماتنا</Text><View style={s.grid}>{services.map(item=><Pressable key={item.category} style={s.service} onPress={()=>setDetail(item)}><Image source={{uri:item.image}} style={s.serviceImage} resizeMode="cover"/><Text style={s.choiceTitle}>{item.title}</Text><Text style={s.muted}>{item.subtitle}</Text><Text style={s.price}>عرض التفاصيل ←</Text></Pressable>)}</View></>}
      {tab==="home" && detail && <View style={s.detailPage}>
        <Button secondary title="رجوع للخدمات" onPress={()=>setDetail(null)}/>
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
      {tab==="inquiries" && <View style={s.panel}><Text style={s.heading}>استفساراتك</Text><Text style={s.muted}>للاستفسار عن الأسعار والمواعيد، اختر الخدمة وأرسل طلباً للمكتب وسيتواصل معك الفريق.</Text>{services.map(item=><Pressable key={item.category} style={s.choice} onPress={()=>{setSelected(item);setSelectedServiceId(null);setBookingOpen(true);}}><Text style={s.choiceTitle}>{item.title}</Text><Text style={s.arrow}>‹</Text></Pressable>)}</View>}
      {tab==="account" && <View style={s.panel}><Text style={s.heading}>حسابي</Text><Text style={s.choiceTitle}>{session.user.user_metadata?.full_name||"عميل تسنيم"}</Text><Text style={s.muted}>{session.user.email}</Text><Text style={s.muted}>رقم الهاتف: {session.user.user_metadata?.phone||"غير مضاف"}</Text><Button secondary title="تسجيل الخروج" onPress={signOut}/></View>}
      {tab==="home" && !detail && <View style={s.adminSection}><Text style={s.section}>أحدث عروض تسنيم</Text>{catalogLoading?<ActivityIndicator color={C.blue}/>:catalogError?<View style={s.panel}><Text style={s.muted}>تعذر تحميل العروض حالياً.</Text><Button secondary title="إعادة المحاولة" onPress={refreshCatalog}/></View>:catalog.slice(0,4).map(item=><Pressable key={item.id} style={s.offerCard} onPress={()=>{setSelected({image:(services.find(x=>x.category===item.category)|| (item.category==="hajj"?services.find(x=>x.category==="umrah"):undefined))?.image||services[2].image,title:item.title,category:item.category,subtitle:item.description});setSelectedServiceId(item.id);setBookingOpen(true);}}><Image source={{uri:(services.find(x=>x.category===item.category)||(item.category==="hajj"?services.find(x=>x.category==="umrah"):undefined))?.image||services[2].image}} style={s.offerImage}/><View style={s.offerContent}><Text style={s.offerCategory}>{categoryLabel(item.category)}</Text><Text style={s.offerTitle}>{item.title}</Text>{item.destination?<Text style={s.muted}>{item.destination}</Text>:null}<Text style={s.offerPrice}>{formatPrice(item.price,item.currency)}</Text><Text style={s.offerAction}>اطلب الحجز ←</Text></View></Pressable>)}{!catalogLoading&&!catalogError&&!catalog.length?<View style={s.emptyState}><Text style={s.emptyTitle}>العروض الجديدة قريباً</Text><Text style={s.muted}>نعمل على تجهيز برامج سفر مميزة. يمكنك إرسال استفسارك الآن.</Text></View>:null}</View>}
      {bookingOpen && <View style={s.panel}><Text style={s.heading}>طلب حجز · {selected.title}</Text><Text style={s.muted}>أدخل بيانات التواصل وسيصل طلبك إلى فريق تسنيم.</Text><Field value={fullName} onChangeText={setFullName} placeholder="الاسم الكامل"/><Field value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad"/><Field value={bookingNotes} onChangeText={setBookingNotes} placeholder="تفاصيل الرحلة أو الوجهة (اختياري)" multiline/><Button title="إرسال طلب الحجز" onPress={createBooking} disabled={busy} loading={busy}/><Button secondary title="إلغاء" onPress={()=>setBookingOpen(false)}/></View>}
      {tab==="home" && !detail && <View style={s.promo}><Text style={s.promoTitle}>رحلتك تبدأ بخطوة</Text><Text style={s.muted}>أرسل طلبك وسيقوم فريق تسنيم بمراجعته والتواصل معك بكل عناية.</Text></View>}
    </>}
    </ScrollView>{!isStaff && <View style={s.bottomNav}>{([{id:"home",label:"الرئيسية",icon:"⌂"},{id:"bookings",label:"حجوزاتي",icon:"▣"},{id:"inquiries",label:"استفساراتي",icon:"?"},{id:"account",label:"حسابي",icon:"♙"}] as const).map(item=><Pressable key={item.id} onPress={()=>{setTab(item.id);setDetail(null);if(item.id==="bookings")loadBookings();}} style={s.navItem}><Text style={[s.navIcon,tab===item.id&&s.navActive]}>{item.icon}</Text><Text style={[s.navLabel,tab===item.id&&s.navActive]}>{item.label}</Text></Pressable>)}</View>}
  </SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.pale},center:{alignItems:"center",justifyContent:"center",gap:12},
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
 input:{borderWidth:1,borderColor:C.border,borderRadius:14,padding:14,marginTop:12,textAlign:"right",color:C.text,backgroundColor:C.pale,minHeight:50},multilineInput:{minHeight:96},formHint:{color:C.muted,fontSize:11,textAlign:"right",marginTop:12},
 button:{backgroundColor:C.blue,borderRadius:13,padding:15,alignItems:"center",marginTop:13},secondary:{backgroundColor:C.sky,borderWidth:1,borderColor:"#CDE3F0"},buttonText:{color:C.white,fontWeight:"800",fontSize:14},
 note:{color:C.muted,fontSize:11,textAlign:"center",lineHeight:18,marginTop:14},
 adminHero:{backgroundColor:C.navy,padding:22,borderRadius:22,marginBottom:14,overflow:"hidden"},adminEyebrow:{color:"#A9D8F0",textAlign:"right",fontSize:10,fontWeight:"900",letterSpacing:1,marginBottom:10},ownerBadge:{alignSelf:"flex-end",backgroundColor:"#2C83B9",paddingHorizontal:13,paddingVertical:7,borderRadius:20,marginTop:14},ownerBadgeText:{color:C.white,fontSize:11,fontWeight:"900"},adminSection:{marginTop:8,marginBottom:8},adminActions:{flexDirection:"row-reverse",flexWrap:"wrap",gap:9},adminAction:{width:"31%",minHeight:116,backgroundColor:C.white,borderRadius:16,padding:10,borderWidth:1,borderColor:C.border,alignItems:"center",justifyContent:"center"},adminActionIcon:{fontSize:25,color:C.blue,marginBottom:7},adminActionTitle:{color:C.text,fontWeight:"900",fontSize:12,textAlign:"center"},adminActionHint:{color:C.muted,fontSize:9,textAlign:"center",marginTop:5}, page:{padding:18,paddingBottom:120},top:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",marginBottom:22},brandSmall:{color:C.navy,fontWeight:"900",letterSpacing:1,fontSize:16},avatar:{width:42,height:42,borderRadius:21,backgroundColor:C.white,alignItems:"center",justifyContent:"center"},
 heroCarousel:{height:212,marginBottom:22},heroCarouselContent:{gap:12},heroImage:{borderRadius:22,opacity:0.9},hero:{backgroundColor:C.navy,borderRadius:24,padding:22,minHeight:204,marginBottom:0,overflow:"hidden",justifyContent:"center"},heroEyebrow:{color:"#F0D99E",textAlign:"right",fontSize:10,fontWeight:"800"},heroTitle:{color:C.white,textAlign:"right",fontSize:25,fontWeight:"900",marginTop:12,maxWidth:"88%"},heroSub:{color:"#E3EDF3",textAlign:"right",marginTop:9,fontSize:13,lineHeight:21},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(10,39,60,0.54)",borderRadius:22},heroPill:{alignSelf:"flex-end",backgroundColor:"#D8B56D",paddingHorizontal:15,paddingVertical:8,borderRadius:18,marginTop:16},heroPillText:{color:C.navy,fontWeight:"900",fontSize:11},
 section:{color:C.text,textAlign:"right",fontWeight:"900",fontSize:19,marginTop:18,marginBottom:12},homeIntro:{paddingTop:2,paddingBottom:4},homeIntroTitle:{fontSize:21,fontWeight:"900",color:C.navy,textAlign:"right"},homeIntroSub:{fontSize:12,color:C.muted,textAlign:"right",marginTop:5,lineHeight:19},
 grid:{flexDirection:"row-reverse",flexWrap:"wrap",justifyContent:"space-between"},service:{width:"48%",backgroundColor:C.white,padding:15,borderRadius:17,marginBottom:11,borderWidth:1,borderColor:C.border},serviceSelected:{borderColor:C.blue,backgroundColor:C.sky},serviceImage:{width:"100%",height:104,borderRadius:12,marginBottom:10,backgroundColor:C.sky},
 detailPage:{backgroundColor:C.white,padding:16,borderRadius:20,borderWidth:1,borderColor:C.border,marginBottom:18},detailImage:{width:"100%",height:190,borderRadius:16,marginTop:14,marginBottom:16,backgroundColor:C.sky},
 promo:{backgroundColor:"#E8F1F4",padding:19,borderRadius:18,marginTop:18,borderWidth:1,borderColor:"#D7E5EA"},promoTitle:{fontSize:17,fontWeight:"900",color:C.navy,textAlign:"right",marginBottom:5},stats:{flexDirection:"row",gap:10,marginVertical:15},stat:{flex:1,backgroundColor:C.white,padding:16,borderRadius:17,alignItems:"center",borderWidth:1,borderColor:C.border},statNum:{color:C.blue,fontSize:26,fontWeight:"900",marginBottom:4},statLabel:{color:C.muted,fontSize:10,fontWeight:"700",textAlign:"center"},
 booking:{backgroundColor:C.white,padding:15,borderRadius:16,marginTop:9,borderWidth:1,borderColor:C.border},offerTopLine:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",marginBottom:7},offerCategory:{fontSize:10,color:C.blue,fontWeight:"900",textAlign:"right"},offerPrice:{fontSize:12,color:C.green,fontWeight:"900",textAlign:"right"},statusBadge:{fontSize:10,color:C.green,fontWeight:"900",backgroundColor:"#E7F5EF",paddingHorizontal:10,paddingVertical:5,borderRadius:12,overflow:"hidden"},offerCard:{backgroundColor:C.white,borderRadius:18,overflow:"hidden",borderWidth:1,borderColor:C.border,marginTop:10,flexDirection:"row-reverse",minHeight:118},offerImage:{width:112,height:118,backgroundColor:C.sky},offerContent:{flex:1,padding:13,justifyContent:"center",alignItems:"flex-end"},offerTitle:{fontSize:15,fontWeight:"900",color:C.text,textAlign:"right",marginTop:4},offerAction:{fontSize:11,color:C.blue,fontWeight:"900",marginTop:7},emptyState:{padding:20,backgroundColor:C.white,borderRadius:16,borderWidth:1,borderColor:C.border,marginTop:10},emptyTitle:{fontSize:15,color:C.navy,fontWeight:"900",textAlign:"right",marginBottom:5},permissionRow:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.border},statusActions:{flexDirection:"row-reverse",justifyContent:"space-around",marginTop:12},statusText:{color:C.blue,fontWeight:"800",fontSize:12},price:{color:C.green,textAlign:"right",fontWeight:"900",marginTop:5},bottomNav:{position:"absolute",bottom:0,left:0,right:0,backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.border,flexDirection:"row-reverse",justifyContent:"space-around",paddingTop:10,paddingBottom:12},navItem:{alignItems:"center",minWidth:65,paddingVertical:3},navIcon:{fontSize:21,color:C.muted,fontWeight:"900"},navLabel:{fontSize:10,color:C.muted,marginTop:3},navActive:{color:C.blue,fontWeight:"900"}
});