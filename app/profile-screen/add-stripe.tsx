import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function AddStripeScreen() {
  const router = useRouter();
  const [stripeId, setStripeId] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Stripe</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={styles.label}>STRIPE ID</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your stripe ID"
              placeholderTextColor="#8E8E9B"
              value={stripeId}
              onChangeText={setStripeId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => router.back()}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  label: {
    color: '#8E8E9B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputContainer: {
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30, // Extra padding for safe area at bottom
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#13131A', // Very dark grey
    borderRadius: 12,
    marginRight: 10,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B2ABBA', // Light purple-grey
    borderRadius: 12,
    marginLeft: 10,
  },
  saveBtnText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
