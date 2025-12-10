import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { loadItem, saveItem } from "./storage";

// const API_URL = "http://10.0.2.2:3000";
// const API_URL = "http://localhost:3000";
const API_URL = "http://192.168.1.28:3000";

const palette = {
  background: "#0f172a",
  panel: "#111827",
  card: "#16213a",
  muted: "#94a3b8",
  accent: "#22c55e",
  accentSoft: "#34d399",
  danger: "#ef4444",
  border: "#1f2937",
  bubbleMine: "#1d4ed8",
  bubbleOther: "#1f2937"
};

type Palette = typeof palette;

type User = {
  id: number;
  username: string;
  online: number;
};

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  type: string;
  content: string;
  createdAt: string;
};

type PillButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  styles: ReturnType<typeof createStyles>;
};

function PillButton({ title, onPress, variant = "primary", disabled, styles }: PillButtonProps) {
  const variantStyle =
    variant === "primary"
      ? styles.pillPrimary
      : variant === "danger"
        ? styles.pillDanger
        : styles.pillGhost;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.pillButton, variantStyle, disabled && styles.pillDisabled]}
      activeOpacity={0.8}
    >
      <Text style={styles.pillText}>{title}</Text>
    </TouchableOpacity>
  );
}

function normalizeMessage(m: any): Message {
  return {
    ...m,
    senderId: Number(m.senderId),
    receiverId: Number(m.receiverId)
  };
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.background },
    container: { flex: 1 },
    screenBg: { backgroundColor: palette.background, padding: 14 },
    topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    topBarButtons: { flexDirection: "row", gap: 8 },
    authCard: {
      backgroundColor: palette.panel,
      padding: 16,
      borderRadius: 18,
      gap: 14,
      borderWidth: 1,
      borderColor: palette.border
    },
    appTitle: { fontSize: 28, fontWeight: "800", color: palette.accent },
    subtitle: { color: palette.muted },
    input: {
      backgroundColor: palette.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: "#fff",
      borderWidth: 1,
      borderColor: palette.border
    },
    pillButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center"
    },
    pillPrimary: { backgroundColor: palette.accent },
    pillGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: palette.border },
    pillDanger: { backgroundColor: palette.danger },
    pillDisabled: { opacity: 0.6 },
    pillText: { color: "#fff", fontWeight: "700" },
    editNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginVertical: 8
    },
    editNameInput: {
      flex: 1,
      backgroundColor: palette.card,
      color: "#fff",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: palette.border
    },
    usersChips: { marginVertical: 10 },
    usersChipsContent: { gap: 8, paddingRight: 8 },
    userChip: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      minWidth: 120,
      marginRight: 8
    },
    userChipSelected: {
      borderColor: palette.accent,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 }
    },
    userRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    userName: { color: "#fff", fontWeight: "600", fontSize: 15 },
    statusDot: { width: 10, height: 10, borderRadius: 20 },
    userStatus: { color: palette.muted, fontSize: 12, marginTop: 4 },
    chatPanel: {
      flex: 1,
      backgroundColor: palette.panel,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: palette.border,
      minHeight: 500
    },
    chatHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12
    },
    chatTitle: { fontSize: 20, color: "#fff", fontWeight: "700" },
    chatSubtitle: { color: palette.muted, marginTop: 2 },
    badge: { color: palette.accent, fontWeight: "600", fontSize: 12 },
    messagesBox: {
      flex: 1,
      backgroundColor: palette.card,
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: 10
    },
    messagesContent: { gap: 8 },
    messageItem: {
      padding: 10,
      borderRadius: 12,
      maxWidth: "80%",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 }
    },
    messageMine: { backgroundColor: palette.bubbleMine, alignSelf: "flex-end" },
    messageOther: { backgroundColor: palette.bubbleOther, alignSelf: "flex-start" },
    messageText: { color: "#fff", fontSize: 14 },
    messageMeta: { fontSize: 11, color: palette.muted, marginTop: 6, textAlign: "right" },
    messageImage: { width: 180, height: 180, borderRadius: 12 },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    messageInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: palette.card,
      color: "#fff"
    },
    bottomActions: { flexDirection: "row", gap: 8, marginTop: 10 },
    muted: { color: palette.muted },
    linkText: { color: palette.accent, fontWeight: "700" },
  });
}


