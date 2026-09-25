import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, ScrollView,
  Pressable, KeyboardAvoidingView, Platform,
  ActivityIndicator, SafeAreaView, StatusBar,
  Modal, Alert, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon, Line, Path, Rect, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Fonts, Radius, Motion } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { HaloBackground } from '@/components/HaloBackground';
import { LightRays, RadiantCore } from '@/components/RadiantLight';

// ── Mistral, via the mistral-proxy Edge Function ─────────────────
// The API key lives in Supabase secrets, never in the app bundle.
const CHAT_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mistral-proxy`;
const OPEN_FOOD_FACTS_URL = 'https://world.openfoodfacts.org/api/v0/product';

// ── Halea system prompt ────────────────────────────────────────
// Voice rules come from constants/voice.ts. Product recommendations are
// grounded in the products table — the model may only name products that
// were passed to it, so it can't invent a range we don't stock.

const VOICE = `You are Halea, the hair advisor inside the Halea app. You only discuss hair, scalp, and hair care. Redirect anything else briefly and without apology.

WHO YOU ARE
A stylist in her thirties with a trichology background, who has worked across every hair type and life stage. You are direct without being cold, warm without performing care, specific rather than universal. You use plain words. You are comfortable saying postpartum, alopecia, chemo, transitioning: without euphemism and without medicalising them.

HOW YOU SPEAK
- Address the reader as "you". Never queen, sis, girl, babe, or hun.
- No emojis. Anywhere. Not in lists, not as verdict markers.
- No exclamation marks except for genuine excitement, which is rare.
- Never use the "not this, but that" construction. It is the clearest tell of machine writing.
- No tips, secrets, or hacks framing. No unsourced statistics.
- Specific over universal: "a weekly clarifying wash", not "personalised hair care".
- Two or three short paragraphs unless a full routine is asked for.

EVEN-HANDEDNESS
No hair type is the default and none is the niche being accommodated. Never imply curlier is harder, straighter is easier, natural is better, relaxed is worse, long is the goal, or short is a phase. Never frame anything as before-and-after, which implies a deficit.

WHAT YOU KNOW
Hair types 1A–4C on the Andre Walker scale. Porosity: low cuticles lie flat so water beads and product sits on the surface. Lighter formulas, warmth to open the cuticle. High porosity absorbs and loses water quickly. Heavier sealing, protein in balance. Medium sits between the two.

Common concerns and what actually addresses them: dryness (layering order, deep conditioning frequency, checking porosity first), frizz (sealing after moisture, hands off while drying), breakage (protein and moisture balance, gentler detangling, protective styling), shrinkage in coilier patterns (banding or stretching: it is a sign of elasticity, not damage), buildup (clarifying wash).

Ingredients: sulfates cleanse hard and can strip drier textures. Non-water-soluble silicones build up without a clarifying wash. Hydrolysed proteins strengthen but stiffen if overused. Humectants like glycerin draw in moisture, which works against you in very dry or very humid air.

