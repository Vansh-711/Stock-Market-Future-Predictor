import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { cn } from '@/shared/lib/cn';
import { useAuth } from '@/features/auth/model/AuthContext';

type AuthMode = 'login' | 'signup';

type FormErrors = Partial<Record<'username' | 'email' | 'password' | 'confirmPassword' | 'form', string>>;

export function AuthForm({ mode, className, hideHeader }: { mode: AuthMode; className?: string; hideHeader?: boolean }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [values, setValues] = useState({ username: '', email: '', password: '', confirmPassword: '', rememberMe: false });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  const updateValue = (field: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!values.username.trim()) nextErrors.username = 'Username is required.';
    if (isSignup && !values.email.trim()) nextErrors.email = 'Email is required.';
    if (isSignup && values.email && !values.email.includes('@')) nextErrors.email = 'Enter a valid email address.';
    if (!values.password) nextErrors.password = 'Password is required.';
    if (isSignup && values.password.length > 0 && values.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    if (isSignup && values.confirmPassword !== values.password) nextErrors.confirmPassword = 'Passwords must match.';
    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignup) {
        await auth.signup({ username: values.username.trim(), email: values.email.trim(), password: values.password });
      } else {
        await auth.login({ username: values.username.trim(), password: values.password, remember_me: values.rememberMe });
      }
      navigate('/', { replace: true });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Authentication failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("w-full max-w-auth transition-all duration-300", className)}>
      {!hideHeader && (
        <div className="mb-8">
          <div className="text-h3 text-text-secondary font-medium tracking-wide uppercase text-center">Signal Chain</div>
          <h1 className="mt-2 text-h1 font-bold text-text-primary text-center">{isSignup ? 'Create account' : 'Welcome back'}</h1>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Input label="Username" name="username" autoComplete="username" value={values.username} onChange={updateValue('username')} error={errors.username} />
        {isSignup ? (
          <Input label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={updateValue('email')} error={errors.email} />
        ) : null}
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={values.password}
          onChange={updateValue('password')}
          error={errors.password}
        />
        {isSignup ? (
          <Input
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={updateValue('confirmPassword')}
            error={errors.confirmPassword}
          />
        ) : null}
        
        {!isSignup ? (
          <label className="flex items-center gap-2 mt-2 cursor-pointer text-small text-text-secondary w-fit">
            <input 
              type="checkbox" 
              checked={values.rememberMe}
              onChange={(e) => setValues(curr => ({ ...curr, rememberMe: e.target.checked }))}
              className="rounded border-border bg-canvas text-accent focus:ring-accent w-4 h-4"
            />
            Keep me logged in
          </label>
        ) : null}

        {errors.form ? <p className="text-small text-negative">{errors.form}</p> : null}
        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
          {isSignup ? 'Create account' : 'Log in'}
        </Button>
      </form>

      <div className="mt-4 text-center text-small text-text-secondary">
        {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
        <Link className="text-accent transition-colors duration-ui ease-out hover:text-accent-hover" to={isSignup ? '/login' : '/signup'}>
          {isSignup ? 'Log in' : 'Create account'}
        </Link>
      </div>
    </Card>
  );
}
