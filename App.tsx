import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, Pressable, View, ActivityIndicator, Image, ImageBackground } from "react-native";
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
  { image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=700&auto=format&fit=crop", title: "العمرة", category: "umrah", subtitle: "برامج إيمانية" },
  { image: "https://images.unsplash.com/photo-1591604129939-f1s529b5fe9e?w=700&auto=format&fit=crop", title: "الحج", category: "hajj", subtitle: "برامج الحج" },
  { image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=700&auto=format&fit=crop", title: "السياحة", category: "tourism", subtitle: "اكتشف وجهات جديدة" },
  { image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&auto=format&fit=crop", title: "الفنادق", category: "hotel", subtitle: "إقامة تناسبك" },
  { image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=700&auto=format&fit=crop", title: "التأشيرات", category: "visa", subtitle: "خدمات التأشيرات" },
  { image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=700&auto=format&fit=crop", title: "النقل", category: "transport", subtitle: "تنقل براحة" }
];
const C = { navy:"#173B57", blue:"#2C83B9", sky:"#EAF5FB", pale:"#F4F8FB", white:"#FFFFFF", text:"#183247", muted:"#718596", border:"#E1EAF0", green:"#23856D" };

function Field({ value, onChangeText, placeholder, secureTextEntry, keyboardType }: any) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"} style={s.input} />;
}
function Button({ title, onPress, secondary=false, disabled=false }: any) {
  return <Pressable disabled={disabled} onPress={onPress} style={[s.button, secondary && s.secondary, disabled && {opacity:0.55}]}><Text style={[s.buttonText, secondary && {color:C.blue}]}>{title}</Text></Pressable>;
}
function msg(error: any) { return error?.message ?? "حدث خطأ غير متوقع. حاول مرة أخرى."; }

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login"|"signup">("login");
  const [entry, setEntry] = useState<"customer"|"staff"|null>(null);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(""); const [selected, setSelected] = useState<Service>(services[0]);
  const [bookingOpen, setBookingOpen] = useState(false); const [bookingNotes, setBookingNotes] = useState("");
  const [serviceOpen, setServiceOpen] = useState(false); const [serviceTitle, setServiceTitle] = useState(""); const [serviceDescription, setServiceDescription] = useState(""); const [servicePrice, setServicePrice] = useState(""); const [serviceCategory, setServiceCategory] = useState("flight");
  const [bookings, setBookings] = useState<any[]>([]); const [staffOpen, setStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState(""); const [staffEmail, setStaffEmail] = useState(""); const [staffPassword, setStaffPassword] = useState("");
  const allPermissions = ["bookings.read","bookings.update","services.read","services.manage","customers.read","reports.read"];
  const permissionLabels: Record<string,string> = {"bookings.read":"عرض الحجوزات","bookings.update":"تحديث الحجوزات","services.read":"عرض الخدمات","services.manage":"إدارة الخدمات والأسعار","customers.read":"عرض بيانات العملاء","reports.read":"عرض التقارير"};
  const [staffPermissions, setStaffPermissions] = useState<string[]>(["bookings.read","bookings.update","services.read"]);
  const [busy, setBusy] = useState(false); const [catalog, setCatalog] = useState<any[]>([]); const [tab,setTab]=useState<"home"|"bookings"|"inquiries"|"account">("home"); const [detail,setDetail]=useState<Service|null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setCatalog([]); return; }
    refreshCatalog();
  }, [session]);

  async function refreshCatalog() {
    const { data, error } = await supabase.from("travel_services")
      .select("id,category,title,description,price,currency")
      .eq("is_active", true).order("created_at", {ascending:false});
    if (error) Alert.alert("تعذر تحميل الخدمات", msg(error));
    else setCatalog(data ?? []);
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

  async function signOut() { await supabase.auth.signOut(); setEntry(null); setBookingOpen(false); setStaffOpen(false); setBookings([]); }
  async function createBooking() {
    if (!session) return;
    if (!fullName.trim() || !phone.trim()) { Alert.alert("بيانات الحجز", "أدخل الاسم ورقم الهاتف."); return; }
    setBusy(true);
    const { error } = await supabase.from("bookings").insert({
      customer_id: session.user.id, service_category: selected.category,
      customer_name: fullName.trim(), customer_phone: phone.trim(),
      details: { service_title: selected.title, notes: bookingNotes.trim() }, status: "pending"
    });
    setBusy(false);
    if (error) Alert.alert("تعذر إرسال الطلب", msg(error));
    else { Alert.alert("تم استلام طلبك", "وصل طلب الحجز إلى المكتب، وسنراجع الطلب ونتواصل معك."); setBookingOpen(false); setBookingNotes(""); if (tab === "bookings") loadBookings(); }
  }
  async function changeBookingStatus(id: string, status: string) {
    const { error } = await supabase.rpc("update_booking_status", { p_booking_id: id, p_status: status });
    if (error) Alert.alert("تعذر تحديث الحجز", msg(error)); else loadBookings();
  }
  async function loadBookings() {
    let query = supabase.from("bookings").select("id,customer_name,customer_phone,service_category,status,created_at,details").order("created_at", {ascending:false}).limit(50);
    if (role === "customer") query = query.eq("customer_id", session?.user.id);
    const { data, error } = await query;
    if (error) Alert.alert("تعذر تحميل الحجوزات", msg(error)); else setBookings(data ?? []);
  }
  async function createTravelService() {
    if (!serviceTitle.trim()) { Alert.alert("بيانات الخدمة", "اكتب اسم الخدمة أو البرنامج."); return; }
    const price = servicePrice.trim() ? Number(servicePrice) : null;
    if (price !== null && (!Number.isFinite(price) || price < 0)) { Alert.alert("السعر غير صحيح", "أدخل سعراً صحيحاً أو اتركه فارغاً."); return; }
    setBusy(true);
    const { error } = await supabase.from("travel_services").insert({
      category: serviceCategory, title: serviceTitle.trim(), description: serviceDescription.trim(),
      price, currency: "YER", is_active: true, created_by: session?.user.id
    });
    setBusy(false);
    if (error) Alert.alert("تعذر حفظ الخدمة", msg(error));
    else { Alert.alert("تمت إضافة الخدمة", "أصبحت الخدمة محفوظة في قاعدة البيانات."); setServiceTitle(""); setServiceDescription(""); setServicePrice(""); setServiceOpen(false); await refreshCatalog(); }
  }
  async function deleteTravelService(id:string) { Alert.alert("حذف البرنامج","هل تريد حذف هذا البرنامج؟",[{text:"إلغاء",style:"cancel"},{text:"حذف",style:"destructive",onPress:async()=>{const {error}=await supabase.from("travel_services").delete().eq("id",id);if(error)Alert.alert("تعذر الحذف",msg(error));else setCatalog(old=>old.filter(x=>x.id!==id));}}]); }

  async function createStaff() {
    if (!staffName.trim() || !staffEmail.trim() || staffPassword.length < 10) { Alert.alert("بيانات الموظف", "أدخل الاسم والبريد وكلمة مرور من 10 أحرف على الأقل."); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-staff", { body: {
      full_name: staffName.trim(), email: staffEmail.trim().toLowerCase(), password: staffPassword,
      permissions: staffPermissions
    }});
    setBusy(false);
    if (error || data?.error) Alert.alert("تعذر إنشاء الحساب", data?.error ?? msg(error));
    else { Alert.alert("تم إنشاء حساب الموظف", "تم إنشاء الحساب وتأكيد بريده. أرسل للموظف بيانات الدخول بشكل آمن."); setStaffName(""); setStaffEmail(""); setStaffPassword(""); setStaffPermissions(["bookings.read","bookings.update","services.read"]); setStaffOpen(false); }
  }

  if (loading) return <SafeAreaView style={[s.safe,s.center]}><ActivityIndicator size="large" color={C.blue}/><Text style={s.muted}>جارٍ الاتصال بالخادم...</Text></SafeAreaView>;

  if (!session) return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.sky}/><ScrollView contentContainerStyle={s.welcome}>
    <View style={s.logo}><Text style={{fontSize:38}}>✈</Text></View><Text style={s.brand}>TASNIM TRAVEL</Text><Text style={s.brandAr}>تسنيم للسفريات والسياحة</Text><Text style={s.tagline}>رحلتك تبدأ من هنا</Text>
    {!entry ? <View style={s.panel}><Text style={s.heading}>مرحباً بك</Text><Text style={s.muted}>اختر نوع الدخول للمتابعة</Text>
      <Pressable style={s.choice} onPress={()=>{setEntry("customer");setAuthMode("login");}}><Text style={s.choiceIcon}>👤</Text><View style={{flex:1}}><Text style={s.choiceTitle}>دخول العملاء</Text><Text style={s.muted}>للحجز ومتابعة طلبات السفر</Text></View><Text style={s.arrow}>‹</Text></Pressable>
      <Pressable style={s.choice} onPress={()=>{setEntry("staff");setAuthMode("login");}}><Text style={s.choiceIcon}>💼</Text><View style={{flex:1}}><Text style={s.choiceTitle}>دخول الموظفين</Text><Text style={s.muted}>لإدارة المكتب حسب الصلاحيات</Text></View><Text style={s.arrow}>‹</Text></Pressable>
      <Text style={s.note}>حسابات الموظفين ينشئها المدير فقط.</Text></View>
    : <View style={s.panel}><Text style={s.heading}>{entry==="customer"?"حساب العميل":"دخول الموظفين"}</Text>
      {authMode==="signup" && <><Field value={fullName} onChangeText={setFullName} placeholder="الاسم الكامل"/><Field value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad"/></>}
      <Field value={email} onChangeText={setEmail} placeholder="البريد الإلكتروني" keyboardType="email-address"/><Field value={password} onChangeText={setPassword} placeholder="كلمة المرور" secureTextEntry/>
      <Button title={busy?"يرجى الانتظار...":authMode==="signup"?"إنشاء حساب عميل":"تسجيل الدخول"} onPress={authenticate} disabled={busy}/>
      {entry==="customer" && <Button secondary title={authMode==="login"?"إنشاء حساب جديد":"لدي حساب بالفعل"} onPress={()=>setAuthMode(authMode==="login"?"signup":"login")}/>}
      <Button secondary title="رجوع" onPress={()=>setEntry(null)}/><Text style={s.note}>تسجيل الدخول والحسابات مرتبطة الآن بقاعدة بيانات تسنيم.</Text>
    </View>}
  </ScrollView></SafeAreaView>;

  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.pale}/><ScrollView style={{flex:1}} contentContainerStyle={s.page}>
    <View style={s.top}><View><Text style={s.brandSmall}>TASNIM TRAVEL</Text><Text style={s.muted}>أهلاً {session.user.user_metadata?.full_name || session.user.email}</Text></View><View style={s.avatar}><Text>👤</Text></View></View>
    {isStaff ? <>
      <Text style={s.heading}>لوحة إدارة المكتب</Text><Text style={s.muted}>صلاحية الحساب: {role==="owner"?"المدير الرئيسي":"موظف"}</Text>
      {canReadBookings && <View style={s.stats}><View style={s.stat}><Text style={s.statNum}>{bookings.length}</Text><Text style={s.muted}>طلبات محمّلة</Text></View><View style={s.stat}><Text style={s.statNum}>50</Text><Text style={s.muted}>حد العرض</Text></View></View>}
      {canReadBookings && <Button title="تحديث الحجوزات" onPress={loadBookings}/>}
      {role==="owner" && <Button secondary title="إنشاء حساب موظف" onPress={()=>setStaffOpen(!staffOpen)}/>}
      {canManageServices && <Button secondary title="إضافة خدمة أو برنامج" onPress={()=>setServiceOpen(!serviceOpen)}/>}
      {serviceOpen && <View style={s.panel}><Text style={s.section}>إضافة خدمة جديدة</Text><Text style={s.muted}>اختر القسم</Text>
        {services.map(item=><Pressable key={item.category} onPress={()=>setServiceCategory(item.category)} style={s.permissionRow}><Text style={{color:serviceCategory===item.category?C.green:C.muted,fontWeight:"900"}}>{serviceCategory===item.category?"✓":"○"}</Text><Text style={s.choiceTitle}>{item.title}</Text></Pressable>)}
        <Field value={serviceTitle} onChangeText={setServiceTitle} placeholder="اسم البرنامج أو الخدمة"/>
        <Field value={serviceDescription} onChangeText={setServiceDescription} placeholder="وصف مختصر"/>
        <Field value={servicePrice} onChangeText={setServicePrice} placeholder="السعر بالريال اليمني (اختياري)" keyboardType="numeric"/>
        <Button title="حفظ الخدمة" onPress={createTravelService} disabled={busy}/>
      </View>}
      {staffOpen && <View style={s.panel}><Text style={s.section}>حساب موظف جديد</Text><Field value={staffName} onChangeText={setStaffName} placeholder="اسم الموظف"/><Field value={staffEmail} onChangeText={setStaffEmail} placeholder="بريد الموظف" keyboardType="email-address"/><Field value={staffPassword} onChangeText={setStaffPassword} placeholder="كلمة مرور مؤقتة (10 أحرف فأكثر)" secureTextEntry/>
        <Text style={s.muted}>حدد صلاحيات الموظف:</Text>
        {allPermissions.map(p=><Pressable key={p} onPress={()=>setStaffPermissions(old=>old.includes(p)?old.filter(x=>x!==p):[...old,p])} style={s.permissionRow}><Text style={{color:staffPermissions.includes(p)?C.green:C.muted,fontWeight:"900"}}>{staffPermissions.includes(p)?"✓":"○"}</Text><Text style={s.choiceTitle}>{permissionLabels[p]}</Text></Pressable>)}
        <Button title="إنشاء الحساب" onPress={createStaff} disabled={busy}/></View>}
      {canReadBookings ? <>
        <Text style={s.section}>الحجوزات</Text>
        {bookings.map(b=><View key={b.id} style={s.booking}><Text style={s.choiceTitle}>{b.customer_name} · {b.customer_phone}</Text><Text style={s.muted}>الخدمة: {b.service_category} · الحالة: {b.status}</Text><Text style={s.muted}>{b.details?.notes || "بدون ملاحظات"}</Text>{canUpdateBookings && <View style={s.statusActions}><Pressable onPress={()=>changeBookingStatus(b.id,"confirmed")}><Text style={s.statusText}>تأكيد</Text></Pressable><Pressable onPress={()=>changeBookingStatus(b.id,"under_review")}><Text style={s.statusText}>قيد المراجعة</Text></Pressable><Pressable onPress={()=>changeBookingStatus(b.id,"rejected")}><Text style={s.statusText}>رفض</Text></Pressable></View>}</View>)}
        {!bookings.length && <Text style={s.note}>لا توجد حجوزات محمّلة. اضغط تحديث الحجوزات.</Text>}
      </> : <Text style={s.note}>ليس لديك صلاحية عرض الحجوزات.</Text>}
    </> : <>
      {tab==="home" && !detail && <><ImageBackground source={{uri:"https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&auto=format&fit=crop"}} imageStyle={{borderRadius:22,opacity:0.88}} style={s.hero}><View style={s.heroShade}/><Text style={s.heroEyebrow}>TASNIM TRAVEL · أهلاً بك</Text><Text style={s.heroTitle}>اكتشف رحلتك مع تسنيم</Text><Text style={s.heroSub}>وجهات وبرامج سفر نرتبها لك بكل عناية</Text></ImageBackground><Text style={s.section}>اختر خدمتك</Text><View style={s.grid}>{services.map(item=><Pressable key={item.category} style={s.service} onPress={()=>setDetail(item)}><Image source={{uri:item.image}} style={s.serviceImage} resizeMode="cover"/><Text style={s.choiceTitle}>{item.title}</Text><Text style={s.muted}>{item.subtitle}</Text><Text style={s.price}>عرض التفاصيل ←</Text></Pressable>)}</View></>}
      {tab==="home" && detail && <View style={s.detailPage}>
        <Button secondary title="رجوع للخدمات" onPress={()=>setDetail(null)}/>
        <Image source={{uri:detail.image}} style={s.detailImage} resizeMode="cover"/>
        <Text style={s.heading}>{detail.title}</Text>
        <Text style={s.muted}>{detail.subtitle} · البرامج والأسعار المعتمدة من مكتب تسنيم</Text>
        {catalog.filter(x=>x.category===detail.category).map(item=><View key={item.id} style={s.booking}>
          <Text style={s.choiceTitle}>{item.title}</Text>
          <Text style={s.muted}>{item.description||"لا توجد تفاصيل إضافية حالياً"}</Text>
          <Text style={s.price}>{item.price===null?"السعر عند الاستفسار":Number(item.price).toLocaleString()+" "+item.currency}</Text>
          <Button title="اطلب الحجز" onPress={()=>{setSelected({...detail,title:item.title});setBookingOpen(true);}}/>
        </View>)}
        {!catalog.some(x=>x.category===detail.category)&&<Text style={s.note}>لا توجد برامج مضافة حالياً. يمكنك الاستفسار من المكتب.</Text>}
      </View>}
      {tab==="bookings" && <View><Text style={s.heading}>حجوزاتي</Text><Button title="تحديث الحجوزات" onPress={loadBookings}/>{bookings.map(b=><View key={b.id} style={s.booking}><Text style={s.choiceTitle}>{b.details?.service_title||b.service_category}</Text><Text style={s.muted}>الحالة: {b.status} · {new Date(b.created_at).toLocaleDateString()}</Text></View>)}{!bookings.length&&<Text style={s.note}>اضغط تحديث الحجوزات لعرض طلباتك.</Text>}</View>}
      {tab==="inquiries" && <View style={s.panel}><Text style={s.heading}>استفساراتك</Text><Text style={s.muted}>للاستفسار عن الأسعار والمواعيد، اختر الخدمة وأرسل طلباً للمكتب وسيتواصل معك الفريق.</Text>{services.map(item=><Pressable key={item.category} style={s.choice} onPress={()=>{setSelected(item);setBookingOpen(true);}}><Text style={s.choiceTitle}>{item.title}</Text><Text style={s.arrow}>‹</Text></Pressable>)}</View>}
      {tab==="account" && <View style={s.panel}><Text style={s.heading}>حسابي</Text><Text style={s.choiceTitle}>{session.user.user_metadata?.full_name||"عميل تسنيم"}</Text><Text style={s.muted}>{session.user.email}</Text><Text style={s.muted}>رقم الهاتف: {session.user.user_metadata?.phone||"غير مضاف"}</Text><Button secondary title="تسجيل الخروج" onPress={signOut}/></View>}
      {catalog.length>0 && <><Text style={s.section}>برامج وعروض المكتب</Text>{catalog.map(item=><Pressable key={item.id} style={s.booking} onPress={()=>{setSelected({image:"https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=700&auto=format&fit=crop",title:item.title,category:item.category,subtitle:item.description});setBookingOpen(true);}}><Text style={s.choiceTitle}>{item.title}</Text><Text style={s.muted}>{item.description || "اضغط لإرسال طلب حجز"}</Text><Text style={s.price}>{item.price===null?"تواصل لمعرفة السعر":Number(item.price).toLocaleString()+" "+item.currency}</Text></Pressable>)}</>}
      {bookingOpen && <View style={s.panel}><Text style={s.heading}>طلب حجز · {selected.title}</Text><Field value={fullName} onChangeText={setFullName} placeholder="الاسم الكامل"/><Field value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad"/><Field value={bookingNotes} onChangeText={setBookingNotes} placeholder="تفاصيل الرحلة أو الوجهة (اختياري)"/><Button title={busy?"جارٍ الإرسال...":"إرسال طلب الحجز"} onPress={createBooking} disabled={busy}/><Button secondary title="إلغاء" onPress={()=>setBookingOpen(false)}/></View>}
      <View style={s.promo}><Text style={s.choiceTitle}>نرتب رحلتك بكل عناية</Text><Text style={s.muted}>أرسل طلبك وسيقوم فريق تسنيم بمراجعته والتواصل معك.</Text></View>
    </>}
    </ScrollView>{!isStaff && <View style={s.bottomNav}>{([{id:"home",label:"الرئيسية",icon:"⌂"},{id:"bookings",label:"حجوزاتي",icon:"▣"},{id:"inquiries",label:"استفساراتي",icon:"?"},{id:"account",label:"حسابي",icon:"♙"}] as const).map(item=><Pressable key={item.id} onPress={()=>{setTab(item.id);setDetail(null);if(item.id==="bookings")loadBookings();}} style={s.navItem}><Text style={[s.navIcon,tab===item.id&&s.navActive]}>{item.icon}</Text><Text style={[s.navLabel,tab===item.id&&s.navActive]}>{item.label}</Text></Pressable>)}</View>}
  </SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.pale},center:{alignItems:"center",justifyContent:"center",gap:12},
 welcome:{flexGrow:1,justifyContent:"center",padding:22,backgroundColor:C.sky},
 logo:{alignSelf:"center",width:74,height:74,borderRadius:24,backgroundColor:C.white,alignItems:"center",justifyContent:"center",marginBottom:12},
 brand:{textAlign:"center",fontSize:25,fontWeight:"900",letterSpacing:2,color:C.navy},brandAr:{textAlign:"center",fontSize:18,fontWeight:"800",color:C.text,marginTop:7},tagline:{textAlign:"center",color:C.muted,marginTop:7,marginBottom:25},
 panel:{backgroundColor:C.white,padding:19,borderRadius:22,marginTop:16,borderWidth:1,borderColor:C.border},
 heading:{fontSize:22,fontWeight:"900",color:C.text,textAlign:"right",marginBottom:7},muted:{color:C.muted,textAlign:"right",fontSize:12,lineHeight:19},
 choice:{flexDirection:"row-reverse",alignItems:"center",backgroundColor:C.pale,borderRadius:15,padding:15,marginTop:13,borderWidth:1,borderColor:C.border},choiceIcon:{fontSize:26,marginLeft:12},choiceTitle:{textAlign:"right",color:C.text,fontSize:15,fontWeight:"800",marginBottom:4},arrow:{color:C.blue,fontSize:28,marginLeft:5},
 input:{borderWidth:1,borderColor:C.border,borderRadius:12,padding:13,marginTop:12,textAlign:"right",color:C.text,backgroundColor:C.pale},
 button:{backgroundColor:C.blue,borderRadius:13,padding:15,alignItems:"center",marginTop:13},secondary:{backgroundColor:C.sky,borderWidth:1,borderColor:"#CDE3F0"},buttonText:{color:C.white,fontWeight:"800",fontSize:14},
 note:{color:C.muted,fontSize:11,textAlign:"center",lineHeight:18,marginTop:14},
 page:{padding:18,paddingBottom:120},top:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",marginBottom:22},brandSmall:{color:C.navy,fontWeight:"900",letterSpacing:1,fontSize:16},avatar:{width:42,height:42,borderRadius:21,backgroundColor:C.white,alignItems:"center",justifyContent:"center"},
 hero:{backgroundColor:C.navy,borderRadius:22,padding:21,minHeight:190,marginBottom:22,overflow:"hidden",justifyContent:"center"},heroEyebrow:{color:"#B9DDF1",textAlign:"right"},heroTitle:{color:C.white,textAlign:"right",fontSize:23,fontWeight:"900",marginTop:12,maxWidth:"85%"},heroSub:{color:"#D6E6F0",textAlign:"right",marginTop:9,fontSize:12},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(10,39,60,0.42)",borderRadius:22},
 section:{color:C.text,textAlign:"right",fontWeight:"900",fontSize:18,marginTop:13,marginBottom:12},
 grid:{flexDirection:"row-reverse",flexWrap:"wrap",justifyContent:"space-between"},service:{width:"48%",backgroundColor:C.white,padding:15,borderRadius:17,marginBottom:11,borderWidth:1,borderColor:C.border},serviceSelected:{borderColor:C.blue,backgroundColor:C.sky},serviceImage:{width:"100%",height:104,borderRadius:12,marginBottom:10,backgroundColor:C.sky},
 detailPage:{backgroundColor:C.white,padding:16,borderRadius:20,borderWidth:1,borderColor:C.border,marginBottom:18},detailImage:{width:"100%",height:190,borderRadius:16,marginTop:14,marginBottom:16,backgroundColor:C.sky},
 promo:{backgroundColor:"#E2F2F9",padding:17,borderRadius:17,marginTop:17},stats:{flexDirection:"row",gap:10,marginVertical:15},stat:{flex:1,backgroundColor:C.white,padding:15,borderRadius:15,alignItems:"center"},statNum:{color:C.blue,fontSize:24,fontWeight:"900",marginBottom:4},
 booking:{backgroundColor:C.white,padding:15,borderRadius:14,marginTop:9,borderWidth:1,borderColor:C.border},permissionRow:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.border},statusActions:{flexDirection:"row-reverse",justifyContent:"space-around",marginTop:12},statusText:{color:C.blue,fontWeight:"800",fontSize:12},price:{color:C.green,textAlign:"right",fontWeight:"900",marginTop:5},bottomNav:{position:"absolute",bottom:0,left:0,right:0,backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.border,flexDirection:"row-reverse",justifyContent:"space-around",paddingTop:10,paddingBottom:12},navItem:{alignItems:"center",minWidth:65},navIcon:{fontSize:21,color:C.muted,fontWeight:"900"},navLabel:{fontSize:10,color:C.muted,marginTop:3},navActive:{color:C.blue,fontWeight:"900"}
});