import React, { useState } from "react";
import {
  SafeAreaView, View, Text, Pressable, ScrollView, TextInput,
  StyleSheet, StatusBar, Alert
} from "react-native";

type Screen = "welcome" | "customer" | "staff" | "home" | "admin";
type Service = { icon: string; title: string; subtitle: string };

const services: Service[] = [
  { icon: "✈️", title: "الطيران", subtitle: "ابحث عن رحلتك" },
  { icon: "🕋", title: "الحج والعمرة", subtitle: "برامج إيمانية" },
  { icon: "🌍", title: "السياحة", subtitle: "اكتشف وجهات جديدة" },
  { icon: "🏨", title: "الفنادق", subtitle: "إقامة تناسبك" },
  { icon: "🛂", title: "التأشيرات", subtitle: "خدمات التأشيرات" },
  { icon: "🚘", title: "النقل", subtitle: "تنقل براحة" }
];

const C = {
  navy: "#173B57", blue: "#2C83B9", sky: "#EAF5FB",
  pale: "#F4F8FB", white: "#FFFFFF", text: "#183247",
  muted: "#718596", border: "#E1EAF0", green: "#23856D"
};

function PrimaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={s.primary}><Text style={s.primaryText}>{title}</Text></Pressable>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedService, setSelectedService] = useState("الطيران");

  const signInDemo = (kind: "customer" | "staff") => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("بيانات الدخول", "أدخل البريد الإلكتروني وكلمة المرور للمتابعة.");
      return;
    }
    // Demo-only navigation. Production authentication must be connected to Supabase.
    setScreen(kind === "staff" ? "admin" : "home");
  };

  if (screen === "welcome" || screen === "customer" || screen === "staff") {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.sky} />
        <ScrollView contentContainerStyle={s.welcome}>
          <View style={s.brandMark}><Text style={s.brandPlane}>✈</Text></View>
          <Text style={s.brand}>TASNIM TRAVEL</Text>
          <Text style={s.brandArabic}>تسنيم للسفريات والسياحة</Text>
          <Text style={s.tagline}>رحلتك تبدأ من هنا</Text>
          {screen === "welcome" ? (
            <View style={s.choiceWrap}>
              <Text style={s.heading}>مرحباً بك</Text>
              <Text style={s.muted}>اختر نوع الدخول للمتابعة</Text>
              <Pressable style={s.choice} onPress={() => setScreen("customer")}>
                <Text style={s.choiceIcon}>👤</Text>
                <View style={s.choiceCopy}><Text style={s.choiceTitle}>دخول العملاء</Text><Text style={s.muted}>للحجز ومتابعة طلبات السفر</Text></View>
                <Text style={s.chevron}>‹</Text>
              </Pressable>
              <Pressable style={s.choice} onPress={() => setScreen("staff")}>
                <Text style={s.choiceIcon}>💼</Text>
                <View style={s.choiceCopy}><Text style={s.choiceTitle}>دخول الموظفين</Text><Text style={s.muted}>لإدارة خدمات وحجوزات المكتب</Text></View>
                <Text style={s.chevron}>‹</Text>
              </Pressable>
              <Text style={s.securityNote}>حسابات الموظفين ينشئها المدير فقط بعد ربط نظام الصلاحيات.</Text>
            </View>
          ) : (
            <View style={s.form}>
              <Text style={s.heading}>{screen === "customer" ? "دخول العملاء" : "دخول الموظفين"}</Text>
              <Text style={s.muted}>أدخل بيانات حسابك</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="البريد الإلكتروني" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" style={s.input} />
              <TextInput value={password} onChangeText={setPassword} placeholder="كلمة المرور" placeholderTextColor={C.muted} secureTextEntry style={s.input} />
              <PrimaryButton title="تسجيل الدخول" onPress={() => signInDemo(screen)} />
              <Pressable onPress={() => setScreen("welcome")} style={s.back}><Text style={s.backText}>العودة لاختيار نوع الدخول</Text></Pressable>
              <Text style={s.securityNote}>هذه شاشة تجريبية؛ تسجيل الدخول الفعلي غير مفعّل قبل إعداد قاعدة البيانات.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "admin") {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.page}>
          <View style={s.topRow}><Text style={s.brandSmall}>TASNIM TRAVEL</Text><Text style={s.pill}>الإدارة</Text></View>
          <Text style={s.heading}>لوحة إدارة المكتب</Text>
          <Text style={s.muted}>نظرة عامة على عمليات تسنيم</Text>
          <View style={s.stats}>
            <View style={s.stat}><Text style={s.statNumber}>—</Text><Text style={s.muted}>طلبات جديدة</Text></View>
            <View style={s.stat}><Text style={s.statNumber}>—</Text><Text style={s.muted}>حجوزات مؤكدة</Text></View>
          </View>
          {["إدارة الحجوزات","إدارة الرحلات والأسعار","الحج والعمرة","إدارة الموظفين","العملاء","التقارير"].map((x, i) => (
            <Pressable key={x} style={s.adminRow} onPress={() => Alert.alert(x, "سيتم تفعيل هذه الوظيفة بعد ربط قاعدة البيانات.")}>
              <Text style={s.adminIcon}>{["📋","✈️","🕋","👥","👤","📊"][i]}</Text><Text style={s.adminText}>{x}</Text><Text style={s.chevron}>‹</Text>
            </Pressable>
          ))}
          <PrimaryButton title="تسجيل الخروج" onPress={() => setScreen("welcome")} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.topRow}><View><Text style={s.brandSmall}>TASNIM TRAVEL</Text><Text style={s.muted}>أهلاً بك في تسنيم</Text></View><View style={s.avatar}><Text>👤</Text></View></View>
        <View style={s.hero}>
          <Text style={s.heroEyebrow}>اكتشف العالم مع تسنيم</Text>
          <Text style={s.heroTitle}>رحلتك القادمة تبدأ بخطوة</Text>
          <Text style={s.heroSub}>خطط لرحلتك ودع تفاصيل السفر علينا</Text>
          <View style={s.heroDecor}><Text style={{fontSize: 48}}>✈️</Text></View>
        </View>
        <Text style={s.sectionTitle}>ماذا تخطط لرحلتك؟</Text>
        <View style={s.grid}>
          {services.map(item => (
            <Pressable key={item.title} style={s.service} onPress={() => { setSelectedService(item.title); Alert.alert(item.title, "سيتم فتح نموذج الطلب بعد استكمال ربط الخدمات."); }}>
              <Text style={s.serviceIcon}>{item.icon}</Text><Text style={s.serviceTitle}>{item.title}</Text><Text style={s.serviceSub}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.promo}><Text style={s.promoTitle}>نرتب رحلتك بكل عناية</Text><Text style={s.promoText}>تواصل مع فريق تسنيم لمساعدتك في اختيار البرنامج المناسب.</Text></View>
        <PrimaryButton title="طلب حجز جديد" onPress={() => Alert.alert("طلب حجز", "سيتم تفعيل نموذج الحجز عند ربط قاعدة البيانات.")} />
        <Pressable style={s.back} onPress={() => setScreen("welcome")}><Text style={s.backText}>تسجيل الخروج</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.pale },
  welcome: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: C.sky },
  page: { padding: 20, paddingBottom: 36 },
  brandMark: { alignSelf: "center", width: 76, height: 76, borderRadius: 25, backgroundColor: C.white, alignItems: "center", justifyContent: "center", marginBottom: 12, elevation: 2 },
  brandPlane: { fontSize: 38, color: C.blue },
  brand: { textAlign: "center", fontSize: 25, fontWeight: "800", letterSpacing: 2, color: C.navy },
  brandArabic: { textAlign: "center", fontSize: 18, fontWeight: "700", color: C.text, marginTop: 7 },
  tagline: { textAlign: "center", color: C.muted, marginTop: 7, marginBottom: 30 },
  choiceWrap: { backgroundColor: C.white, padding: 20, borderRadius: 24, marginTop: 18, elevation: 2 },
  heading: { fontSize: 23, fontWeight: "800", color: C.text, textAlign: "right", marginBottom: 6 },
  muted: { color: C.muted, textAlign: "right", fontSize: 13 },
  choice: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: C.pale, borderRadius: 17, padding: 16, marginTop: 15, borderWidth: 1, borderColor: C.border },
  choiceIcon: { fontSize: 28, marginLeft: 13 },
  choiceCopy: { flex: 1 },
  choiceTitle: { textAlign: "right", color: C.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  chevron: { color: C.blue, fontSize: 30, marginLeft: 6 },
  securityNote: { color: C.muted, fontSize: 11, textAlign: "center", lineHeight: 18, marginTop: 18 },
  form: { backgroundColor: C.white, padding: 22, borderRadius: 22, marginTop: 22 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 14, marginTop: 14, textAlign: "right", color: C.text, backgroundColor: C.pale },
  primary: { backgroundColor: C.blue, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 18 },
  primaryText: { color: C.white, fontWeight: "800", fontSize: 15 },
  back: { alignItems: "center", padding: 15 },
  backText: { color: C.blue, fontWeight: "600" },
  topRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  brandSmall: { color: C.navy, fontWeight: "900", letterSpacing: 1.2, fontSize: 16 },
  pill: { color: C.green, backgroundColor: "#E2F3ED", paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, overflow: "hidden" },
  stats: { flexDirection: "row", gap: 12, marginTop: 18, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: C.white, padding: 18, borderRadius: 16, alignItems: "center" },
  statNumber: { color: C.blue, fontSize: 26, fontWeight: "800", marginBottom: 5 },
  adminRow: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: C.white, padding: 17, borderRadius: 15, marginBottom: 10 },
  adminIcon: { fontSize: 22, marginLeft: 13 },
  adminText: { flex: 1, textAlign: "right", color: C.text, fontWeight: "700" },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: C.navy, borderRadius: 24, padding: 22, minHeight: 190, overflow: "hidden", marginBottom: 25 },
  heroEyebrow: { color: "#B9DDF1", textAlign: "right", fontSize: 13 },
  heroTitle: { color: C.white, textAlign: "right", fontSize: 24, fontWeight: "900", marginTop: 12, maxWidth: "82%" },
  heroSub: { color: "#D6E6F0", textAlign: "right", marginTop: 9, fontSize: 12 },
  heroDecor: { position: "absolute", left: 12, bottom: 10, opacity: 0.8 },
  sectionTitle: { color: C.text, textAlign: "right", fontWeight: "800", fontSize: 19, marginBottom: 14 },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between" },
  service: { width: "48%", backgroundColor: C.white, padding: 16, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  serviceIcon: { fontSize: 27, textAlign: "right" },
  serviceTitle: { color: C.text, textAlign: "right", fontWeight: "800", marginTop: 10 },
  serviceSub: { color: C.muted, textAlign: "right", fontSize: 11, marginTop: 4 },
  promo: { backgroundColor: "#E2F2F9", padding: 18, borderRadius: 18, marginTop: 8 },
  promoTitle: { color: C.navy, textAlign: "right", fontWeight: "800", fontSize: 16 },
  promoText: { color: C.muted, textAlign: "right", marginTop: 7, lineHeight: 20, fontSize: 12 }
});