MEDICAL BOUNDARY
You do not diagnose. Sudden shedding, bald patches, scalp pain, or anything that seems medical goes to a GP, dermatologist, or trichologist. Say so plainly and without alarm.`;

// Only products that come back from the database may be named.
function buildSystemPrompt(hairType: string, products: any[]): string {
  let prompt = VOICE;

  if (hairType) {
    prompt += `\n\nTHIS PERSON\nHair type ${hairType}. Tailor everything to it. Do not give generic advice that would suit anyone.`;
  }

  if (products.length > 0) {
    const lines = products
      .map(p => `- ${p.brand} ${p.name} (${p.category}, ${p.price}, ${p.retailer}): ${p.why_it_works}`)
      .join('\n');
    prompt += `\n\nPRODUCTS YOU MAY RECOMMEND\nThese are real products stocked in the app for this hair type:\n${lines}\n\nRecommend only from this list. Name the brand and product exactly as written. Never invent a product, a brand, or a Halea-branded range: no such range exists. If nothing here fits what they asked, say so, then describe what to look for by category and ingredient so they can choose for themselves.`;
  } else {
    prompt += `\n\nPRODUCTS\nYou have no product list for this person. Do not name specific products or brands from memory. Formulations change and you will get it wrong. Describe what to look for by category and ingredient instead.`;
  }

  return prompt;
}

// ── Personalised chips by hair type ──────────────────────────────
const CHIPS_BY_TYPE: Record<string, { label: string }[]> = {
  '1A': [{ label: 'My hair goes flat by noon' }, { label: 'Best volumising products' }, { label: 'How to add texture' }, { label: 'Avoid greasy roots' }],
  '1B': [{ label: 'How to add volume' }, { label: 'Best lightweight products' }, { label: 'Keep style all day' }, { label: 'Reduce oiliness' }],
  '1C': [{ label: 'Tame coarse straight hair' }, { label: 'Frizz on humid days' }, { label: 'Best smoothing products' }, { label: 'Wash day for thick hair' }],
  '2A': [{ label: 'Enhance my waves' }, { label: 'Stop waves going frizzy' }, { label: 'Build my wave routine' }, { label: 'Best wave products' }],
  '2B': [{ label: 'Define my S-waves' }, { label: 'Frizz control for 2B' }, { label: 'Diffusing waves tips' }, { label: 'Products for 2B hair' }],
  '2C': [{ label: 'My waves become frizz' }, { label: '2C wash day routine' }, { label: 'Best gels for waves' }, { label: 'Scrunch technique' }],
  '3A': [{ label: 'Build my 3A routine' }, { label: 'Best products for 3A' }, { label: 'My curls lose definition' }, { label: 'Diffuse without frizz' }],
  '3B': [{ label: 'Define my ringlets' }, { label: '3B wash day tips' }, { label: 'Protein vs moisture for 3B' }, { label: 'Best leave-in for 3B' }],
  '3C': [{ label: 'My 3C curls are so dry' }, { label: 'LOC method for 3C' }, { label: 'Pre-poo for 3C hair' }, { label: '3C protective styles' }],
  '4A': [{ label: 'Moisture for 4A coils' }, { label: '4A wash day routine' }, { label: 'Define my 4A coils' }, { label: 'Shrinkage help' }],
  '4B': [{ label: 'My 4B hair is SO dry' }, { label: 'LOC method for 4B' }, { label: 'Detangling 4B tips' }, { label: 'Best oils for 4B' }],
  '4C': [{ label: 'Moisture that actually works' }, { label: 'Full 4C wash day' }, { label: 'Shrinkage and length' }, { label: 'Deep condition routine' }],
  default: [{ label: 'Build my wash day routine' }, { label: 'Products for my hair type' }, { label: 'My hair is really dry' }, { label: 'How do I find my porosity?' }, { label: 'Pre-poo tips' }, { label: 'Help with frizz' }],
};

function getSuggestions(hairType: string) {
  return CHIPS_BY_TYPE[hairType] || CHIPS_BY_TYPE.default;
}

// ── Types ─────────────────────────────────────────────────────────
type Message = { id: string; role: 'user' | 'assistant'; text: string; attachment?: { type: 'image' | 'document'; name: string } };
type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

// ── Icons ─────────────────────────────────────────────────────────
function IconSend() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="22" y1="2" x2="11" y2="13" /><Polygon points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
  );
}

function IconCamera({ color = Colors.violet }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <Circle cx="12" cy="13" r="4" />
    </Svg>
  );
}

function IconBarcode({ color = Colors.violet }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="4" width="3" height="16" rx="1" /><Rect x="7" y="4" width="2" height="16" rx="1" />
      <Rect x="11" y="4" width="3" height="16" rx="1" /><Rect x="16" y="4" width="2" height="16" rx="1" />
      <Rect x="20" y="4" width="2" height="16" rx="1" />
    </Svg>
  );
}

function IconDoc({ color = Colors.violet }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <Path d="M14 2v6h6" /><Line x1="8" y1="13" x2="16" y2="13" /><Line x1="8" y1="17" x2="16" y2="17" />
    </Svg>
  );
}

// ── Text renderers ────────────────────────────────────────────────
function InlineText({ text, style, boldStyle }: { text: string; style?: any; boldStyle?: any }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <Text key={i} style={[style, boldStyle || { fontFamily: Fonts.bodySemi, color: Colors.violet }]}>{part}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  );
}

function BubbleContent({ text, isUser }: { text: string; isUser: boolean }) {
  return (
    <View>
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 5 }} />;
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        if (isBullet) {
          return (
            <View key={i} style={st.bulletRow}>
              <Text style={[st.bullet, isUser && { color: 'rgba(255,255,255,0.6)' }]}>•</Text>
              <InlineText text={line.replace(/^[•\-]\s*/, '')} style={[st.bubbleText, isUser && st.bubbleTextUser]} boldStyle={isUser ? { fontFamily: Fonts.bodySemi, color: '#fff' } : undefined} />
            </View>
          );
        }
        return <InlineText key={i} text={line} style={[st.bubbleText, isUser && st.bubbleTextUser, i > 0 && { marginTop: 4 }]} boldStyle={isUser ? { fontFamily: Fonts.bodySemi, color: '#fff' } : undefined} />;
      })}
    </View>
  );
}

function TypingDots() {
  return (
    <View style={st.aiBlock}>
      <View style={st.aiHead}>
        <View style={st.aiAvatar}><Text style={st.aiAvatarMark}>T</Text></View>
        <Text style={st.aiName}>Halea</Text>
      </View>
      <View style={st.dotsWrap}>
        {[0, 1, 2].map(i => <View key={i} style={[st.dot, { opacity: 0.25 + i * 0.25 }]} />)}
      </View>
    </View>
  );
}

function MessageRow({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === 'user';
  const delay = index < 2 ? 0 : 40;

  // The user gets a bubble. The assistant gets full-width text, the way
  // ChatGPT and Claude render it. A 78%-wide bubble is a texting layout;
  // it fights long-form advice.
  if (isUser) {
    return (
      <Animated.View style={st.userRow}>
        <View style={st.userBubble}>
          {msg.attachment && (
            <Text style={st.attachName} numberOfLines={1}>{msg.attachment.name}</Text>
          )}
          <BubbleContent text={msg.text} isUser />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={st.aiBlock}>
      <View style={st.aiHead}>
        <View style={st.aiAvatar}><Text style={st.aiAvatarMark}>T</Text></View>
        <Text style={st.aiName}>Halea</Text>
      </View>
      {msg.attachment && (
        <Text style={st.attachNameAI} numberOfLines={1}>{msg.attachment.name}</Text>
      )}
      <BubbleContent text={msg.text} isUser={false} />
    </Animated.View>
  );
}

// ── Barcode Scanner Modal ─────────────────────────────────────────
function BarcodeScannerModal({ visible, onClose, onScanned }: { visible: boolean; onClose: () => void; onScanned: (barcode: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted) requestPermission();
    if (visible) setScanned(false);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={st.scanModal}>
        <View style={st.scanHeader}>
          <Text style={st.scanTitle}>Scan Product Barcode</Text>
          <Pressable onPress={onClose} style={st.scanClose}>
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </Pressable>
        </View>
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
            onBarcodeScanned={scanned ? undefined : ({ data }) => { setScanned(true); onScanned(data); onClose(); }}
          >
            <View style={st.scanOverlay}>
              <View style={st.scanFrame} />
              <Text style={st.scanHint}>Point at the barcode on your hair product</Text>
            </View>
          </CameraView>
        ) : (
          <View style={st.scanNoPerm}>
            <Text style={{ color: '#fff', fontSize: 15, textAlign: 'center', marginBottom: 20 }}>Camera permission needed</Text>
            <Pressable onPress={requestPermission} style={st.scanPermBtn}>
              <Text style={{ color: '#fff', fontFamily: Fonts.bodySemi, fontSize: 15 }}>Allow Camera</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Attach menu ───────────────────────────────────────────────────
function AttachMenu({ onIngredientScan, onBarcodeScan, onDocument }: { onIngredientScan: () => void; onBarcodeScan: () => void; onDocument: () => void }) {
  return (
    <Animated.View style={st.attachMenu}>
      {[
        { icon: <IconCamera />, label: 'Scan Ingredients', sub: 'Photo of product label', onPress: onIngredientScan },
        { icon: <IconBarcode />, label: 'Scan Barcode', sub: 'Look up product by barcode', onPress: onBarcodeScan },
        { icon: <IconDoc />, label: 'Upload Document', sub: 'PDF or text file (max 5MB)', onPress: onDocument },
      ].map((item, i) => (
        <View key={item.label}>
          {i > 0 && <View style={st.attachDivider} />}
          <Pressable style={st.attachItem} onPress={item.onPress}>
            <View style={st.attachIconWrap}>{item.icon}</View>
            <View>
              <Text style={st.attachLabel}>{item.label}</Text>
              <Text style={st.attachSub}>{item.sub}</Text>
            </View>
          </Pressable>
        </View>
      ))}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hairType, setHairType] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const listRef = useRef<FlatList>(null);

  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('halea_quiz').then(async raw => {
      if (!raw) return;
      const ht = JSON.parse(raw).hairType || '';
      setHairType(ht);
      if (!ht) return;

      // Ground recommendations in the products table rather than the
      // model's memory, which invents brands and stale formulations.
      const { data } = await supabase
        .from('products')
        .select('brand, name, category, price, retailer, why_it_works')
        .contains('hair_types', [ht.charAt(0)])
        .limit(12);
      if (data) setProducts(data);
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ── Core send ───────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string, attachment?: { type: 'image' | 'document'; name: string }) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    setError(null);
    setShowSuggestions(false);
    setShowAttachMenu(false);
    setInput('');

    setMessages(prev => [...prev, { id: `u_${Date.now()}`, role: 'user', text: trimmed, attachment }]);
    setLoading(true);
    scrollToBottom();

    const contextualMsg = hairType ? `[My hair type is ${hairType}] ${trimmed}` : trimmed;
    const newHistory: ChatMessage[] = [...history, { role: 'user', content: contextualMsg }];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to chat.');

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          system: buildSystemPrompt(hairType, products),
          messages: newHistory.slice(-10),
        }),
      });

      if (response.status === 429) throw new Error('Give me a few seconds, then ask again.');
      if (!response.ok) throw new Error('I had trouble with that one. Try again?');

      const data = await response.json();
      const replyText = data?.reply;
      if (!replyText) throw new Error('I had trouble with that one. Try again?');

      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: replyText }]);
      setHistory([...newHistory, { role: 'assistant', content: replyText }]);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Try again!');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, history, hairType, products, scrollToBottom]);

  // ── Ingredient scan ─────────────────────────────────────────────
  const handleIngredientScan = useCallback(async () => {
    Alert.alert(
      'Scan Ingredients',
      'How would you like to capture the ingredient label?',
      [
        {
          text: 'Take a photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.8,
            });
            if (result.canceled) return;
            setShowAttachMenu(false);
            sendMessage(
              "I've taken a photo of a hair product ingredient list. Please analyse these ingredients for my hair type. Tell me what's good, what to watch out for, and whether this product is suitable for me.",
              { type: 'image', name: 'Ingredient Photo' }
            );
          },
        },
        {
          text: 'Choose from gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
            if (result.canceled) return;
            setShowAttachMenu(false);
            sendMessage(
              "I've uploaded a photo of a hair product ingredient list. Please analyse these ingredients for my hair type. Tell me what's good, what to watch out for, and whether this product is suitable for me.",
              { type: 'image', name: 'Ingredient Label' }
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [sendMessage]);

  // ── Barcode scan ────────────────────────────────────────────────
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    setLoading(true);
    setShowSuggestions(false);
    try {
      const response = await fetch(`${OPEN_FOOD_FACTS_URL}/${barcode}.json`);
      const data = await response.json();
      if (data.status === 0) {
        sendMessage(`I scanned barcode ${barcode} but couldn't find the product. What should I look for in a good hair product?`);
        return;
      }
      const p = data.product;
      const name = p.product_name || 'Unknown Product';
      const brand = p.brands || '';
      const ingredients = p.ingredients_text || p.ingredients_text_en || '';
      if (!ingredients) {
        sendMessage(`I scanned "${name}" by ${brand} but the ingredient list wasn't available. What should I look for in hair products?`);
        return;
      }
      sendMessage(
        `I just scanned **${name}** by ${brand}. Here are the ingredients:\n\n${ingredients}\n\nCan you analyse these for my hair type and tell me if this product is suitable?`,
        { type: 'image', name: `Scanned: ${name}` }
      );
    } catch {
      sendMessage(`I scanned a product barcode. What ingredients should I look for in a good hair product for my hair type?`);
    } finally {
      setLoading(false);
    }
  }, [sendMessage]);

  // ── Document upload ─────────────────────────────────────────────
  const handleDocumentUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/plain', 'application/pdf'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      if (file.size && file.size > 5 * 1024 * 1024) { Alert.alert('File too large', 'Please upload a file smaller than 5MB.'); return; }
      const res = await fetch(file.uri);
      const text = await res.text();
      const truncated = text.slice(0, 3000);
      setShowAttachMenu(false);
      sendMessage(
        `I've uploaded a document called "${file.name}". Here's the content:\n\n${truncated}\n\nCan you give me hair care advice based on this?`,
        { type: 'document', name: file.name }
      );
    } catch { Alert.alert('Error', 'Could not read the file. Please try a .txt file.'); }
  }, [sendMessage]);

  const suggestions = getSuggestions(hairType);
  const isEmpty = showSuggestions && messages.length === 0;

  // Keep the input above the floating nav bar — but when the keyboard is up,
  // the nav bar hides, so the input can drop down to sit on the keyboard.
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const listData = [
    ...messages,
    ...(loading ? [{ id: '__typing__', role: 'typing' as any, text: '' }] : []),
    ...(error ? [{ id: '__error__', role: 'error' as any, text: error }] : []),
  ];

  return (
    <View style={st.root}>
      <HaloBackground />
      {isEmpty ? <LightRays /> : null}

      <SafeAreaView style={st.safe}>
        <StatusBar barStyle="light-content" />

        <View style={st.header}>
          <Text style={st.headerName}>Halea</Text>
          {hairType ? (
            <View style={st.profileChip}>
              <Text style={st.profileChipText}>Type {hairType}</Text>
            </View>
          ) : null}
        </View>

        <BarcodeScannerModal
          visible={showBarcodeScanner}
          onClose={() => setShowBarcodeScanner(false)}
          onScanned={handleBarcodeScanned}
        />

        <KeyboardAvoidingView style={st.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {isEmpty ? (
            <ScrollView style={st.flex} contentContainerStyle={st.welcomeWrap} keyboardShouldPersistTaps="handled">
              <RadiantCore size={170} />
              <Text style={st.welcomeHeadline}>Let's talk hair.</Text>
              <Text style={st.welcomeSub}>
                {hairType
                  ? 'I already know your hair. Start anywhere.'
                  : 'Ask about your routine, a product, or something new your hair is doing.'}
              </Text>
              <View style={st.chips}>
                {suggestions.map(s => (
                  <Pressable key={s.label} onPress={() => sendMessage(s.label)} style={({ pressed }) => [st.chip, pressed && { opacity: 0.65 }]}>
                    <Text style={st.chipText}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={st.footerNote}>Halea can be wrong. Check anything medical with a professional.</Text>
            </ScrollView>
          ) : (
            <Pressable style={st.flex} onPress={() => setShowAttachMenu(false)}>
              <FlatList
                ref={listRef}
                data={listData}
                keyExtractor={item => item.id}
                contentContainerStyle={st.list}
                showsVerticalScrollIndicator={true}
                scrollIndicatorInsets={{ right: 1 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onContentSizeChange={scrollToBottom}
                renderItem={({ item, index }) => {
                  if (item.role === 'typing') return <TypingDots />;
                  if (item.role === 'error') return (
                    <Animated.View style={st.errorBox}>
                      <Text style={st.errorText}>{item.text}</Text>
                    </Animated.View>
                  );
                  return <MessageRow msg={item as Message} index={index} />;
                }}
              />
            </Pressable>
          )}

          {showAttachMenu && (
            <AttachMenu
              onIngredientScan={handleIngredientScan}
              onBarcodeScan={() => { setShowAttachMenu(false); setShowBarcodeScanner(true); }}
              onDocument={handleDocumentUpload}
            />
          )}

          <View style={[st.inputWrap, { paddingBottom: keyboardUp ? 10 : 86 }]}>
            <View style={[st.inputRow, input.length > 0 && st.inputRowFocused]}>
              <Pressable onPress={() => setShowAttachMenu(prev => !prev)} style={st.plusBtn}>
                <View style={[st.plusBtnInner, showAttachMenu && st.plusBtnInnerOn]}>
                  <Text style={[st.plusIcon, showAttachMenu && { color: '#FFFFFF' }]}>+</Text>
                </View>
              </Pressable>
              <TextInput
                style={st.input}
                value={input}
                onChangeText={setInput}
                placeholder="What are you noticing?"
                placeholderTextColor={Colors.muted}
                multiline
                maxLength={500}
                editable={!loading}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => sendMessage()}
                onFocus={() => setShowAttachMenu(false)}
              />
              <Pressable onPress={() => sendMessage()} disabled={loading || !input.trim()} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
                <View style={[st.sendBtn, { backgroundColor: (input.trim() && !loading) ? Colors.violet : 'rgba(255,255,255,0.10)' }]}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <IconSend />}
                </View>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.porcelain },
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 8 : 16, paddingBottom: 8 },
  headerName: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.ink, letterSpacing: -0.5 },
  profileChip: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  profileChipText: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: 'rgba(255,254,247,0.75)' },

  // Empty state: radiant core, headline, glass chips
  welcomeWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 0, paddingBottom: 16 },
  welcomeHeadline: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.ink, letterSpacing: -0.5, marginTop: 8, textAlign: 'center' },
  welcomeSub: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,254,247,0.6)', textAlign: 'center', marginTop: 8, lineHeight: 21 },

  list: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, gap: 24 },
  // Assistant: full-width text under a small attributed header.
  aiBlock: { paddingRight: 8, gap: 8 },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.violetBg2 },
  aiAvatarMark: { fontFamily: Fonts.heading, fontSize: 11, color: Colors.violet },
  aiName: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted, letterSpacing: 0.2 },

  // User: right-aligned bubble, capped so it reads as an aside.
  userRow: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '82%', backgroundColor: Colors.violet,
    paddingVertical: 11, paddingHorizontal: 16,
    borderRadius: 20, borderBottomRightRadius: 6,
  },
  attachName: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  attachNameAI: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.muted },
  bubbleText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.ink, lineHeight: 24 },
  bubbleTextUser: { color: '#FFFFFF' },


  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  bullet: { fontFamily: Fonts.bodySemi, color: Colors.violet, fontSize: 14, lineHeight: 21 },
  dotsWrap: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.violet },

  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 24 },
  chip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.07)' },
  chipText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.ink },

  errorBox: { backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.12)', borderRadius: Radius.md, padding: 12 },
  errorText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.error },

  attachMenu: { marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  attachItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  attachIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.violetBg2, alignItems: 'center', justifyContent: 'center' },
  attachLabel: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink },
  attachSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  attachDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 70 },

  inputWrap: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: 'transparent' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 26, paddingLeft: 6, paddingRight: 6, paddingVertical: 6 },
  inputRowFocused: { borderColor: 'rgba(195,140,217,0.6)' },
  plusBtn: { flexShrink: 0 },
  plusBtnInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.violetBg2 },
  plusBtnInnerOn: { backgroundColor: Colors.violet },
  plusIcon: { fontFamily: Fonts.body, fontSize: 22, color: Colors.violet, lineHeight: 26 },
  input: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, maxHeight: 100, paddingVertical: 6, paddingHorizontal: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  footerNote: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, textAlign: 'center', marginTop: 28, opacity: 0.6 },

  scanModal: { flex: 1, backgroundColor: '#000' },
  scanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 40, paddingBottom: 16, backgroundColor: '#14100D' },
  scanTitle: { fontFamily: Fonts.heading, fontSize: 18, color: '#fff' },
  scanClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 260, height: 160, borderRadius: 16, borderWidth: 3, borderColor: Colors.violet },
  scanHint: { fontFamily: Fonts.body, fontSize: 13, color: '#fff', marginTop: 20, textAlign: 'center', paddingHorizontal: 40, opacity: 0.8 },
  scanNoPerm: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  scanPermBtn: { backgroundColor: Colors.violet, paddingVertical: 14, paddingHorizontal: 32, borderRadius: Radius.lg },
});