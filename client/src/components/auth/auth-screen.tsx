import { useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowRight,
  AtSign,
  Building2,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  HelpCircle,
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
import { LinearGradient } from '@/components/ui/linear-gradient';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { Role } from '@/api/types';
import { useSignIn, useSignUp } from '@/hooks/queries/use-auth';
import { homeRouteFor } from '@/lib/auth-routing';

type Mode = 'sign-in' | 'sign-up';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

/** Input styles that flatten the shared `Input` inside a custom field row. */
const BARE_INPUT =
  'h-11 flex-1 w-auto border-0 bg-transparent px-0 shadow-none';

const ROLE_OPTIONS: { value: Role; label: string; icon: LucideIcon }[] = [
  { value: 'TENANT', label: 'Tenant', icon: KeyRound },
  { value: 'OWNER', label: 'Property Mgr', icon: Building2 },
  { value: 'CARETAKER', label: 'Caretaker', icon: Home },
];

interface SignInValues {
  identifier: string;
  password: string;
}

interface SignUpValues {
  fullName: string;
  username: string;
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
  const insets = useSafeAreaInsets();

  // Memoized: NativeWind's native interop identity-checks `style` every render,
  // so an inline literal re-dispatches from inside the render phase and hangs
  // the app on any state change.
  const headerTopStyle = useMemo(
    () => ({ paddingTop: insets.top + 12 }),
    [insets.top],
  );
  const footerBottomStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, 12) }),
    [insets.bottom],
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      {/* The gradient runs full-bleed to the top edge so the status bar sits on
          colour, then the card below overlaps it to lift the sheet forward. */}
      <LinearGradient
        colors={['#115E59', '#0D7A6E', '#0D9488']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pb-32">
        <View style={headerTopStyle}>
          {/* Brand row: icon + wordmark + badge, and the help action opposite. */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-3 pr-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Icon as={Home} size={20} className="text-white" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-bold leading-6 text-white">
                    Homebase
                  </Text>
                  <View className="rounded-full bg-white/20 px-2 py-0.5">
                    <Text className="text-[10px] font-bold tracking-wide text-white/90">
                      OS
                    </Text>
                  </View>
                </View>
                <Text className="mt-0.5 text-[11px] leading-4 text-teal-100/80">
                  Modern residence operations
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Help"
              className="h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Icon as={HelpCircle} size={18} className="text-white/90" />
            </Pressable>
          </View>

          {/* Hero */}
          <Text className="mt-9 text-[28px] font-bold leading-8 text-white">
            {isSignUp ? 'Create Account 🚀' : 'Welcome Back 👋'}
          </Text>
          <Text className="mt-2 pr-6 text-sm leading-5 text-teal-50/85">
            {isSignUp
              ? 'Join Homebase to manage or lease modern residences.'
              : 'Sign in to continue managing your residences.'}
          </Text>
        </View>
      </LinearGradient>

      {/* Sheet overlaps the gradient by -mt-8, so the rounded top corners read
          as a fold rather than a hard seam. */}
      <View className="-mt-8 flex-1 rounded-t-[32px] bg-card px-5 pt-6">
        <ScrollView
          contentContainerClassName="grow pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <SegmentedToggle mode={mode} />
          {isSignUp ? <SignUpForm /> : <SignInForm />}

          {/* mt-auto pins the footer to the bottom of a short form; pb keeps it
              clear of the home indicator. */}
          <View className="mt-auto items-center pt-10" style={footerBottomStyle}>
            <Text className="text-xs text-muted-foreground">
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
    <View className="flex-row rounded-2xl bg-muted p-1">
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: !isSignUp }}
        onPress={() => !isSignUp || router.replace('/(auth)/sign-in')}
        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2.5"
        style={!isSignUp ? styles.activeSegment : undefined}>
        <Icon
          as={LogIn}
          size={15}
          className={isSignUp ? 'text-muted-foreground' : 'text-primary'}
        />
        <Text
          className={cn(
            'text-sm font-semibold',
            isSignUp ? 'text-muted-foreground' : 'text-foreground',
          )}>
          Log In
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: isSignUp }}
        onPress={() => isSignUp || router.replace('/(auth)/sign-up')}
        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2.5"
        style={isSignUp ? styles.activeSegment : undefined}>
        <Icon
          as={UserPlus}
          size={15}
          className={isSignUp ? 'text-primary' : 'text-muted-foreground'}
        />
        <Text
          className={cn(
            'text-sm font-semibold',
            isSignUp ? 'text-foreground' : 'text-muted-foreground',
          )}>
          Sign Up
        </Text>
      </Pressable>
    </View>
  );
}

