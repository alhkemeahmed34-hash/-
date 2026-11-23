import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, Pressable, View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, Session } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ecldmphkqxqicwirbbsy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tCZycVv4PUIle0Q_Cc9lHQ_RU95tWWn";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
});

type Role = "customer" | "staff" | "owner";
type Service = { icon: string; title: string; category: string; subtitle: string };
const services: Service[] = [
  { icon: "✈️", title: "الطيران", category: "flight", subtitle: "ابحث عن رحلتك" },
  { icon: "🕋", title: "الحج والعمرة", category: "umrah", subtitle: "برامج إيمانية" },
  { icon: "🌍", title: "السياحة", category: "tourism", subtitle: "اكتشف وجهات جديدة" },
  { icon: "🏨", title: "الفنادق", category: "hotel", subtitle: "إقامة تناسبك" },
  { icon: "🛂", title: "التأشيرات", category: "visa", subtitle: "خدمات التأشيرات" },
  { icon: "🚘", title: "النقل", category: "transport", subtitle: "تنقل براحة" }
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  const role = (session?.user.app_metadata?.role as Role | undefined) ?? "customer";
  const isStaff = role === "staff" || role === "owner";

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
    else { Alert.alert("تم استلام طلبك", "وصل طلب الحجز إلى المكتب، وسنراجع الطلب ونتواصل معك."); setBookingOpen(false); setBookingNotes(""); }
  }
  async function changeBookingStatus(id: string, status: string) {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) Alert.alert("تعذر تحديث الحجز", msg(error)); else loadBookings();
  }
  async function loadBookings() {
    const { data, error } = await supabase.from("bookings").select("id,customer_name,customer_phone,service_category,status,created_at,details").order("created_at", {ascending:false}).limit(50);
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
    else { Alert.alert("تمت إضافة الخدمة", "أصبحت الخدمة محفوظة في قاعدة البيانات."); setServiceTitle(""); setServiceDescription(""); setServicePrice(""); setServiceOpen(false); }
  }
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

  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.pale}/><ScrollView contentContainerStyle={s.page}>
    <View style={s.top}><View><Text style={s.brandSmall}>TASNIM TRAVEL</Text><Text style={s.muted}>أهلاً {session.user.user_metadata?.full_name || session.user.email}</Text></View><View style={s.avatar}><Text>👤</Text></View></View>
    {isStaff ? <>
      <Text style={s.heading}>لوحة إدارة المكتب</Text><Text style={s.muted}>صلاحية الحساب: {role==="owner"?"المدير الرئيسي":"موظف"}</Text>
      <View style={s.stats}><View style={s.stat}><Text style={s.statNum}>{bookings.length}</Text><Text style={s.muted}>طلبات محمّلة</Text></View><View style={s.stat}><Text style={s.statNum}>50</Text><Text style={s.muted}>حد العرض</Text></View></View>
      <Button title="تحديث الحجوزات" onPress={loadBookings}/>
      {role==="owner" && <Button secondary title="إنشاء حساب موظف" onPress={()=>setStaffOpen(!staffOpen)}/>}
      {staffOpen && <View style={s.panel}><Text style={s.section}>حساب موظف جديد</Text><Field value={staffName} onChangeText={setStaffName} placeholder="اسم الموظف"/><Field value={staffEmail} onChangeText={setStaffEmail} placeholder="بريد الموظف" keyboardType="email-address"/><Field value={staffPassword} onChangeText={setStaffPassword} placeholder="كلمة مرور مؤقتة (10 أحرف فأكثر)" secureTextEntry/>
        <Text style={s.muted}>حدد صلاحيات الموظف:</Text>
        {allPermissions.map(p=><Pressable key={p} onPress={()=>setStaffPermissions(old=>old.includes(p)?old.filter(x=>x!==p):[...old,p])} style={s.permissionRow}><Text style={{color:staffPermissions.includes(p)?C.green:C.muted,fontWeight:"900"}}>{staffPermissions.includes(p)?"✓":"○"}</Text><Text style={s.choiceTitle}>{permissionLabels[p]}</Text></Pressable>)}
        <Button title="إنشاء الحساب" onPress={createStaff} disabled={busy}/></View>}
      <Text style={s.section}>الحجوزات</Text>
      {bookings.map(b=><View key={b.id} style={s.booking}><Text style={s.choiceTitle}>{b.customer_name} · {b.customer_phone}</Text><Text style={s.muted}>الخدمة: {b.service_category} · الحالة: {b.status}</Text><Text style={s.muted}>{b.details?.notes || "بدون ملاحظات"}</Text>{(role==="owner" || (session.user.app_metadata?.permissions ?? []).includes("bookings.update")) && <View style={s.statusActions}><Pressable onPress={()=>changeBookingStatus(b.id,"confirmed")}><Text style={s.statusText}>تأكيد</Text></Pressable><Pressable onPress={()=>changeBookingStatus(b.id,"under_review")}><Text style={s.statusText}>قيد المراجعة</Text></Pressable><Pressable onPress={()=>changeBookingStatus(b.id,"rejected")}><Text style={s.statusText}>رفض</Text></Pressable></View>}</View>)}
      {!bookings.length && <Text style={s.note}>اضغط تحديث الحجوزات لعرض الطلبات. الوصول يخضع لسياسات قاعدة البيانات.</Text>}
    </> : <>
      <View style={s.hero}><Text style={s.heroEyebrow}>اكتشف العالم مع تسنيم</Text><Text style={s.heroTitle}>رحلتك القادمة تبدأ بخطوة</Text><Text style={s.heroSub}>خطط لرحلتك ودع تفاصيل السفر علينا</Text><Text style={s.plane}>✈️</Text></View>
      <Text style={s.section}>ماذا تخطط لرحلتك؟</Text><View style={s.grid}>{services.map(item=><Pressable key={item.category} style={[s.service,selected.category===item.category&&s.serviceSelected]} onPress={()=>{setSelected(item);setBookingOpen(true);}}><Text style={s.serviceIcon}>{item.icon}</Text><Text style={s.choiceTitle}>{item.title}</Text><Text style={s.muted}>{item.subtitle}</Text></Pressable>)}</View>
      {bookingOpen && <View style={s.panel}><Text style={s.heading}>طلب حجز · {selected.title}</Text><Field value={fullName} onChangeText={setFullName} placeholder="الاسم الكامل"/><Field value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad"/><Field value={bookingNotes} onChangeText={setBookingNotes} placeholder="تفاصيل الرحلة أو الوجهة (اختياري)"/><Button title={busy?"جارٍ الإرسال...":"إرسال طلب الحجز"} onPress={createBooking} disabled={busy}/><Button secondary title="إلغاء" onPress={()=>setBookingOpen(false)}/></View>}
      <Button secondary title="عرض حجوزاتي" onPress={loadBookings}/>{bookings.map(b=><View key={b.id} style={s.booking}><Text style={s.choiceTitle}>{b.service_category} · {b.status}</Text><Text style={s.muted}>{new Date(b.created_at).toLocaleDateString()}</Text></View>)}<View style={s.promo}><Text style={s.choiceTitle}>نرتب رحلتك بكل عناية</Text><Text style={s.muted}>أرسل طلبك وسيقوم فريق تسنيم بمراجعته والتواصل معك.</Text></View>
    </>}
    <Button secondary title="تسجيل الخروج" onPress={signOut}/>
  </ScrollView></SafeAreaView>;
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
 page:{padding:18,paddingBottom:35},top:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",marginBottom:22},brandSmall:{color:C.navy,fontWeight:"900",letterSpacing:1,fontSize:16},avatar:{width:42,height:42,borderRadius:21,backgroundColor:C.white,alignItems:"center",justifyContent:"center"},
 hero:{backgroundColor:C.navy,borderRadius:22,padding:21,minHeight:170,marginBottom:22,overflow:"hidden"},heroEyebrow:{color:"#B9DDF1",textAlign:"right"},heroTitle:{color:C.white,textAlign:"right",fontSize:23,fontWeight:"900",marginTop:12,maxWidth:"85%"},heroSub:{color:"#D6E6F0",textAlign:"right",marginTop:9,fontSize:12},plane:{position:"absolute",left:12,bottom:8,fontSize:43},
 section:{color:C.text,textAlign:"right",fontWeight:"900",fontSize:18,marginTop:13,marginBottom:12},
 grid:{flexDirection:"row-reverse",flexWrap:"wrap",justifyContent:"space-between"},service:{width:"48%",backgroundColor:C.white,padding:15,borderRadius:17,marginBottom:11,borderWidth:1,borderColor:C.border},serviceSelected:{borderColor:C.blue,backgroundColor:C.sky},serviceIcon:{fontSize:26,textAlign:"right",marginBottom:8},
 promo:{backgroundColor:"#E2F2F9",padding:17,borderRadius:17,marginTop:17},stats:{flexDirection:"row",gap:10,marginVertical:15},stat:{flex:1,backgroundColor:C.white,padding:15,borderRadius:15,alignItems:"center"},statNum:{color:C.blue,fontSize:24,fontWeight:"900",marginBottom:4},
 booking:{backgroundColor:C.white,padding:15,borderRadius:14,marginTop:9,borderWidth:1,borderColor:C.border},permissionRow:{flexDirection:"row-reverse",alignItems:"center",justifyContent:"space-between",paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.border},statusActions:{flexDirection:"row-reverse",justifyContent:"space-around",marginTop:12},statusText:{color:C.blue,fontWeight:"800",fontSize:12}
});