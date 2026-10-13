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
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Fonts, Radius, Motion } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { HaloBackground } from '@/components/HaloBackground';
import { LightRays, RadiantCore } from '@/components/RadiantLight';

// ── Mistral, via the mistral-proxy Edge Function ─────────────────
// The API key lives in Supabase secrets, never in the app bundle.
const CHAT_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mistral-proxy`;
// Product and ingredient facts: the ingredient-lookup Edge Function (Open Beauty
// Facts for barcodes, Halea's notes and EU CosIng for ingredients). No AI.
const INGREDIENTS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ingredient-lookup`;

// Turns the ingredient-lookup result into one Halea message. Every sentence
// comes from the lookup, so nothing is made up.
function formatLookup(data: any): string {
  const p = data?.product;
  const lines: string[] = [p?.name ? `**${p.name}**${p.brand ? ` by ${p.brand}` : ''}` : '**Your ingredient list**', ''];
  for (const note of data?.notes ?? []) lines.push(`• ${note}`);
  if (data?.notes?.length) lines.push('');
  lines.push('**The main ingredients**');
  for (const i of (data?.ingredients ?? []).slice(0, 5)) {
    const what = i.what_it_does
      ?? (i.cosing_functions ? `Official function: ${String(i.cosing_functions).toLowerCase()}.` : "I don't have a note on this one yet.");
    const fit = i.fit === 'caution' ? ' One to watch for your hair.' : '';
    lines.push(`• **${i.label}**: ${what}${fit}`);
  }
  lines.push('');
  lines.push(`I can explain ${data?.explained ?? 0} of the ${data?.total ?? 0} ingredients. Ask me about any of them.`);
  if (data?.attribution) lines.push(data.attribution);
  return lines.join('\n');
}

// The assistant's voice, rules and product list live in the mistral-proxy
// function on the server. The app only sends the conversation and hair type.



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

function IconBarcode({ color = Colors.violet }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="4" width="3" height="16" rx="1" /><Rect x="7" y="4" width="2" height="16" rx="1" />
      <Rect x="11" y="4" width="3" height="16" rx="1" /><Rect x="16" y="4" width="2" height="16" rx="1" />
      <Rect x="20" y="4" width="2" height="16" rx="1" />
    </Svg>
  );
}

function IconStyle({ color = Colors.violet }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2L2 7l10 5 10-5-10-5z" />
      <Path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
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
          <Text style={st.scanTitle}>Scan a product barcode</Text>
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
function AttachMenu({ onTryOn, onIngredientScan, onBarcodeScan, onDocument }: { onTryOn: () => void; onIngredientScan: () => void; onBarcodeScan: () => void; onDocument: () => void }) {
  return (
    <Animated.View style={st.attachMenu}>
      {[
        { icon: <IconStyle />, label: 'Try a Style On', sub: 'Your photo plus a look you like', onPress: onTryOn },
        { icon: <IconDoc />, label: 'Check ingredients', sub: 'Paste the list from the label', onPress: onIngredientScan },
        { icon: <IconBarcode />, label: 'Scan Barcode', sub: 'Look up product by barcode', onPress: onBarcodeScan },
        { icon: <IconDoc />, label: 'Upload a note', sub: 'Text file (max 5MB)', onPress: onDocument },
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
  const [porosity, setPorosity] = useState<'low' | 'high' | undefined>();
  // After "Check ingredients" or a barcode we don't know, the next message
  // that looks like a list goes to the ingredient lookup instead of the chat.
  const [awaitingIngredients, setAwaitingIngredients] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const listRef = useRef<FlatList>(null);
  const router = useRouter();
  const openTryOn = () => { setShowAttachMenu(false); router.push('/hairtransfer'); };

  useEffect(() => {
    AsyncStorage.getItem('halea_quiz').then(raw => {
      if (!raw) return;
      const quiz = JSON.parse(raw);
      setHairType(quiz.hairType || '');
      if (quiz.porosity === 'low' || quiz.porosity === 'high') setPorosity(quiz.porosity);
    }).catch(() => {});
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ── Ingredients: barcode or pasted list ────────────────────────
  const addHaleaMessage = useCallback((text: string, remember = true) => {
    setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text }]);
    if (remember) setHistory(prev => [...prev, { role: 'assistant', content: text }]);
    scrollToBottom();
  }, [scrollToBottom]);

  const lookUpIngredients = useCallback(async (body: { barcode?: string; ingredients_text?: string }, label: string) => {
    setError(null);
    setShowSuggestions(false);
    setShowAttachMenu(false);
    setMessages(prev => [...prev, { id: `u_${Date.now()}`, role: 'user', text: label }]);
    setLoading(true);
    scrollToBottom();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in first.');
      const res = await fetch(INGREDIENTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...body, porosity }),
      });
      const data = await res.json().catch(() => null);
      if (data?.not_found || data?.missing_ingredients) {
        setAwaitingIngredients(true);
        addHaleaMessage(data.not_found
          ? "I don't know this product yet. Paste its ingredient list here and I'll go through it."
          : "I found the product but not its ingredient list. Paste the list here and I'll go through it.", false);
        return;
      }
      if (!res.ok || !data) throw new Error(data?.error || 'I had trouble with that one. Try again?');
      setHistory(prev => [...prev, { role: 'user', content: label.slice(0, 2000) }]);
      addHaleaMessage(formatLookup(data));
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [porosity, scrollToBottom, addHaleaMessage]);

  // ── Core send ───────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string, attachment?: { type: 'image' | 'document'; name: string }) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    if (awaitingIngredients) {
      setAwaitingIngredients(false);
      if ((trimmed.match(/,/g) || []).length >= 3) {
        setInput('');
        lookUpIngredients({ ingredients_text: trimmed }, trimmed);
        return;
      }
    }

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
          hairType,
          messages: newHistory.slice(-10),
        }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        // In test builds, show the real reason so problems can be fixed. Users see a friendly line.
        if (__DEV__ && response.status >= 500) {
          throw new Error(`Chat error ${response.status}: ${detail?.error || 'no details'}`);
        }
        throw new Error(detail?.error || 'I had trouble with that one. Try again?');
      }

      const data = await response.json();
      const replyText = data?.reply;
      if (!replyText) throw new Error('I had trouble with that one. Try again?');

      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', text: replyText }]);
      setHistory([...newHistory, { role: 'assistant', content: replyText }]);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, history, hairType, scrollToBottom, awaitingIngredients, lookUpIngredients]);

  const handleIngredientScan = useCallback(() => {
    setShowAttachMenu(false);
    setShowSuggestions(false);
    setAwaitingIngredients(true);
    addHaleaMessage("Paste or type the ingredient list from the back of the product, and I'll go through it.", false);
  }, [addHaleaMessage]);

  const handleBarcodeScanned = useCallback((barcode: string) => {
    lookUpIngredients({ barcode }, 'Scanned a product barcode');
  }, [lookUpIngredients]);

  // ── Document upload ─────────────────────────────────────────────
  const handleDocumentUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/plain'], copyToCacheDirectory: true });
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
              <Pressable
                onPress={openTryOn}
                style={({ pressed }) => [st.tryOn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Try a new style on your photo"
              >
                <IconStyle color="#E6BEF5" />
                <Text style={st.tryOnText}>See a new style on you</Text>
              </Pressable>
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
              onTryOn={openTryOn}
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

  tryOn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, paddingVertical: 13, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(230,190,245,0.45)', backgroundColor: 'rgba(118,67,172,0.25)' },
  tryOnText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
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