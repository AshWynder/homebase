import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  Home,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Phone,
  User,
  UserPlus,
  type LucideIcon,
} from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { Role } from '@/api/types';
import { useSignIn, useSignUp } from '@/hooks/queries/use-auth';
import { homeRouteFor } from '@/lib/auth-routing';

type Mode = 'sign-in' | 'sign-up';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Input styles that flatten the shared `Input` inside a custom field row. */
const BARE_INPUT =
  'h-11 flex-1 w-auto border-0 bg-transparent px-0 shadow-none';

const ROLE_OPTIONS: { value: Role; label: string; icon: LucideIcon }[] = [
  { value: 'TENANT', label: 'Tenant', icon: KeyRound },
  { value: 'OWNER', label: 'Property Mgr', icon: Building2 },
  { value: 'CARETAKER', label: 'Caretaker', icon: Home },
];

interface SignInValues {
  email: string;
  password: string;
}

interface SignUpValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  nationalId: string;
  role: Role;
  terms: boolean;
}

interface AuthScreenProps {
  mode: Mode;
}

/**
 * Shared auth screen matching the Homebase design: teal gradient header with
 * the brand row, a white rounded card holding the Log In / Sign Up segmented
 * toggle and the react-hook-form powered forms.
 */
export function AuthScreen({ mode }: AuthScreenProps) {
  const isSignUp = mode === 'sign-up';

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      <LinearGradient colors={['#115E59', '#0D9488']} className="pb-28">
        <SafeAreaView edges={['top']} className="px-6 mb-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                <Icon as={Home} size={22} className="text-white" />
              </View>
              <Text className="text-2xl font-bold text-white">Homebase</Text>
            </View>
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white/15">
              <Icon as={Clock} size={20} className="text-white/80" />
            </Pressable>
          </View>

          <Text className="mt-8 text-3xl font-bold text-white">
            {isSignUp ? 'Create Account 🚀' : 'Welcome Back 👋'}
          </Text>
          <Text className="mt-2 text-sm text-teal-100">
            {isSignUp
              ? 'Join Homebase to manage or lease modern residences.'
              : 'Sign in to continue managing your residences.'}
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <View className="-mt-2 flex-1 rounded-t-[28px] bg-white px-6 pt-6">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <SegmentedToggle mode={mode} />
          {isSignUp ? <SignUpForm /> : <SignInForm />}

          <View className="mt-auto items-center pt-8">
            <Text className="text-xs text-slate-400">
              Managed by Homebase • v1.0.0
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

/* ── Segmented toggle ─────────────────────────────────────── */

function SegmentedToggle({ mode }: { mode: Mode }) {
  const isSignUp = mode === 'sign-up';
  return (
    <View className="flex-row rounded-full bg-slate-100 p-1">
      <Pressable
        onPress={() => !isSignUp || router.replace('/(auth)/sign-in')}
        className={`flex-1 flex-row items-center justify-center gap-2 rounded-full py-2.5 ${
          isSignUp ? '' : 'bg-white shadow-sm'
        }`}>
        <Icon
          as={LogIn}
          size={15}
          className={isSignUp ? 'text-slate-500' : 'text-teal-700'}
        />
        <Text
          className={`text-sm font-semibold ${
            isSignUp ? 'text-slate-500' : 'text-slate-900'
          }`}>
          Log In
        </Text>
      </Pressable>

      <Pressable
        onPress={() => isSignUp || router.replace('/(auth)/sign-up')}
        className={`flex-1 flex-row items-center justify-center gap-2 rounded-full py-2.5 ${
          isSignUp ? 'bg-white shadow-sm' : ''
        }`}>
        <Icon
          as={UserPlus}
          size={15}
          className={isSignUp ? 'text-teal-700' : 'text-slate-500'}
        />
        <Text
          className={`text-sm font-semibold ${
            isSignUp ? 'text-slate-900' : 'text-slate-500'
          }`}>
          Sign Up
        </Text>
      </Pressable>
    </View>
  );
}

/* ── Field primitives ─────────────────────────────────────── */

interface FieldProps {
  label: string;
  icon: LucideIcon;
  error?: string;
  children: ReactNode;
}

function Field({ label, icon, error, children }: FieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-slate-800">{label}</Text>
      <View
        className={`flex-row items-center gap-2.5 rounded-xl border bg-slate-50 px-3.5 ${
          error ? 'border-red-400' : 'border-slate-200'
        }`}>
        <Icon as={icon} size={18} className="text-slate-400" />
        {children}
      </View>
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}

interface SecureInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
}

/** Password input with an eye toggle (visibility state is local). */
function SecureInput({ value, onChangeText, onBlur, placeholder }: SecureInputProps) {
  const [secure, setSecure] = useState(true);
  return (
    <>
      <Input
        className={BARE_INPUT}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        secureTextEntry={secure}
        autoCapitalize="none"
        placeholder={placeholder}
      />
      <Pressable onPress={() => setSecure((s) => !s)} hitSlop={8} className="p-1">
        <Icon as={secure ? Eye : EyeOff} size={18} className="text-slate-400" />
      </Pressable>
    </>
  );
}

/* ── Role picker ──────────────────────────────────────────── */

