/**
 * Health Conditions Screen
 *
 * Displays and edits the patient's full health profile inline.
 * All fields are editable — chips for lists, toggles for booleans,
 * pickers for smoker/alcohol, text inputs for free-text fields.
 * Changes are saved via updateHealthProfile() → AsyncStorage.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useHealthProfile } from '../context/HealthProfileContext';
import { MOCK_HEALTH_PROFILE } from '../constants/mockData';

// ─── Preset chip options ──────────────────────────────────────────

const CONDITION_PRESETS  = ['Diabetes', 'Hypertension', 'Heart disease', 'Thyroid', 'Asthma', 'Cancer', 'Kidney disease', 'Liver disease', 'Arthritis', 'Epilepsy'];
const MEDICATION_PRESETS = ['Aspirin', 'Metformin', 'Blood thinners', 'Steroids', 'Retinoids', 'Antibiotics', 'Antidepressants', 'Contraceptives', 'Thyroid meds', 'Insulin'];
const SKIN_PRESETS       = ['Acne', 'Eczema', 'Psoriasis', 'Rosacea', 'Melasma', 'Vitiligo', 'Dermatitis', 'Oily skin', 'Dry skin', 'Sensitive skin'];
const ALLERGY_PRESETS    = ['Penicillin', 'Sulfa drugs', 'NSAIDs', 'Latex', 'Nickel', 'Fragrance', 'Iodine', 'Anaesthesia', 'Tree nuts', 'Shellfish'];
const TREATMENT_PRESETS  = ['Botox', 'Filler', 'Chemical peel', 'Laser', 'Microneedling', 'PRP', 'Hydrafacial', 'Thread lift', 'Dental cleaning', 'Root canal'];
const IMPLANT_PRESETS    = ['Pacemaker', 'Cochlear implant', 'Metal plates', 'Joint replacement', 'IUD', 'Breast implant', 'Dental implant', 'Spinal stimulator'];
const LIFESTYLE_PRESETS  = ['Exercise daily', 'Vegetarian', 'Vegan', 'High-stress job', 'Night shifts', 'Sun exposure (high)', 'Pool swimming', 'Outdoor sports'];

// ─── Sub-components ───────────────────────────────────────────────

function SectionHeader({ icon, title, editing }: { icon: string; title: string; editing: boolean }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionIcon}>{icon}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
      {editing && <View style={s.editingDot} />}
    </View>
  );
}

/** Chip list with add/remove in edit mode, read-only tags in view mode */
function ChipField({
  items, presets, placeholder, editing, onChange,
}: {
  items: string[];
  presets: string[];
  placeholder: string;
  editing: boolean;
  onChange: (val: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const add = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const remove = (item: string) => {
    onChange(items.filter((i) => i !== item));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const displayItems = items.length === 0 ? ['None reported'] : items;

  return (
    <View>
      {/* Current chips */}
      <View style={s.chipRow}>
        {displayItems.map((item, i) => (
          <View key={i} style={[s.chip, item === 'None reported' && s.chipNone, editing && item !== 'None reported' && s.chipEditing]}>
            <Text style={[s.chipText, item === 'None reported' && s.chipTextNone]}>{item}</Text>
            {editing && item !== 'None reported' && (
              <Pressable onPress={() => remove(item)} hitSlop={6} style={s.chipRemove}>
                <Text style={s.chipRemoveText}>×</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {editing && (
        <>
          {/* Text input */}
          <View style={s.inputRow}>
            <TextInput
              style={s.textInput}
              value={input}
              onChangeText={setInput}
              placeholder={placeholder}
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={() => add(input)}
            />
            <Pressable onPress={() => add(input)} style={s.addBtn}>
              <Text style={s.addBtnText}>Add</Text>
            </Pressable>
          </View>

          {/* Preset suggestions */}
          <View style={s.presetRow}>
            {presets.filter((p) => !items.includes(p)).slice(0, 6).map((p, i) => (
              <Pressable key={i} onPress={() => add(p)} style={s.presetChip}>
                <Text style={s.presetChipText}>+ {p}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

/** Simple yes/no toggle row */
function ToggleRow({ label, value, editing, onChange }: { label: string; value: boolean; editing: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      {editing ? (
        <View style={s.toggleBtns}>
          <Pressable onPress={() => onChange(true)}  style={[s.toggleBtn, value  && s.toggleBtnActive]}>
            <Text style={[s.toggleBtnText, value  && s.toggleBtnTextActive]}>Yes</Text>
          </Pressable>
          <Pressable onPress={() => onChange(false)} style={[s.toggleBtn, !value && s.toggleBtnActiveNo]}>
            <Text style={[s.toggleBtnText, !value && s.toggleBtnTextActive]}>No</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[s.toggleValue, value && s.toggleValueYes]}>{value ? 'Yes' : 'No'}</Text>
      )}
    </View>
  );
}

/** Segmented picker row */
function PickerRow({ label, value, options, editing, onChange }: {
  label: string; value: string; options: { key: string; label: string }[];
  editing: boolean; onChange: (v: string) => void;
}) {
  return (
    <View style={s.pickerRow}>
      <Text style={s.pickerLabel}>{label}</Text>
      {editing ? (
        <View style={s.segmented}>
          {options.map((o) => (
            <Pressable key={o.key} onPress={() => onChange(o.key)} style={[s.segment, value === o.key && s.segmentActive]}>
              <Text style={[s.segmentText, value === o.key && s.segmentTextActive]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={s.pickerValue}>{options.find((o) => o.key === value)?.label ?? value ?? 'Not set'}</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function HealthConditionsScreen() {
  const router = useRouter();
  const { healthProfile, updateHealthProfile } = useHealthProfile();
  const hp = healthProfile ?? MOCK_HEALTH_PROFILE;

  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);

  // Editable state — mirrors all profile fields
  const [conditions,        setConditions]        = useState<string[]>(hp.conditions        ?? []);
  const [medications,       setMedications]       = useState<string[]>(hp.medications       ?? []);
  const [skinConditions,    setSkinConditions]     = useState<string[]>(hp.skinConditions    ?? []);
  const [allergies,         setAllergies]          = useState<string[]>(hp.allergies         ?? []);
  const [recentTreatments,  setRecentTreatments]   = useState<string[]>(hp.recentTreatments  ?? []);
  const [implantDevices,    setImplantDevices]     = useState<string[]>((hp as any).implantDevices ?? []);
  const [lifestyleHabits,   setLifestyleHabits]    = useState<string[]>((hp as any).lifestyleHabits ?? []);
  const [outsideTreatments, setOutsideTreatments]  = useState<string[]>((hp as any).outsideTreatments ?? []);

  const [pregnant,            setPregnant]            = useState(hp.pregnant            ?? false);
  const [breastfeeding,       setBreastfeeding]        = useState(hp.breastfeeding       ?? false);
  const [onBloodThinners,     setOnBloodThinners]      = useState(hp.onBloodThinners     ?? false);
  const [onRetinoids,         setOnRetinoids]          = useState(hp.onRetinoids         ?? false);
  const [onSteroids,          setOnSteroids]           = useState(hp.onSteroids          ?? false);
  const [hasImplantedDevice,  setHasImplantedDevice]   = useState(hp.hasImplantedDevice  ?? false);
  const [hadAdverseReaction,  setHadAdverseReaction]   = useState(hp.hadAdverseReaction  ?? false);
  const [adverseDetail,       setAdverseDetail]        = useState(hp.adverseReactionDetail ?? '');
  const [tobaccoChewer,       setTobaccoChewer]        = useState(hp.tobaccoChewer        ?? false);
  const [smoker,              setSmoker]               = useState(hp.smoker               ?? 'never');
  const [alcohol,             setAlcohol]              = useState(hp.alcohol              ?? 'never');

  const startEdit = () => {
    // Sync latest values from profile before editing
    const p = healthProfile ?? MOCK_HEALTH_PROFILE;
    setConditions(p.conditions ?? []);
    setMedications(p.medications ?? []);
    setSkinConditions(p.skinConditions ?? []);
    setAllergies(p.allergies ?? []);
    setRecentTreatments(p.recentTreatments ?? []);
    setImplantDevices((p as any).implantDevices ?? []);
    setLifestyleHabits((p as any).lifestyleHabits ?? []);
    setOutsideTreatments((p as any).outsideTreatments ?? []);
    setPregnant(p.pregnant ?? false);
    setBreastfeeding(p.breastfeeding ?? false);
    setOnBloodThinners(p.onBloodThinners ?? false);
    setOnRetinoids(p.onRetinoids ?? false);
    setOnSteroids(p.onSteroids ?? false);
    setHasImplantedDevice(p.hasImplantedDevice ?? false);
    setHadAdverseReaction(p.hadAdverseReaction ?? false);
    setAdverseDetail(p.adverseReactionDetail ?? '');
    setTobaccoChewer(p.tobaccoChewer ?? false);
    setSmoker(p.smoker ?? 'never');
    setAlcohol(p.alcohol ?? 'never');
    setEditing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const cancelEdit = () => {
    setEditing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveEdit = useCallback(async () => {
    setSaving(true);
    try {
      await updateHealthProfile({
        conditions,
        medications,
        skinConditions,
        allergies,
        recentTreatments,
        implantDevices,
        lifestyleHabits,
        outsideTreatments,
        pregnant,
        breastfeeding,
        onBloodThinners,
        onRetinoids,
        onSteroids,
        hasImplantedDevice,
        hadAdverseReaction,
        adverseReactionDetail: adverseDetail || null,
        tobaccoChewer,
        smoker,
        alcohol,
        declarationAccepted: true,
      });
      setEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Save failed', 'Could not update your health profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [conditions, medications, skinConditions, allergies, recentTreatments,
      implantDevices, lifestyleHabits, outsideTreatments,
      pregnant, breastfeeding, onBloodThinners, onRetinoids, onSteroids,
      hasImplantedDevice, hadAdverseReaction, adverseDetail,
      tobaccoChewer, smoker, alcohol]);

  const smokerOpts  = [{ key: 'never', label: 'Never' }, { key: 'sometimes', label: 'Sometimes' }, { key: 'daily', label: 'Daily' }];
  const alcoholOpts = [{ key: 'never', label: 'Never' }, { key: 'occasionally', label: 'Occasionally' }, { key: 'regularly', label: 'Regularly' }, { key: 'daily', label: 'Daily' }];

  // Merge app treatments + outside into display list
  const allTreatments = [...recentTreatments, ...outsideTreatments].filter(Boolean);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <LinearGradient colors={['#1E1B4B', '#4C1D95']} style={s.header}>
          <View style={s.headerTop}>
            <Pressable onPress={() => editing ? cancelEdit() : router.back()} style={s.backBtn}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}>
              <Text style={s.backArrow}>{editing ? '✕' : '‹'}</Text>
            </Pressable>
            <Text style={s.headerTitle}>{editing ? 'Editing Health Profile' : 'Health Conditions'}</Text>
            <Pressable onPress={editing ? saveEdit : startEdit} style={s.editBtn} disabled={saving}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.editBtnText}>{editing ? 'Save' : 'Edit'}</Text>
              }
            </Pressable>
          </View>
          <Text style={s.headerSub}>
            {editing ? 'Tap fields to edit. Tap chips × to remove.' : 'Your health profile used for scan analysis'}
          </Text>
          {!editing && (
            <View style={s.completionBadge}>
              <Text style={s.completionText}>
                {hp.declarationAccepted ? '✓ Declaration Accepted' : '⚠️ Declaration Pending'}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Critical Flags Banner */}
        {(pregnant || onBloodThinners || hasImplantedDevice) && (
          <View style={s.alertBanner}>
            <Text style={s.alertTitle}>⚠️ Active Medical Flags</Text>
            {pregnant          && <Text style={s.alertItem}>• Currently pregnant</Text>}
            {breastfeeding     && <Text style={s.alertItem}>• Currently breastfeeding</Text>}
            {onBloodThinners   && <Text style={s.alertItem}>• On blood thinners</Text>}
            {hasImplantedDevice && <Text style={s.alertItem}>• Has implanted device/pacemaker</Text>}
          </View>
        )}

        {/* ── Medical Conditions ─────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader icon="🏥" title="Medical Conditions" editing={editing} />
          <View style={s.card}>
            <ChipField items={conditions} presets={CONDITION_PRESETS}
              placeholder="Add condition (e.g. Diabetes)..."
              editing={editing} onChange={setConditions} />
            {editing && (
              <>
                <View style={s.divider} />
                <ToggleRow label="Currently pregnant"    value={pregnant}        editing={editing} onChange={setPregnant} />
                <View style={s.divider} />
                <ToggleRow label="Breastfeeding"         value={breastfeeding}   editing={editing} onChange={setBreastfeeding} />
                <View style={s.divider} />
                <ToggleRow label="On blood thinners"     value={onBloodThinners} editing={editing} onChange={setOnBloodThinners} />
              </>
            )}
          </View>
        </View>

        {/* ── Current Medications ────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader icon="💊" title="Current Medications" editing={editing} />
          <View style={s.card}>
            <ChipField items={medications} presets={MEDICATION_PRESETS}
              placeholder="Add medication..."
              editing={editing} onChange={setMedications} />
            {editing && (
              <>
                <View style={s.divider} />
                <ToggleRow label="On retinoids" value={onRetinoids} editing={editing} onChange={setOnRetinoids} />
                <View style={s.divider} />
                <ToggleRow label="On steroids"  value={onSteroids}  editing={editing} onChange={setOnSteroids} />
              </>
            )}
          </View>
        </View>

        {/* ── Skin Conditions ────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader icon="🧴" title="Skin Conditions" editing={editing} />
          <View style={s.card}>
            <ChipField items={skinConditions} presets={SKIN_PRESETS}
              placeholder="Add skin condition..."
              editing={editing} onChange={setSkinConditions} />
          </View>
        </View>

        {/* ── Known Allergies ────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader icon="⚠️" title="Known Allergies" editing={editing} />
          <View style={s.card}>
            <ChipField items={allergies} presets={ALLERGY_PRESETS}
              placeholder="Add allergy (e.g. Penicillin)..."
              editing={editing} onChange={setAllergies} />
            {editing && (
              <>
                <View style={s.divider} />
                <ToggleRow label="Had adverse reaction before" value={hadAdverseReaction} editing={editing} onChange={setHadAdverseReaction} />
                {hadAdverseReaction && (
                  <TextInput
                    style={[s.textInput, { marginTop: 10 }]}
                    value={adverseDetail}
                    onChangeText={setAdverseDetail}
                    placeholder="Describe the reaction..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                  />
                )}
              </>
            )}
            {!editing && hadAdverseReaction && (
              <>
                <View style={s.divider} />
                <Text style={s.noteText}>⚠️ Adverse reaction: {adverseDetail || 'Yes (no detail)'}</Text>
              </>
            )}
          </View>
        </View>

        {/* ── Lifestyle & Habits ─────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader icon="🏃" title="Lifestyle & Habits" editing={editing} />
          <View style={s.card}>
            <PickerRow label="Smoking"          value={smoker}  options={smokerOpts}  editing={editing} onChange={setSmoker} />
            <View style={s.divider} />
            <PickerRow label="Alcohol"          value={alcohol} options={alcoholOpts} editing={editing} onChange={setAlcohol} />
            <View style={s.divider} />
            <ToggleRow label="Tobacco chewing"  value={tobaccoChewer} editing={editing} onChange={setTobaccoChewer} />
            {(editing || lifestyleHabits.length > 0) && (
              <>
                <View style={s.divider} />
                <Text style={s.subLabel}>Other habits</Text>
                <ChipField items={lifestyleHabits} presets={LIFESTYLE_PRESETS}
                  placeholder="Add habit (e.g. Exercise daily)..."
                  editing={editing} onChange={setLifestyleHabits} />
              </>
            )}
          </View>
        </View>

        {/* ── Recent Treatments (App + Outside) ─────────────────── */}
        <View style={s.section}>
          <SectionHeader icon="🩺" title="Recent Treatments" editing={editing} />
          <View style={s.card}>
            {recentTreatments.length > 0 && (
              <>
                <Text style={s.subLabel}>From this app</Text>
                <View style={s.chipRow}>
                  {recentTreatments.map((t, i) => (
                    <View key={i} style={s.chip}>
                      <Text style={s.chipText}>{t}</Text>
                    </View>
                  ))}
                </View>
                {editing && <View style={s.divider} />}
              </>
            )}
            <Text style={s.subLabel}>{editing ? 'External / outside treatments' : recentTreatments.length === 0 ? 'External treatments' : 'External treatments'}</Text>
            <ChipField items={outsideTreatments} presets={TREATMENT_PRESETS}
              placeholder="Add treatment (e.g. Botox, Laser)..."
              editing={editing} onChange={setOutsideTreatments} />
            {!editing && outsideTreatments.length === 0 && recentTreatments.length === 0 && (
              <View style={s.chipRow}>
                <View style={[s.chip, s.chipNone]}><Text style={s.chipTextNone}>None reported</Text></View>
              </View>
            )}
          </View>
        </View>

        {/* ── Implants & Devices ─────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader icon="🔩" title="Implants & Devices" editing={editing} />
          <View style={s.card}>
            <ToggleRow label="Has implanted device / pacemaker" value={hasImplantedDevice} editing={editing} onChange={setHasImplantedDevice} />
            <View style={s.divider} />
            <Text style={s.subLabel}>Device details</Text>
            <ChipField items={implantDevices} presets={IMPLANT_PRESETS}
              placeholder="Add device (e.g. Pacemaker, IUD)..."
              editing={editing} onChange={setImplantDevices} />
          </View>
        </View>

        {/* ── Profile Completion ─────────────────────────────────── */}
        {!editing && (
          <View style={s.scoreCard}>
            <Text style={s.scoreLabel}>Profile Completion</Text>
            <View style={s.scoreBar}>
              <View style={[s.scoreBarFill, { width: `${hp.profileCompletionScore ?? 0}%` }]} />
            </View>
            <Text style={s.scoreNum}>{hp.profileCompletionScore ?? 0}%</Text>
          </View>
        )}

        {/* ── CTA ────────────────────────────────────────────────── */}
        {editing ? (
          <View style={s.ctaRow}>
            <Pressable onPress={cancelEdit} style={s.cancelBtn} android_ripple={{ color: 'rgba(124,58,237,0.1)' }}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={saveEdit} disabled={saving}
              style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
              <LinearGradient colors={saving ? ['#94A3B8', '#64748B'] : ['#4C1D95', '#7C3AED']} style={s.saveBtn}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnText}>✓ Save Health Profile</Text>
                }
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={startEdit}
            android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
            style={{ marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', marginBottom: 16, marginTop: 8 }}
          >
            <LinearGradient colors={['#4C1D95', '#7C3AED']} style={s.updateBtn}>
              <Text style={s.updateBtnText}>✏️  Edit Health Info</Text>
            </LinearGradient>
          </Pressable>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 20 },

  header:    { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 6 },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: '#fff', lineHeight: 36 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 14 },
  editBtn:     { width: 52, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  editBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  completionBadge: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  completionText:  { fontSize: 12, fontWeight: '700', color: '#fff' },

  alertBanner: { marginHorizontal: 20, marginTop: 16, marginBottom: 4, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#FECACA' },
  alertTitle:  { fontSize: 13, fontWeight: '800', color: '#DC2626', marginBottom: 6 },
  alertItem:   { fontSize: 13, color: '#7F1D1D', marginBottom: 2 },

  section:       { marginHorizontal: 20, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon:   { fontSize: 16 },
  sectionTitle:  { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  editingDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: '#7C3AED' },
  card:          { backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },

  subLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  divider:  { height: 1, backgroundColor: Colors.borderLight, marginVertical: 10 },
  noteText: { fontSize: 12, color: Colors.danger, lineHeight: 18 },

  // Chips
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip:         { backgroundColor: Colors.primaryBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.borderMid, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipNone:     { backgroundColor: Colors.cardBg, borderColor: Colors.borderLight },
  chipEditing:  { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  chipText:     { fontSize: 12, fontWeight: '700', color: Colors.primary },
  chipTextNone: { color: Colors.textMuted, fontWeight: '500' },
  chipRemove:   { marginLeft: 2 },
  chipRemoveText: { fontSize: 14, color: '#7C3AED', fontWeight: '900', lineHeight: 16 },

  // Input
  inputRow:  { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  textInput: {
    flex: 1, height: 42, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderMid, paddingHorizontal: 12,
    fontSize: 13, color: Colors.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  addBtn:     { height: 42, paddingHorizontal: 16, backgroundColor: '#7C3AED', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Preset suggestions
  presetRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  presetChip:     { backgroundColor: '#F5F3FF', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#DDD6FE' },
  presetChipText: { fontSize: 11, fontWeight: '600', color: '#6D28D9' },

  // Toggle row
  toggleRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  toggleLabel:        { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  toggleValue:        { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  toggleValueYes:     { color: Colors.danger },
  toggleBtns:         { flexDirection: 'row', gap: 6 },
  toggleBtn:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.borderMid, backgroundColor: '#fff' },
  toggleBtnActive:    { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  toggleBtnActiveNo:  { backgroundColor: '#DCFCE7', borderColor: '#22C55E' },
  toggleBtnText:      { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  toggleBtnTextActive:{ color: Colors.textPrimary },

  // Picker / segmented
  pickerRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingVertical: 2 },
  pickerLabel:        { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  pickerValue:        { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  segmented:          { flexDirection: 'row', gap: 4 },
  segment:            { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.borderMid, backgroundColor: '#fff' },
  segmentActive:      { backgroundColor: '#4C1D95', borderColor: '#4C1D95' },
  segmentText:        { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  segmentTextActive:  { color: '#fff' },

  // Profile score
  scoreCard:    { marginHorizontal: 20, marginTop: 20, marginBottom: 8, backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight, ...Colors.shadow.small },
  scoreLabel:   { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10 },
  scoreBar:     { height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  scoreBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  scoreNum:     { fontSize: 13, fontWeight: '800', color: Colors.primary, textAlign: 'right' },

  // CTAs
  ctaRow:        { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 24, marginBottom: 8 },
  cancelBtn:     { height: 52, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1.5, borderColor: '#DDD6FE' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  saveBtn:       { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  saveBtnText:   { fontSize: 15, fontWeight: '800', color: '#fff' },
  updateBtn:     { height: 52, alignItems: 'center', justifyContent: 'center' },
  updateBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