// Hoisted: NativeWind's native interop identity-checks `style` on every render,
// so a conditional className re-dispatches from inside the render phase and
// hangs the app on any state change.
const styles = StyleSheet.create({
  activeSegment: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});

/* ── Field primitives ─────────────────────────────────────── */

interface FieldProps {
  label: string;
  icon: LucideIcon;
  error?: string;
  children: ReactNode;
}

function Field({ label, icon, error, children }: FieldProps) {
  return (
    <View>
      {/* mb-1.5 rather than gap-1.5 so the label keeps its rhythm even when an
          error message appears and shifts the row below it. */}
      <Text className="mb-1.5 text-sm font-bold text-foreground">{label}</Text>
      <View
        className={cn(
          'flex-row items-center gap-2.5 rounded-xl border bg-muted px-3.5',
          // min-h-12 (vs the input's own h-11) centres the leading and trailing
          // icons on the taller row the padding produces.
          'min-h-12',
          error ? 'border-destructive' : 'border-border',
        )}>
        <Icon as={icon} size={18} className="text-muted-foreground" />
        {children}
      </View>
      {error ? (
        <Text className="mt-1 text-xs text-destructive">{error}</Text>
      ) : null}
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={secure ? 'Show password' : 'Hide password'}
        onPress={() => setSecure((s) => !s)}
        hitSlop={8}
        className="p-1">
        <Icon
          as={secure ? Eye : EyeOff}
          size={18}
          className="text-muted-foreground"
        />
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
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = (values: SignInValues) =>
    signIn.mutate(
      { identifier: values.identifier.trim(), password: values.password },
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
        name="identifier"
        rules={{
          validate: (value) => {
            const identifier = value.trim();
            if (!identifier) return 'Email or username is required';
            if (identifier.includes('@')) {
              return (
                EMAIL_PATTERN.test(identifier) || 'Enter a valid email address'
              );
            }
            return (
              (identifier.length >= 3 &&
                identifier.length <= 30 &&
                USERNAME_PATTERN.test(identifier)) ||
              'Enter a valid username'
            );
          },
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field
            label="Email or Username"
            icon={AtSign}
            error={fieldState.error?.message}>
            <Input
              className={BARE_INPUT}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="sarah.jenkins@haven.io or sarah.jenkins"
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
        className="h-12 rounded-2xl bg-teal-700 gap-x-2 active:bg-teal-800 shadow-md shadow-teal-900/20">
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
      username: '',
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
        username: values.username.trim(),
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
    <View className="mt-6 gap-4">
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
        name="username"
        rules={{
          required: 'Username is required',
          minLength: { value: 3, message: 'At least 3 characters' },
          maxLength: { value: 30, message: 'At most 30 characters' },
          pattern: {
            value: USERNAME_PATTERN,
            message: 'Use letters, numbers, dots, or underscores only',
          },
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Field label="Username" icon={AtSign} error={fieldState.error?.message}>
            <Input
              className={BARE_INPUT}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="sarah.jenkins"
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
        className="h-12 rounded-2xl bg-teal-700 gap-x-2 active:bg-teal-800 shadow-md shadow-teal-900/20">
        <Text>{signUp.isPending ? 'Creating account…' : 'Create Homebase Account'}</Text>
        <Icon as={ArrowRight} size={18} className="text-white" />
      </Button>
    </View>
  );
}