export default function Index() {
  const [username, setUsername] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  const styles = createStyles(palette);

  useEffect(() => {
    (async () => {
      const storedUsername = await loadItem<string>("username");
      if (storedUsername) setUsername(storedUsername);
    })();
  }, []);


  async function login() {
    if (!username.trim()) return;
    try {
      const res = await fetch(API_URL + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() })
      });
      const data = await res.json();
      if (data && data.id) {
        setUser(data);
        setNewUsername(data.username);
        await saveItem("username", data.username);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function logout() {
    if (!user) return;
    try {
      await fetch(API_URL + "/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
    } catch (e) {
      console.log(e);
    }
    setUser(null);
    setSelectedUser(null);
    setMessages([]);
    setRecording(null);
    setPlayingSound(null);
    setUsername("");
    setEditingName(false);
  }

  function startEditUsername() {
    if (!user) return;
    setNewUsername(user.username);
    setEditingName(true);
  }

  async function saveUsername() {
    if (!user) return;
    if (!newUsername.trim()) return;

    try {
      const res = await fetch(API_URL + "/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, username: newUsername.trim() })
      });
      const data = await res.json();
      if (data && data.id) {
        setUser(data);
        await saveItem("username", data.username);
        setUsers((prev) => prev.map((u) => (u.id === data.id ? { ...u, username: data.username } : u)));
        setEditingName(false);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch(API_URL + "/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.log(e);
    }
  }

  function fileUrl(path: string) {
    if (path.startsWith("http")) return path;
    return API_URL + path;
  }

  async function loadMessages() {
    if (!user || !selectedUser) return;
    setLoadingMessages(true);
    try {
      const url =
        API_URL +
        "/api/messages?user1=" +
        user.id +
        "&user2=" +
        selectedUser.id;
      const res = await fetch(url);
      const data = await res.json();
      const normalized = (data as any[]).map((m) => normalizeMessage(m));
      setMessages(normalized);
    } catch (e) {
      console.log(e);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedUser) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [user, selectedUser]);

  async function sendMessage() {
    if (!text.trim() || !user || !selectedUser) return;
    const body = {
      senderId: user.id,
      receiverId: selectedUser.id,
      type: "text",
      content: text.trim()
    };
    try {
      const res = await fetch(API_URL + "/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      const m = normalizeMessage(data);
      const updated = [...messages, m];
      setMessages(updated);
      setText("");
    } catch (e) {
      console.log(e);
    }
  }

  async function sendImage() {
    if (!user || !selectedUser) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      console.log("permission refusée");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset || !asset.uri) return;

    const formData = new FormData();
    formData.append("file", {
      uri: asset.uri,
      name: "photo.jpg",
      type: "image/jpeg"
    } as any);
    formData.append("senderId", String(user.id));
    formData.append("receiverId", String(selectedUser.id));

    try {
      const res = await fetch(API_URL + "/api/upload/image", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      const m = normalizeMessage(data);
      const updated = [...messages, m];
      setMessages(updated);
    } catch (e) {
      console.log(e);
    }
  }

  async function startRecording() {
    if (!user || !selectedUser) return;

    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        console.log("permission micro refusée");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await rec.startAsync();
      setRecording(rec);
    } catch (e) {
      console.log(e);
    }
  }

  async function stopRecording() {
    if (!recording || !user || !selectedUser) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "audio.m4a",
        type: "audio/m4a"
      } as any);
      formData.append("senderId", String(user.id));
      formData.append("receiverId", String(selectedUser.id));

      const res = await fetch(API_URL + "/api/upload/audio", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      const m = normalizeMessage(data);
      const updated = [...messages, m];
      setMessages(updated);
    } catch (e) {
      console.log(e);
    }
  }

  async function toggleRecording() {
    if (recording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }

  async function sendLocation() {
    if (!user || !selectedUser) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("permission localisation refusée");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    const body = {
      senderId: user.id,
      receiverId: selectedUser.id,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude
    };

    try {
      const res = await fetch(API_URL + "/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      const m = normalizeMessage(data);
      const updated = [...messages, m];
      setMessages(updated);
    } catch (e) {
      console.log(e);
    }
  }

  async function playAudio(uri: string) {
    try {
      if (playingSound) {
        await playingSound.stopAsync();
        await playingSound.unloadAsync();
        setPlayingSound(null);
      }
      const { sound } = await Audio.Sound.createAsync({ uri });
      setPlayingSound(sound);
      await sound.playAsync();
    } catch (e) {
      console.log(e);
    }
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.screenBg]}>
          <View style={styles.authCard}>
            <Text style={styles.appTitle}>EchoChat</Text>
            <Text style={styles.subtitle}>Rejoins la conversation</Text>
            <TextInput
              style={styles.input}
              placeholder="Pseudo"
              placeholderTextColor={palette.muted}
              value={username}
              onChangeText={setUsername}
            />
            <PillButton title="Se connecter" onPress={login} styles={styles} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, styles.screenBg]}>
        <View style={styles.topBar}>
          <Text style={styles.appTitle}>EchoChat</Text>
          <View style={styles.topBarButtons}>
            <PillButton title="Rafraichir" onPress={loadUsers} variant="ghost" styles={styles} />
            <PillButton title="Modifier pseudo" onPress={startEditUsername} variant="ghost" styles={styles} />
            <PillButton title="Déconnexion" onPress={logout} variant="danger" styles={styles} />
          </View>
        </View>

        {editingName && (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.editNameInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Nouveau pseudo"
              placeholderTextColor={palette.muted}
            />
            <PillButton title="OK" onPress={saveUsername} styles={styles} />
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.usersChips}
          contentContainerStyle={styles.usersChipsContent}
        >
          {users
            .filter((u) => u.id !== user.id)
            .map((u) => (
              <TouchableOpacity
                key={u.id}
                style={[
                  styles.userChip,
                  selectedUser && selectedUser.id === u.id ? styles.userChipSelected : null
                ]}
                onPress={() => setSelectedUser(u)}
                activeOpacity={0.85}
              >
                <View style={styles.userRow}>
                  <Text style={styles.userName}>{u.username}</Text>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: u.online ? palette.accent : palette.danger }
                    ]}
                  />
                </View>
                <Text style={styles.userStatus}>{u.online ? "en ligne" : "hors ligne"}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>

        <View style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <View>
              <Text style={styles.chatTitle}>
                {selectedUser ? selectedUser.username : "Choisis un contact"}
              </Text>
              <Text style={styles.chatSubtitle}>
                {selectedUser ? "Discussion privée" : "Sélectionne un utilisateur"}
              </Text>
            </View>
            <Text style={styles.badge}>Connecté: {user.username}</Text>
          </View>

          {selectedUser ? (
            <>
              <View style={styles.messagesBox}>
                {loadingMessages ? (
                  <Text style={styles.muted}>Chargement...</Text>
                ) : (
                  <ScrollView contentContainerStyle={styles.messagesContent}>
                    {messages.length === 0 ? (
                      <Text style={styles.muted}>Aucun message pour le moment.</Text>
                    ) : (
                      messages.map((m) => {
                        let contentView = null;

                        if (m.type === "image") {
                          contentView = (
                            <Image source={{ uri: fileUrl(m.content) }} style={styles.messageImage} />
                          );
                        } else if (m.type === "audio") {
                          contentView = (
                            <TouchableOpacity onPress={() => playAudio(fileUrl(m.content))}>
                              <Text style={styles.linkText}>Lecture audio</Text>
                            </TouchableOpacity>
                          );
                        } else if (m.type === "location") {
                          const obj = JSON.parse(m.content);
                          contentView = (
                            <Text style={styles.messageText}>
                              Position: {obj.lat.toFixed(3)}, {obj.lng.toFixed(3)}
                            </Text>);
                        }

                        const mine = m.senderId === user.id;
                        return (
                          <View
                            key={m.id}
                            style={[
                              styles.messageItem,
                              mine ? styles.messageMine : styles.messageOther
                            ]}
                          >
                            {contentView || (
                              <Text style={styles.messageText}>
                                {m.content}
                              </Text>
                            )}
                            <Text style={styles.messageMeta}>
                              {new Date(m.createdAt).toLocaleTimeString()}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                )}
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Message..."
                  placeholderTextColor={palette.muted}
                  value={text}
                  onChangeText={setText}
                />
                <PillButton title="Envoyer" onPress={sendMessage} styles={styles} />
              </View>

              <View style={styles.bottomActions}>
                <PillButton title="Image" onPress={sendImage} variant="ghost" styles={styles} />
                <PillButton
                  title={recording ? "Stop" : "Audio"}
                  onPress={toggleRecording}
                  variant={recording ? "danger" : "ghost"}
                  styles={styles}
                />
                <PillButton title="Localisation" onPress={sendLocation} variant="ghost" styles={styles} />
              </View>
            </>
          ) : (
            <Text style={styles.muted}>Sélectionne un utilisateur pour démarrer le chat.</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}