function RolePicker({
  value,
  onChange,
}: {
  value: Role;
  onChange: (role: Role) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Select your account role
      </Text>
      <View className="flex-row gap-3">
        {ROLE_OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3 ${
                active ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white'
              }`}>
              <Icon
                as={opt.icon}
                size={16}
                className={active ? 'text-teal-700' : 'text-slate-400'}
              />
              <Text
                className={`text-sm font-semibold ${
                  active ? 'text-teal-800' : 'text-slate-500'
                }`}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ── Terms checkbox ───────────────────────────────────────── */

function TermsCheckbox({
  value,
  onChange,
  error,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
}) {
  return (
    <View className="gap-1">
      <Pressable
        onPress={() => onChange(!value)}
        className="flex-row items-start gap-2.5">
        <View
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${
            value ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-white'
          }`}>
          {value ? <Icon as={Check} size={14} className="text-white" /> : null}
        </View>
        <Text className="flex-1 text-xs leading-4 text-slate-500">
          I agree to the{' '}
          <Text className="font-semibold text-teal-700 underline">
            Terms of Lease Service
          </Text>{' '}
          and{' '}
          <Text className="font-semibold text-teal-700 underline">
            Privacy Policy
          </Text>
        </Text>
      </Pressable>
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}

/* ── Sign-in form ─────────────────────────────────────────── */

function SignInForm() {
  const signIn = useSignIn();
  const { control, handleSubmit } = useForm<SignInValues>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: SignInValues) =>
    signIn.mutate(
      { email: values.email.trim(), password: values.password },
      {
        // Route off the mutation result: the profile (and therefore the role)
        // is guaranteed fresh, and the store can't disagree with it.
        onSuccess: (session) => {
          router.replace(homeRouteFor(session.profile));
        },
      },
    );

  return (
    <View className="mt-6 gap-4">
      <Controller
        control={control}
        name="email"
        rules={{
          required: 'Email is required',
          pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address' },
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field label="Email Address" icon={Mail} error={fieldState.error?.message}>
            <Input
              className={BARE_INPUT}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="sarah.jenkins@haven.io"
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{ required: 'Password is required' }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field label="Password" icon={Lock} error={fieldState.error?.message}>
            <SecureInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="••••••••"
            />
          </Field>
        )}
      />

      {signIn.isError ? (
        <Text className="text-sm text-red-600">
          {(signIn.error as Error).message}
        </Text>
      ) : null}

      <Button
        onPress={handleSubmit(onSubmit)}
        disabled={signIn.isPending}
        className="h-12 rounded-xl bg-teal-700 active:bg-teal-800">
        <Text>{signIn.isPending ? 'Logging in…' : 'Log In'}</Text>
        <Icon as={ArrowRight} size={18} className="text-white" />
      </Button>
    </View>
  );
}

/* ── Sign-up form ─────────────────────────────────────────── */

function SignUpForm() {
  const signUp = useSignUp();
  const { control, handleSubmit, setValue, watch } = useForm<SignUpValues>({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      nationalId: '',
      role: 'TENANT',
      terms: false,
    },
  });

  const role = watch('role');

  const onSubmit = (values: SignUpValues) =>
    signUp.mutate(
      {
        name: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: values.phone.trim(),
        role: values.role,
        nationalId: values.nationalId.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          router.replace(homeRouteFor(data.profile));
        },
      },
    );

  return (
    <View className="mt-5 gap-4">
      <RolePicker value={role} onChange={(r) => setValue('role', r)} />

      <Controller
        control={control}
        name="fullName"
        rules={{ required: 'Full name is required' }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field label="Full Name" icon={User} error={fieldState.error?.message}>
            <Input
              className={BARE_INPUT}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Sarah Jenkins"
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="email"
        rules={{
          required: 'Email is required',
          pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address' },
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field label="Email Address" icon={Mail} error={fieldState.error?.message}>
            <Input
              className={BARE_INPUT}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="sarah.jenkins@haven.io"
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{
          required: 'Password is required',
          minLength: { value: 8, message: 'At least 8 characters' },
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field label="Password" icon={Lock} error={fieldState.error?.message}>
            <SecureInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="At least 8 characters"
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        rules={{
          required: 'Confirm your password',
          validate: (v, formValues) =>
            v === formValues.password || 'Passwords do not match',
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field
            label="Confirm Password"
            icon={Lock}
            error={fieldState.error?.message}>
            <SecureInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Repeat your password"
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="phone"
        rules={{ required: 'Phone number is required' }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field label="Phone Number" icon={Phone} error={fieldState.error?.message}>
            <Input
              className={BARE_INPUT}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              placeholder="+254 700 000 001"
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="nationalId"
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field label="National ID" icon={CreditCard} error={fieldState.error?.message}>
            <Input
              className={BARE_INPUT}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="number-pad"
              placeholder="12345678 (optional)"
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="terms"
        rules={{
          validate: (v) => v || 'You must agree to the terms to continue',
        }}
        render={({ field: { onChange, value }, fieldState }) => (
          <TermsCheckbox
            value={value}
            onChange={onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      {signUp.isError ? (
        <Text className="text-sm text-red-600">
          {(signUp.error as Error).message}
        </Text>
      ) : null}

      <Button
        onPress={handleSubmit(onSubmit)}
        disabled={signUp.isPending}
        className="h-12 rounded-xl bg-teal-700 active:bg-teal-800">
        <Text>{signUp.isPending ? 'Creating account…' : 'Create Homebase Account'}</Text>
        <Icon as={ArrowRight} size={18} className="text-white" />
      </Button>
    </View>
  );
}